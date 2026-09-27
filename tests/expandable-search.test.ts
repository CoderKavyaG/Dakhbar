import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { getTrendingTopics, getLiveSearchSuggestions } from '../src/lib/search-suggestions';

test('getTrendingTopics returns valid ranked entities with taxonomy categories', async () => {
  const trending = await getTrendingTopics(6);
  assert.ok(Array.isArray(trending));
  if (trending.length > 0) {
    trending.forEach((item, index) => {
      assert.equal(item.rank, index + 1);
      assert.ok(item.name.length > 0);
      assert.ok(item.slug.length > 0);
      assert.ok(['AI & companies', 'Infrastructure', 'Languages & tools'].includes(item.categoryTitle));
      assert.ok(typeof item.storyCount === 'number');
    });
  }
});

test('getLiveSearchSuggestions handles empty and populated search queries', async () => {
  const emptyRes = await getLiveSearchSuggestions('');
  assert.ok(Array.isArray(emptyRes.trending));
  assert.deepEqual(emptyRes.stories, []);
  assert.deepEqual(emptyRes.topics, []);
  assert.deepEqual(emptyRes.sources, []);
  assert.equal(emptyRes.researchEligible, false);

  const populatedRes = await getLiveSearchSuggestions('Python');
  assert.ok(Array.isArray(populatedRes.trending));
  assert.ok(Array.isArray(populatedRes.stories));
  assert.ok(Array.isArray(populatedRes.topics));
  assert.ok(Array.isArray(populatedRes.sources));
});

test('standalone /topics redirects to /search while /topics/[slug] remains dedicated dossier', async () => {
  const [topicsIndex, topicSlugPage] = await Promise.all([
    readFile('src/app/topics/page.tsx', 'utf8'),
    readFile('src/app/topics/[slug]/page.tsx', 'utf8'),
  ]);

  assert.match(topicsIndex, /redirect\(['"]\/search['"]\)/);
  assert.match(topicSlugPage, /<TopicTrendChart/);
  assert.match(topicSlugPage, /<TopicSummary/);
  assert.match(topicSlugPage, /<StoryCard/);
});

test('SiteHeader embeds ExpandableSearch component in place of old static search and topics nav', async () => {
  const [header, primaryNav] = await Promise.all([
    readFile('src/components/site-header.tsx', 'utf8'),
    readFile('src/components/primary-nav.tsx', 'utf8'),
  ]);

  assert.match(header, /<ExpandableSearch/);
  assert.doesNotMatch(header, /className="nav-search"/);
  assert.doesNotMatch(primaryNav, /href="\/topics"/);
  assert.doesNotMatch(primaryNav, /href="\/search"/);
});
