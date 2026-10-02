import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sitemap from '../src/app/sitemap';
import robots from '../src/app/robots';

test('Story page source defines generateMetadata with OpenGraph, Twitter, and generic Article JSON-LD schema (not NewsArticle)', async () => {
  const storySource = await readFile('src/app/stories/[id]/page.tsx', 'utf8');
  assert.match(storySource, /export async function generateMetadata/);
  assert.match(storySource, /type:\s*['"]article['"]/);
  assert.match(storySource, /openGraph:\s*\{/);
  assert.match(storySource, /twitter:\s*\{/);
  assert.match(storySource, /application\/ld\+json/);
  assert.match(storySource, /'@type':\s*'Article'/);
  assert.doesNotMatch(storySource, /'@type':\s*'NewsArticle'/);
  assert.match(storySource, /citation:\s*reports\.map/);
  assert.match(storySource, /publisher:\s*\{/);
});

test('Topic page source defines generateMetadata with topic name, velocity, and OpenGraph tags', async () => {
  const topicSource = await readFile('src/app/topics/[slug]/page.tsx', 'utf8');
  assert.match(topicSource, /export async function generateMetadata/);
  assert.match(topicSource, /openGraph:\s*\{/);
  assert.match(topicSource, /twitter:\s*\{/);
  assert.match(topicSource, /Developer News & Velocity Trends/);
});

test('Research page source defines generateMetadata and Article JSON-LD for dossier synthesis', async () => {
  const researchSource = await readFile('src/app/research/page.tsx', 'utf8');
  assert.match(researchSource, /export async function generateMetadata/);
  assert.match(researchSource, /executiveBrief/);
  assert.match(researchSource, /Research Dossier/);
  assert.match(researchSource, /openGraph:\s*\{/);
  assert.match(researchSource, /twitter:\s*\{/);
  assert.match(researchSource, /application\/ld\+json/);
  assert.match(researchSource, /'@type':\s*'Article'/);
});

test('sitemap.xml generator includes static editorial routes, dynamic stories, and topics', async () => {
  const entries = await sitemap();
  assert.ok(Array.isArray(entries));
  assert.ok(entries.length >= 6);

  const urls = entries.map(e => e.url);
  assert.ok(urls.some(u => u.endsWith('/')));
  assert.ok(urls.some(u => u.endsWith('/why-this-isnt-ai-slop')));
  assert.ok(urls.some(u => u.endsWith('/methodology')));
  assert.ok(urls.some(u => u.endsWith('/topics')));
  assert.ok(urls.some(u => u.endsWith('/pricing')));
  assert.ok(urls.some(u => u.endsWith('/legal')));
  assert.ok(urls.some(u => u.endsWith('/privacy')));
  assert.ok(urls.some(u => u.endsWith('/terms')));
  assert.ok(urls.some(u => u.includes('/category/ai-companies')));
  assert.ok(urls.some(u => u.includes('/category/infrastructure')));
  assert.ok(urls.some(u => u.includes('/category/languages-tools')));
  assert.ok(urls.some(u => u.includes('/stories/')));
  assert.ok(urls.some(u => u.includes('/topics/')));
  // Verify expanded coverage exceeds previous 120 limit
  const storyCount = urls.filter(u => u.includes('/stories/')).length;
  assert.ok(storyCount > 120, `Expected sitemap story count > 120, got ${storyCount}`);
});

test('robots.txt generator allows public routes and disallows sensitive internal endpoints', () => {
  const config = robots();
  assert.ok(config.rules);
  const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
  assert.equal(rules.userAgent, '*');
  const allowed = Array.isArray(rules.allow) ? rules.allow : [rules.allow];
  assert.ok(allowed.includes('/'));
  assert.ok(allowed.includes('/stories/'));
  assert.ok(allowed.includes('/topics/'));
  assert.ok(allowed.includes('/why-this-isnt-ai-slop'));

  const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
  assert.ok(disallowed.includes('/admin'));
  assert.ok(disallowed.includes('/api/'));
  assert.ok(disallowed.includes('/saved'));

  assert.ok(config.sitemap?.includes('sitemap.xml'));
});

test('Category page source defines generateMetadata with category title and description', async () => {
  const categorySource = await readFile('src/app/category/[slug]/page.tsx', 'utf8');
  assert.match(categorySource, /export async function generateMetadata/);
  assert.match(categorySource, /getCategoryBySlug/);
  assert.match(categorySource, /openGraph:\s*\{/);
  assert.match(categorySource, /twitter:\s*\{/);
});

test('Topic page hero and metadata directly answer long-tail search intent (is [topic] trending)', async () => {
  const topicSource = await readFile('src/app/topics/[slug]/page.tsx', 'utf8');
  assert.match(topicSource, /Is \$\{name\} trending\?/);
  assert.match(topicSource, /Is \{topic\.entity\.name\} trending\?/);
  assert.match(topicSource, /velocity/i);
});

test('Bidirectional internal linking connects Categories, Topics, and Stories', async () => {
  const storySource = await readFile('src/app/stories/[id]/page.tsx', 'utf8');
  const topicSource = await readFile('src/app/topics/[slug]/page.tsx', 'utf8');
  const categorySource = await readFile('src/app/category/[slug]/page.tsx', 'utf8');

  // Story links to category and topic
  assert.match(storySource, /primaryCategory/);
  assert.match(storySource, /topicPath/);
  assert.match(storySource, /\/category\/\$\{primaryCategory\.slug\}/);

  // Topic links to parent category and contributing stories
  assert.match(topicSource, /getCategoryForEntity/);
  assert.match(topicSource, /\/category\/\$\{category\.slug\}/);
  assert.match(topicSource, /StoryCard/);

  // Category links to member topics and stories
  assert.match(categorySource, /topicPath/);
  assert.match(categorySource, /StoryCard/);
});
