// Consolidated Test Suite: 04-frontpage-stories.test.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { usableArticleImage } from '../src/lib/article-image';
import { buildCorroborationLead, distinctCorroborationSources, sourceTimelinePoints } from '../src/lib/corroboration';
import { FRONT_PAGE_LIMIT, selectEligibleFrontPageStories } from '../src/lib/front-page';
import { normalizeDevto } from '../src/lib/ingestion/devto';
import { relatedStoryWhere } from '../src/lib/related-stories';
import { storyCountLabel } from '../src/lib/story-count';
import { cleanText, countIndependentSources, storyDek, storyDestination, truncateAtWord } from '../src/lib/story-evidence';

// --- Section: front-page.test.ts ---
{
test('Front Page selection excludes zero-entity stories and caps the edition', () => {
  const zeroEntity = { id: 'off-topic', entities: [] };
  const relevant = Array.from({ length: 24 }, (_, index) => ({ id: 'relevant-' + index, entities: [{ id: 'entity' }] }));
  const selected = selectEligibleFrontPageStories([zeroEntity, ...relevant]);

  assert.equal(selected.length, FRONT_PAGE_LIMIT);
  assert.equal(selected.some(story => story.id === zeroEntity.id), false);
  assert.ok(selected.every(story => story.entities.length >= 1));
});
}

// --- Section: story-count.test.ts ---
{
test('story result counts pluralize correctly', () => {
  assert.equal(storyCountLabel(0), '0 stories');
  assert.equal(storyCountLabel(1), '1 story');
  assert.equal(storyCountLabel(2), '2 stories');
});
}

// --- Section: story-evidence.test.ts ---
{
test('self-post deks strip markup and truncate cleanly at a word boundary', () => {
  const source = '<p>Ask HN: ' + 'reliable developer context '.repeat(8) + '&amp; evidence.</p>';
  const dek = storyDek({ url: 'https://news.ycombinator.com/item?id=1', content: source }, 120);
  assert.equal(dek.kind, 'excerpt');
  assert.ok(dek.text.length <= 121);
  assert.ok(dek.text.endsWith('…'));
  assert.equal(dek.text.includes('<p>'), false);
  assert.equal(cleanText('&lt;proof&gt; &amp; context'), '<proof> & context');
  assert.equal(truncateAtWord('short copy', 120), 'short copy');
});

test('link-post deks use the normalized linked domain', () => {
  assert.deepEqual(storyDek({ url: 'https://www.TechCrunch.com/article', content: null }), { kind: 'domain', text: 'techcrunch.com' });
});

test('corroboration counts independent linked domains rather than ingestion feeds', () => {
  assert.equal(countIndependentSources([
    { url: 'https://example.com/a', content: null },
    { url: 'https://www.example.com/b', content: null },
    { url: 'https://another.dev/report', content: null },
  ]), 2);
});

test('Open Graph description takes precedence over the domain fallback', () => {
  assert.deepEqual(storyDek({ url: 'https://example.com/story', content: null, og_description: 'Source-provided context.' }), { kind: 'excerpt', text: 'Source-provided context.' });
});

test('all stories link to internal universal story pages', () => {
  assert.deepEqual(storyDestination('one', [{ url: 'https://one.dev/report', content: null }]), { href: '/stories/one', external: false });
  assert.deepEqual(storyDestination('two', [
    { url: 'https://one.dev/report', content: null },
    { url: 'https://two.dev/report', content: null },
  ]), { href: '/stories/two', external: false });
});
}

// --- Section: story-pullquote.test.ts ---
{
test('StoryCard source enforces pull-quote treatment for stories without an image and real image for stories with one', async () => {
  const source = await readFile('src/components/story-card.tsx', 'utf8');

  // Confirms the conditional pull-quote rendering when no image is present
  assert.match(source, /!image \? \(/, 'Must branch on !image for pull-quote');
  assert.match(source, /className="story-card-pullquote"/, 'Must render story-card-pullquote');
  assert.match(source, /className="pullquote-mark"/, 'Must render decorative quotation mark');
  assert.match(source, /className="pullquote-text"/, 'Must render pullquote-text');
  assert.match(source, /className="pullquote-attribution"/, 'Must render pullquote attribution cite');
  assert.match(source, /!image \? 'story-card-text-only' : ''/, 'Must apply story-card-text-only class when !image');

  // Confirms cards with images keep real image treatment
  assert.match(source, /\{image && \([\s\S]*?<StoryImage/, 'Must render StoryImage when image exists');
});

test('StoryCard surfaces early evidence signal and new-since-visit retention highlight', async () => {
  const source = await readFile('src/components/story-card.tsx', 'utf8');

  // Early evidence signal
  assert.match(source, /card-evidence-pill/, 'Must include card-evidence-pill in meta strip');
  assert.match(source, /sources verified/, 'Must display verified sources count for corroborated stories');
  assert.match(source, /Primary report/, 'Must display primary report indicator for single-source stories');
  assert.match(source, /badge-corroborated/, 'Must style footer badge for corroborated stories');

  // Retention loop: new since visit
  assert.match(source, /isNewSinceVisit\?: boolean/, 'Must accept isNewSinceVisit prop');
  assert.match(source, /card-new-arrival-tag/, 'Must render card-new-arrival-tag when new since visit');
  assert.match(source, /story-card-new-arrival/, 'Must apply story-card-new-arrival class to card');
});

test('storyDek extracts real excerpt content from evidence for pull-quote rendering', () => {
  const documentWithOg = {
    url: 'https://dev.to/example',
    content: 'Full body content with rich technical substance and detailed architecture.',
    og_description: 'An authoritative technical announcement about database internals and query optimizations.',
  };

  const dek = storyDek(documentWithOg, 260);
  assert.equal(dek.kind, 'excerpt');
  assert.equal(dek.text, 'An authoritative technical announcement about database internals and query optimizations.');

  const documentTextOnly = {
    url: 'https://dev.to/example-no-og',
    content: 'The core engine enforces fail-closed state machines across distributed storage clusters.',
    og_description: null,
  };

  const dek2 = storyDek(documentTextOnly, 260);
  assert.equal(dek2.kind, 'excerpt');
  assert.equal(dek2.text, 'The core engine enforces fail-closed state machines across distributed storage clusters.');
});

test('globals.css defines distinctive editorial pull-quote and early evidence styling', async () => {
  const css = await readFile('src/app/globals.css', 'utf8');

  assert.match(css, /\.story-card-pullquote \{/, 'Must define .story-card-pullquote styles');
  assert.match(css, /border-left: 2\.5px solid var\(--data\)/, 'Must have distinct border rule accent');
  assert.match(css, /\.pullquote-text \{/, 'Must define .pullquote-text styles');
  assert.match(css, /font-style: italic/, 'Pull-quote text must be italic');
  assert.match(css, /\.card-evidence-pill/, 'Must define .card-evidence-pill styles');
  assert.match(css, /\.pulse-sparkline/, 'Must define .pulse-sparkline styles');
  assert.match(css, /\.card-new-arrival-tag/, 'Must define .card-new-arrival-tag styles');
});
}

// --- Section: article-image.test.ts ---
{
test('tiny icons and tracking pixels never become oversized article photos',()=>{assert.equal(usableArticleImage(1,1),false);assert.equal(usableArticleImage(144,144),false);assert.equal(usableArticleImage(1200,630),true);});
test('Dev.to auto-generated headline social cards do not substitute for real cover images',()=>{const row=normalizeDevto({id:2,title:'React news',url:'https://dev.to/test',published_at:new Date().toISOString(),social_image:'https://example.com/generated.png'},'devto');assert.equal(row?.og_image_url,null);});
}

// --- Section: corroboration.test.ts ---
{
const at = (value: string) => new Date(value);

test('single-source lead is complete and literal', () => {
  assert.equal(buildCorroborationLead([
    { domain: 'wsj.com', publishedAt: at('2026-09-19T03:47:00Z') },
  ], 'UTC'), 'Reported by wsj.com at 3:47 AM.');
});

test('two-source lead names the first confirmation and elapsed time', () => {
  assert.equal(buildCorroborationLead([
    { domain: 'reuters.com', publishedAt: at('2026-09-19T07:10:00Z') },
    { domain: 'wsj.com', publishedAt: at('2026-09-19T03:47:00Z') },
  ], 'UTC'), 'First reported by wsj.com at 3:47 AM; confirmed by reuters.com 3h 23m later.');
});

test('three-plus-source lead pluralizes additional reporting without inventing detail', () => {
  assert.equal(buildCorroborationLead([
    { domain: 'a.dev', publishedAt: at('2026-09-19T01:00:00Z') },
    { domain: 'b.dev', publishedAt: at('2026-09-19T02:00:00Z') },
    { domain: 'c.dev', publishedAt: at('2026-09-19T03:00:00Z') },
    { domain: 'd.dev', publishedAt: at('2026-09-19T04:00:00Z') },
  ], 'UTC'), 'First reported by a.dev at 1:00 AM; confirmed by b.dev 1h later, with 2 additional sources reporting afterward.');
});

test('timeline dots use true proportional elapsed time', () => {
  const points = sourceTimelinePoints([
    { domain: 'first.dev', publishedAt: at('2026-09-19T00:00:00Z') },
    { domain: 'middle.dev', publishedAt: at('2026-09-19T01:00:00Z') },
    { domain: 'last.dev', publishedAt: at('2026-09-19T04:00:00Z') },
  ]);
  assert.deepEqual(points.map(point => point.position), [0, 25, 100]);
  assert.deepEqual(points.map(point => point.elapsedLabel), ['first report', '1h later', '4h later']);
});

test('source grouping is domain-based and keeps the earliest report', () => {
  const grouped = distinctCorroborationSources([
    { url: 'https://www.example.com/one', sourceName: 'hn', publishedAt: at('2026-09-19T02:00:00Z') },
    { url: 'https://example.com/two', sourceName: 'hn', publishedAt: at('2026-09-19T01:00:00Z') },
  ]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].publishedAt.toISOString(), '2026-09-19T01:00:00.000Z');
});
}

// --- Section: related-stories.test.ts ---
{
test('related stories exclude the current story and require actual shared entity IDs',()=>{assert.deepEqual(relatedStoryWhere('current',['react']),{id:{not:'current'},entities:{some:{entity_id:{in:['react']}}}});});
}
