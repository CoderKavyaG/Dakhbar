export const HN_API = 'https://hacker-news.firebaseio.com/v0';
const MAX_METADATA_BYTES = 512 * 1024;

export type DocumentInput = {
  source_id: string; external_id: string; title: string; url: string;
  author: string | null; content: string | null; og_image_url: string | null;
  og_description: string | null; published_at: Date;
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
    og_image_url: null,
    og_description: null,
    published_at: published, raw_json: item,
  };
}

function isPublicHttpUrl(value: string) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host === 'localhost' || host.endsWith('.local') || host === '::1' || host.startsWith('127.') || host.startsWith('10.') || host.startsWith('192.168.') || host.startsWith('169.254.')) return false;
    const match = host.match(/^172\.(\d+)\./);
    if (match && Number(match[1]) >= 16 && Number(match[1]) <= 31) return false;
    return true;
  } catch {
    return false;
  }
}

function decodeAttribute(value: string) {
  return value.replace(/&amp;/gi, '&').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'").replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').trim();
}

function metadataFromHtml(html: string, pageUrl: string) {
  let image: string | null = null;
  let description: string | null = null;
  for (const tag of html.match(/<meta\s+[^>]*>/gi) ?? []) {
    const attributes = new Map<string, string>();
    for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(["'])(.*?)\2/gi)) attributes.set(match[1].toLowerCase(), decodeAttribute(match[3]));
    const key = (attributes.get('property') ?? attributes.get('name') ?? '').toLowerCase();
    const content = attributes.get('content')?.trim();
    if (!content) continue;
    if (key === 'og:image' && !image) {
      try {
        const candidate = new URL(content, pageUrl).href;
        if (isPublicHttpUrl(candidate)) image = candidate;
      } catch { /* Ignore malformed metadata. */ }
    }
    if (key === 'og:description' && !description) description = content.replace(/\s+/g, ' ').slice(0, 500);
  }
  return { og_image_url: image, og_description: description };
}

async function readLimitedHtml(response: Response) {
  const declared = Number(response.headers.get('content-length') ?? 0);
  if (declared > MAX_METADATA_BYTES || !response.body) return null;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_METADATA_BYTES) { await reader.cancel(); return null; }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder().decode(bytes);
}

export async function fetchOpenGraphMetadata(url: string, request: typeof fetch = fetch) {
  if (!isPublicHttpUrl(url) || new URL(url).hostname === 'news.ycombinator.com') return { og_image_url: null, og_description: null };
  try {
    let currentUrl = url;
    let response: Response | null = null;
    for (let redirectCount = 0; redirectCount <= 3; redirectCount++) {
      response = await request(currentUrl, {
        headers: { Accept: 'text/html,application/xhtml+xml', 'User-Agent': 'DakhbarBot/0.1 (+source metadata)' },
        redirect: 'manual',
        signal: AbortSignal.timeout(8000),
      });
      if (![301, 302, 303, 307, 308].includes(response.status)) break;
      const location = response.headers.get('location');
      if (!location) return { og_image_url: null, og_description: null };
      const nextUrl = new URL(location, currentUrl).href;
      if (!isPublicHttpUrl(nextUrl)) return { og_image_url: null, og_description: null };
      currentUrl = nextUrl;
      response = null;
    }
    if (!response) return { og_image_url: null, og_description: null };
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    if (!response.ok || !contentType.includes('text/html')) return { og_image_url: null, og_description: null };
    const html = await readLimitedHtml(response);
    return html ? metadataFromHtml(html, response.url || currentUrl) : { og_image_url: null, og_description: null };
  } catch {
    return { og_image_url: null, og_description: null };
  }
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
  let cursor = 0;
  await Promise.all(Array.from({ length: Math.min(5, pending.length) }, async () => {
    while (cursor < pending.length) {
      const id = pending[cursor++];
      try {
        const item = await getJson(HN_API + '/item/' + id + '.json', request);
        const row = normalizeHnItem(item, sourceId);
        if (!row || row.external_id !== String(id)) { summary.skipped++; continue; }
        const metadata = await fetchOpenGraphMetadata(row.url, request);
        if (await store.insert({ ...row, ...metadata })) summary.inserted++; else summary.skipped++;
      } catch { summary.failed++; }
    }
  }));
  return summary;
}
