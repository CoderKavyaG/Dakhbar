import { test } from 'node:test';
import assert from 'node:assert/strict';
import { briefSince, briefStoryWhere, briefSummary, FIRST_BRIEF_WINDOW_MS } from '../src/lib/brief';

test('a first Brief defaults to the preceding 24 hours', () => {
  const now = new Date('2026-09-20T12:00:00.000Z');
  assert.equal(briefSince(null, now).getTime(), now.getTime() - FIRST_BRIEF_WINDOW_MS);
});

test('a returning Brief starts at the stored visit time', () => {
  const now = new Date('2026-09-20T12:00:00.000Z');
  const lastSeen = new Date('2026-09-19T18:42:00.000Z');
  assert.equal(briefSince(lastSeen, now), lastSeen);
  assert.deepEqual(briefStoryWhere(['entity_1'], lastSeen), {
    entities: { some: { entity_id: { in: ['entity_1'] } } },
    documents: { some: { raw_document: { published_at: { gte: lastSeen } } } },
  });
});

test('Brief summary and zero-result copy are deterministic', () => {
  assert.equal(briefSummary(0), 'No new developments since you were last here.');
  assert.equal(briefSummary(1), '1 development since you were last here.');
  assert.equal(briefSummary(4), '4 developments since you were last here.');
});
