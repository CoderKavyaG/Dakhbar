import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchOpenGraphMetadata, ingestHn, normalizeHnItem, type DocumentInput, type IngestionStore } from '../src/lib/ingestion/hn';

const story = { id: 42, type: 'story', title: 'A story', by: 'alice', time: 1700000000, url: 'https://example.com', text: '<p>Context</p>' };
test('normalizes official HN fields and retains raw evidence', () => {
  const row = normalizeHnItem(story, 'source');
  assert.equal(row?.external_id, '42');
  assert.equal(row?.source_id, 'source');
  assert.equal(row?.author, 'alice');
  assert.equal(row?.published_at.toISOString(), '2023-11-14T22:13:20.000Z');
  assert.deepEqual(row?.raw_json, story);
});
test('uses discussion URL for Ask HN; rejects deleted, dead, invalid and non-story items', () => {
  assert.equal(normalizeHnItem({ ...story, url: undefined }, 's')?.url, 'https://news.ycombinator.com/item?id=42');
  assert.equal(normalizeHnItem({ ...story, url: 'javascript:alert(1)' }, 's')?.url, 'https://news.ycombinator.com/item?id=42');
  for (const item of [null, {}, { ...story, deleted: true }, { ...story, dead: true }, { ...story, type: 'comment' }, { ...story, time: -1 }]) {
    assert.equal(normalizeHnItem(item, 's'), null);
  }
});
test('mock HN API inserts new normalized rows and skips known IDs on subsequent runs', async () => {
  const rows = new Map<string, DocumentInput>();
  const calls: string[] = [];
  const store: IngestionStore = {
    ensureSource: async () => 'hn-source',
    existingIds: async () => [...rows.keys()],
    insert: async (row) => { if (rows.has(row.external_id)) return false; rows.set(row.external_id, row); return true; },
  };
  const fetchMock: typeof fetch = async (url) => {
    calls.push(String(url));
    return Response.json(String(url).endsWith('topstories.json') ? [42, 42, 43] : { ...story, id: String(url).includes('/43.') ? 43 : 42 });
  };
  assert.deepEqual(await ingestHn(store, fetchMock), { inserted: 2, skipped: 0, failed: 0 });
  assert.equal(rows.get('42')?.source_id, 'hn-source');
  assert.deepEqual(await ingestHn(store, fetchMock), { inserted: 0, skipped: 2, failed: 0 });
  assert.equal(calls.filter((url) => url.includes('/item/')).length, 2);
});
test('counts insert conflicts as skips and partial network failures without losing successful work', async () => {
  const store: IngestionStore = { ensureSource: async () => 's', existingIds: async () => [], insert: async () => false };
  const fetchMock: typeof fetch = async (url) => {
    if (String(url).endsWith('topstories.json')) return Response.json([42, 43]);
    if (String(url).includes('/43.')) return new Response('unavailable', { status: 503 });
    return Response.json(story);
  };
  assert.deepEqual(await ingestHn(store, fetchMock), { inserted: 0, skipped: 1, failed: 1 });
});
test('rejects failed or malformed top-story responses', async () => {
  const store: IngestionStore = { ensureSource: async () => 's', existingIds: async () => [], insert: async () => true };
  await assert.rejects(ingestHn(store, async () => new Response('', { status: 503 })));
  await assert.rejects(ingestHn(store, async () => Response.json({ error: true })));
});
test('extracts Open Graph image and description without failing when metadata is absent', async () => {
  const html = '<html><head><meta content="A precise summary &amp; context" property="og:description"><meta property="og:image" content="/cover.jpg"></head></html>';
  const metadata = await fetchOpenGraphMetadata('https://example.com/article', async () => new Response(html, {
    headers: { 'content-type': 'text/html' },
  }));
  assert.deepEqual(metadata, {
    og_image_url: 'https://example.com/cover.jpg',
    og_description: 'A precise summary & context',
  });
  assert.deepEqual(await fetchOpenGraphMetadata('http://127.0.0.1/private', async () => { throw new Error('must not fetch'); }), {
    og_image_url: null,
    og_description: null,
  });
  assert.deepEqual(await fetchOpenGraphMetadata('https://example.com/no-meta', async () => new Response('plain', {
    headers: { 'content-type': 'text/plain' },
  })), { og_image_url: null, og_description: null });
});

test('Open Graph redirects cannot cross into literal private-network targets', async () => {
  let calls = 0;
  const metadata = await fetchOpenGraphMetadata('https://example.com/redirect', async () => {
    calls++;
    return new Response(null, { status: 302, headers: { location: 'http://127.0.0.1/secret' } });
  });
  assert.equal(calls, 1);
  assert.deepEqual(metadata, { og_image_url: null, og_description: null });
});
