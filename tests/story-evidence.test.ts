import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanText, countIndependentSources, storyDek, truncateAtWord, storyDestination } from '../src/lib/story-evidence';

test('self-post deks strip markup and truncate cleanly at a word boundary', () => {
  const source = '<p>Ask HN: ' + 'reliable developer context '.repeat(8) + '&amp; evidence.</p>';
  const dek = storyDek({ url: 'https://news.ycombinator.com/item?id=1', content: source });
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

test('single-source stories link out while independently corroborated stories link internally', () => {
  assert.deepEqual(storyDestination('one', [{ url: 'https://one.dev/report', content: null }]), { href: 'https://one.dev/report', external: true });
  assert.deepEqual(storyDestination('two', [
    { url: 'https://one.dev/report', content: null },
    { url: 'https://two.dev/report', content: null },
  ]), { href: '/stories/two', external: false });
});
