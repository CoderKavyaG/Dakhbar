import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { topicPath, topicSlug } from '../src/lib/topic-slug';

test('topic slugs are stable and readable', () => {
  assert.equal(topicSlug('PostgreSQL'), 'postgresql');
  assert.equal(topicSlug('React JS'), 'react-js');
  assert.equal(topicPath({ name: 'OpenAI' }), '/topics/openai');
});

test('Topic, Following, and Brief reuse the shared StoryCard', async () => {
  const sources = await Promise.all([
    readFile('src/app/topics/[slug]/page.tsx', 'utf8'),
    readFile('src/app/for-you/page.tsx', 'utf8'),
    readFile('src/app/brief/page.tsx', 'utf8'),
  ]);
  sources.forEach(source => assert.match(source, /<StoryCard/));
});
