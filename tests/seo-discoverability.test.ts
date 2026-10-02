import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import sitemap from '../src/app/sitemap';
import robots from '../src/app/robots';

test('Story page source defines generateMetadata with OpenGraph, Twitter, and NewsArticle JSON-LD schema', async () => {
  const storySource = await readFile('src/app/stories/[id]/page.tsx', 'utf8');
  assert.match(storySource, /export async function generateMetadata/);
  assert.match(storySource, /type:\s*['"]article['"]/);
  assert.match(storySource, /openGraph:\s*\{/);
  assert.match(storySource, /twitter:\s*\{/);
  assert.match(storySource, /application\/ld\+json/);
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

test('Research page source defines generateMetadata with shareable dossier preview cards', async () => {
  const researchSource = await readFile('src/app/research/page.tsx', 'utf8');
  assert.match(researchSource, /export async function generateMetadata/);
  assert.match(researchSource, /executiveBrief/);
  assert.match(researchSource, /Research Dossier/);
  assert.match(researchSource, /openGraph:\s*\{/);
  assert.match(researchSource, /twitter:\s*\{/);
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
  assert.ok(urls.some(u => u.includes('/stories/')));
  assert.ok(urls.some(u => u.includes('/topics/')));
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

test('Why This Isn’t AI Slop page explains citation verification, deterministic clustering, and fail-closed validation', async () => {
  const pageSource = await readFile('src/app/why-this-isnt-ai-slop/page.tsx', 'utf8');
  assert.match(pageSource, /Deterministic clustering before any LLM/);
  assert.match(pageSource, /Sentence-level citation enforcement/);
  assert.match(pageSource, /Fail-closed verification engine/);
  assert.match(pageSource, /No scraping, no paywall bypass/);
  assert.match(pageSource, /Empirical telemetry/);
});
