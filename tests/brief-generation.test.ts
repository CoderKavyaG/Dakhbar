import { test } from 'node:test';
import assert from 'node:assert/strict';
import { groundedOrFallback, verifyGroundedCopy, type GroundedStoryFacts } from '../src/lib/brief-generation';

const facts: GroundedStoryFacts = {
  headline: 'OpenAI ships a PostgreSQL tool',
  entities: ['OpenAI', 'PostgreSQL'],
  sourceCount: 2,
  significance: 7.5,
  corroborationTimeline: [{ source: 'example.com', reportedAt: '2026-09-21T01:00:00.000Z' }],
};

test('grounded Brief copy accepts only names and numbers present in structured facts', () => {
  const copy = 'OpenAI ships a PostgreSQL tool, reported by 2 sources. The reporting remains grounded.';
  assert.equal(verifyGroundedCopy(copy, facts), true);
  assert.deepEqual(groundedOrFallback(copy, facts, 'fallback'), { text: copy, generated: true });
});

test('invented names or numbers force deterministic fallback', () => {
  const invented = 'Microsoft says OpenAI gained 3 customers.';
  assert.equal(verifyGroundedCopy(invented, facts), false);
  assert.deepEqual(groundedOrFallback(invented, facts, 'existing deterministic dek'), { text: 'existing deterministic dek', generated: false });
});


test('internal scores and raw timestamps are rejected even when present in input facts', () => {
  assert.equal(verifyGroundedCopy('OpenAI has a significance of 7.5.', facts), false);
  assert.equal(verifyGroundedCopy('OpenAI was reported at 2026-09-21T01:00:00.000Z.', facts), false);
});
