// Consolidated Test Suite: 01-ingestion.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { decideCluster } from '../src/lib/clustering/decision';
import { cosineSimilarity, createEmbedding } from '../src/lib/clustering/embedding';
import { extractEntityIds } from '../src/lib/clustering/entities';
import { ingestDevto, normalizeDevto } from '../src/lib/ingestion/devto';
import { ingestGithub, normalizeRelease } from '../src/lib/ingestion/github';
import { type DocumentInput, type IngestionStore, fetchOpenGraphMetadata, ingestHn, normalizeHnItem } from '../src/lib/ingestion/hn';
import { ingestFeeds, normalizeFeed } from '../src/lib/ingestion/rss';
import { EMAIL_SCHEDULE_ID, INTERVAL_MS, SCHEDULE_ID, redisConnection, scheduleDailyBriefEmail, scheduleIngestion } from '../src/lib/queue';
import { decodeHtmlEntities, extractGitHubRepos, extractLinks, processStoryContent } from '../src/lib/story-content';
import type { Queue } from 'bullmq';

// --- Section: rss.test.ts ---
{
const date=new Date().toISOString();
const rss=`<?xml version="1.0"?><rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/"><channel><item><guid>r1</guid><title>React &amp; Rust</title><link>https://example.com/story</link><pubDate>${date}</pubDate><description><![CDATA[<p>Real excerpt</p>]]></description><media:thumbnail url="https://example.com/photo.jpg"/></item></channel></rss>`;
test('RSS preserves publication time, CDATA excerpt and image without fetching article pages',()=>{const r=normalizeFeed(rss,'rss','https://example.com/feed')[0]!;assert.equal(r.title,'React & Rust');assert.equal(r.published_at.toISOString(),date);assert.equal(r.og_description,'Real excerpt');assert.equal(r.og_image_url,'https://example.com/photo.jpg');});
test('Atom selects alternate links and published over updated, supports namespaces',()=>{
 const xml=`<feed xmlns="http://www.w3.org/2005/Atom"><entry><id>a1</id><title>Rust release</title><link rel="self" href="/api/1"/><link rel="alternate" href="/post"/><published>2026-01-01T12:00:00Z</published><updated>${date}</updated><summary>Rust shipped.</summary></entry></feed>`;
 const r=normalizeFeed(xml,'rss','https://example.com/feed')[0]!;assert.equal(r.url,'https://example.com/post');assert.equal(r.published_at.toISOString(),'2026-01-01T12:00:00.000Z');
 assert.equal(normalizeFeed('<rss><channel><item><title>Missing date</title><link>https://example.com/a</link></item></channel></rss>','s','https://example.com')[0],null);
});
test('malformed XML, DTD and unclosed tags are rejected',()=>{for(const xml of ['<rss><channel></rss>','<!DOCTYPE x [<!ENTITY x SYSTEM "file:///secret">]><rss/>','<rss><channel>'])assert.throws(()=>normalizeFeed(xml,'s','https://example.com'));});
test('broken and unavailable feeds do not stop later feed insertion',async()=>{
 const rows:DocumentInput[]=[];const store:IngestionStore={ensureSource:async()=>'s',existingIds:async()=>[],insert:async row=>{rows.push(row);return true;}};
 const feeds=['bad','offline','good'].map(name=>({name,entity:'React',url:'https://example.com/'+name}));
 const result=await ingestFeeds(()=>store,['React'],async url=>String(url).endsWith('offline')?new Response('',{status:503}):new Response(String(url).endsWith('bad')?'<rss>':rss),feeds);
 assert.equal(result.failed,2);assert.equal(result.inserted,1);assert.equal(rows.length,1);
});
test('HTML doctype text inside feed CDATA is inert and does not reject a legitimate publisher feed',()=>{const xml=rss.replace('Real excerpt','<!DOCTYPE html> Real excerpt');assert.ok(normalizeFeed(xml,'s','https://example.com')[0]);});
}

// --- Section: hn.test.ts ---
{
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
}

// --- Section: story-content.test.ts ---
{
test('decodeHtmlEntities decodes common hex, dec and named entities', () => {
  const raw = 'Code: &lt;a href="https:&#x2F;&#x2F;github.com&#x2F;owner&#x2F;repo"&gt;repo&lt;/a&gt; &amp; &quot;quote&quot; &#39;apostrophe&#39;';
  const decoded = decodeHtmlEntities(raw);
  assert.equal(
    decoded,
    'Code: <a href="https://github.com/owner/repo">repo</a> & "quote" \'apostrophe\''
  );
});

test('extractGitHubRepos extracts owner/repo tuples and dedupes them', () => {
  const text = 'Check out https://github.com/facebook/react and also https://github.com/facebook/react/issues and https://github.com/hp6/ai-arena';
  const repos = extractGitHubRepos(text);
  assert.equal(repos.length, 2);
  assert.equal(repos[0].fullName, 'facebook/react');
  assert.equal(repos[0].url, 'https://github.com/facebook/react');
  assert.equal(repos[1].fullName, 'hp6/ai-arena');
  assert.equal(repos[1].url, 'https://github.com/hp6/ai-arena');
});

test('extractLinks parses external non-github URLs', () => {
  const text = 'Live demo at https://tinyaiarena.com and see repo at https://github.com/hp6/ai-arena';
  const links = extractLinks(text);
  assert.equal(links.length, 1);
  assert.equal(links[0].url, 'https://tinyaiarena.com');
  assert.equal(links[0].label, 'tinyaiarena.com');
});

test('processStoryContent transforms messy HN markup into clean prose and structured data', () => {
  const rawHnPost = `Did you ever click on an "AI Arena" expecting glorious battle and instead get a boring benchmark? If so, this project is for you: proper life-or-death fights between four models on a picturesque 8&times;8 grid. May the most intelligent one win!<p>Click on any of the matches to spectate them.<p>Code: <a href="https:&#x2F;&#x2F;github.com&#x2F;hp6&#x2F;ai-arena" rel="nofollow">https:&#x2F;&#x2F;github.com&#x2F;hp6&#x2F;ai-arena</a>`;

  const result = processStoryContent(rawHnPost, 'TinyAIArena', 'https://tinyaiarena.com');
  assert.ok(result.cleanLead.includes('Did you ever click on an "AI Arena"'));
  assert.equal(result.cleanLead.includes('<p>'), false);
  assert.equal(result.cleanLead.includes('&#x2F;'), false);
  assert.equal(result.paragraphs.length, 2);
  assert.equal(result.paragraphs[1], 'Click on any of the matches to spectate them.');
  assert.equal(result.githubRepos.length, 1);
  assert.equal(result.githubRepos[0].fullName, 'hp6/ai-arena');
  assert.equal(result.githubRepos[0].url, 'https://github.com/hp6/ai-arena');
});
}

// --- Section: multisource.test.ts ---
{
function memory(){const rows:DocumentInput[]=[];const store:IngestionStore={ensureSource:async()=>'source',existingIds:async()=>rows.map(r=>r.external_id),insert:async row=>{rows.push(row);return true;}};return {rows,store};}
const now=new Date();const date=now.toISOString();
test('GitHub official search and releases insert idempotently with authenticated requests',async()=>{
 const {store,rows}=memory();const urls:string[]=[];
 const request:typeof fetch=async(input,init)=>{const url=String(input);urls.push(url);assert.equal((init?.headers as Record<string,string>).Authorization,'Bearer test-token');return Response.json(url.includes('/search/')?{items:[{id:1,full_name:'facebook/react',html_url:'https://github.com/facebook/react',pushed_at:date,description:'React framework'}]}:[{id:2,name:'React 20',html_url:'https://github.com/facebook/react/releases/tag/v20',published_at:date,body:'React update'}]);};
 assert.equal((await ingestGithub(store,['React'],'test-token',request,now)).inserted,2);
 assert.equal((await ingestGithub(store,['React'],'test-token',request,now)).inserted,0);
 assert.equal(rows.length,2);assert.ok(urls.every(url=>url.startsWith('https://api.github.com/')));assert.ok(urls.some(url=>url.includes('sort=stars')));
 assert.equal(normalizeRelease({draft:true},'s','r'),null);
});
test('GitHub backs off without making remaining requests; missing credentials never silently use anonymous quota',async()=>{
 let calls=0;const {store}=memory();const request:typeof fetch=async()=>{calls++;return new Response('',{status:403,headers:{'x-ratelimit-remaining':'0','retry-after':'120'}});};
 const result=await ingestGithub(store,['React'],'test',request,now);assert.equal(calls,1);assert.equal(result.deferred,1);assert.ok(result.retryAt);assert.equal(result.failed,0);
 await ingestGithub(store,['React'],undefined,request);assert.equal(calls,1);
});
test('Dev.to tag overlap deduplicates and uses the canonical URL and real timestamp',async()=>{
 const {rows,store}=memory();const article={id:7,title:'React TypeScript compiler released',url:'https://dev.to/a/post',canonical_url:'https://example.com/release',published_at:date,description:'React TypeScript compiler released',cover_image:'https://example.com/image.png'};
 const result=await ingestDevto(store,['React','TypeScript'],async()=>Response.json([article]),now);
 assert.equal(result.inserted,1);assert.equal(result.skipped,1);assert.equal(rows[0].url,article.canonical_url);assert.equal(rows[0].published_at.toISOString(),date);
 const normalized=normalizeDevto(article,'devto')!;
 const dictionary=[{id:'react',name:'React',aliases:[]},{id:'ts',name:'TypeScript',aliases:[]}];
 const ids=extractEntityIds(normalized.title,normalized.content,dictionary);assert.equal(ids.length,2);
 const vector=createEmbedding(normalized.title+'\n'+normalized.content);
 const similarity=cosineSimilarity(vector,createEmbedding(article.title+'\n'+article.description));
 const resultCluster=decideCluster([{storyId:'existing-hn-story',similarity,sharedEntityCount:ids.length,titleSimilarity:1}]);
 assert.equal(resultCluster.kind,'merge');
});
}

// --- Section: queue.test.ts ---
{
test('registers stable ingestion and daily email schedulers with bounded retries', async () => {
  const calls: unknown[][] = [];
  const queue = { upsertJobScheduler: async (...args: unknown[]) => { calls.push(args); } } as unknown as Queue;
  await scheduleIngestion(queue);
  await scheduleIngestion(queue);
  await scheduleDailyBriefEmail(queue);
  assert.equal(INTERVAL_MS, 900000);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0][0], SCHEDULE_ID);
  assert.deepEqual(calls[0][1], { every: 900000 });
  assert.equal((calls[0][2] as { opts: { attempts: number } }).opts.attempts, 3);
  assert.equal(calls[2][0], EMAIL_SCHEDULE_ID);
  assert.deepEqual(calls[2][1], { pattern: '0 8 * * *', tz: 'Asia/Kolkata' });
  assert.equal((calls[2][2] as { name: string }).name, 'send-daily-briefs');
});

test('Redis configuration requires a URL and supports TLS', () => {
  const previous = process.env.REDIS_URL;
  try {
    delete process.env.REDIS_URL;
    assert.throws(redisConnection, /required/);
    process.env.REDIS_URL = 'https://localhost';
    assert.throws(redisConnection, /redis/);
    process.env.REDIS_URL = 'rediss://user:pass@localhost:6380/2';
    const config = redisConnection();
    assert.equal(config.port, 6380);
    assert.equal(config.db, 2);
    assert.deepEqual(config.tls, {});
  } finally {
    if (previous === undefined) delete process.env.REDIS_URL; else process.env.REDIS_URL = previous;
  }
});
}
