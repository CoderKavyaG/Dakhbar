export const HN_API = 'https://hacker-news.firebaseio.com/v0';
export type DocumentInput = {
  source_id: string; external_id: string; title: string; url: string;
  author: string | null; content: string | null; published_at: Date;
  raw_json: Record<string, unknown>;
};
export interface IngestionStore {
  ensureSource(): Promise<string>;
  existingIds(sourceId: string, ids: string[]): Promise<string[]>;
  insert(document: DocumentInput): Promise<boolean>;
}
export function normalizeHnItem(value: unknown, sourceId: string): DocumentInput | null {
  if (!value || typeof value !== 'object') return null;
  const item = value as Record<string, unknown>;
  if (item.type !== 'story' || item.deleted || item.dead ||
      !Number.isSafeInteger(item.id) || Number(item.id) <= 0 ||
      typeof item.title !== 'string' || !item.title.trim() ||
      typeof item.time !== 'number' || !Number.isFinite(item.time) || item.time <= 0) return null;
  const published = new Date(item.time * 1000);
  if (Number.isNaN(published.getTime())) return null;
  let url = 'https://news.ycombinator.com/item?id=' + item.id;
  if (typeof item.url === 'string') {
    try { const parsed = new URL(item.url); if (['https:', 'http:'].includes(parsed.protocol)) url = parsed.href; } catch { /* Fall back to the official discussion. */ }
  }
  return {
    source_id: sourceId, external_id: String(item.id), title: item.title.trim(), url,
    author: typeof item.by === 'string' ? item.by : null,
    content: typeof item.text === 'string' ? item.text : null,
    published_at: published, raw_json: item,
  };
}
async function getJson(url: string, request: typeof fetch): Promise<unknown> {
  const response = await request(url, { signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error('HN HTTP ' + response.status);
  return response.json();
}
export async function ingestHn(store: IngestionStore, request: typeof fetch = fetch) {
  const list = await getJson(HN_API + '/topstories.json', request);
  if (!Array.isArray(list) || !list.every(id => Number.isSafeInteger(id) && id > 0)) throw new Error('Invalid HN topstories payload');
  const ids = [...new Set<number>(list)];
  const sourceId = await store.ensureSource();
  const known = new Set(await store.existingIds(sourceId, ids.map(String)));
  const pending = ids.filter(id => !known.has(String(id)));
  const summary = { inserted: 0, skipped: ids.length - pending.length, failed: 0 };
  // Bound concurrency to respect the source and avoid hundreds of simultaneous requests.
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(5, pending.length) }, async () => {
    while (cursor < pending.length) {
      const id = pending[cursor++];
      try {
        const item = await getJson(HN_API + '/item/' + id + '.json', request);
        const row = normalizeHnItem(item, sourceId);
        if (!row || row.external_id !== String(id)) { summary.skipped++; continue; }
        if (await store.insert(row)) summary.inserted++; else summary.skipped++;
      } catch { summary.failed++; }
    }
  }));
  return summary;
}
