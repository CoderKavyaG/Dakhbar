import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createEmbedding, cosineSimilarity, EMBEDDING_DIMENSIONS } from '../src/lib/clustering/embedding';

test('local embeddings are deterministic, normalized and fixed width', () => {
  const first = createEmbedding('PostgreSQL releases a new query planner');
  const second = createEmbedding('PostgreSQL releases a new query planner');
  assert.deepEqual(first, second);
  assert.equal(first.length, EMBEDDING_DIMENSIONS);
  const norm = Math.sqrt(first.reduce((sum, value) => sum + value * value, 0));
  assert.ok(Math.abs(norm - 1) < 1e-9);
});
test('related text scores above unrelated text', () => {
  const anchor = createEmbedding('React server components framework update');
  const related = createEmbedding('React framework server component update');
  const unrelated = createEmbedding('PostgreSQL database vacuum indexing');
  assert.ok(cosineSimilarity(anchor, related) > cosineSimilarity(anchor, unrelated));
});
