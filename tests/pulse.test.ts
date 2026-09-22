import assert from 'node:assert/strict';
import { test } from 'node:test';
import { buildMetricSnapshots, mentionVelocity, usablePulseItems } from '../src/lib/pulse';
import { pulseHealth } from '../src/lib/pulse-health';

const day = (value: string) => new Date(value);
const entities = [
  { id: 'react', created_at: day('2026-09-22T00:00:00Z') },
  { id: 'new-topic', created_at: day('2026-09-22T00:00:00Z') },
];

test('daily metric backfill uses historical document timestamps and computes velocity against the equivalent prior day', () => {
  const snapshots = buildMetricSnapshots(entities, [
    { id: 'a', published_at: day('2026-09-14T01:00:00Z'), source_id: 'hn', discussion_count: 3, entity_ids: ['react'] },
    { id: 'b', published_at: day('2026-09-14T02:00:00Z'), source_id: 'rss', discussion_count: 2, entity_ids: ['react'] },
    { id: 'c', published_at: day('2026-09-15T01:00:00Z'), source_id: 'hn', discussion_count: 7, entity_ids: ['react'] },
    { id: 'd', published_at: day('2026-09-15T02:00:00Z'), source_id: 'rss', discussion_count: 0, entity_ids: ['react', 'new-topic'] },
    { id: 'e', published_at: day('2026-09-15T03:00:00Z'), source_id: 'rss', discussion_count: 0, entity_ids: ['react'] },
  ], day('2026-09-15T00:00:00Z'));

  const react = snapshots.filter(snapshot => snapshot.entity_id === 'react');
  assert.equal(react.length, 2);
  assert.deepEqual(react.map(snapshot => snapshot.snapshot_at.toISOString().slice(0, 10)), ['2026-09-14', '2026-09-15']);
  assert.deepEqual(react.map(snapshot => snapshot.mention_count), [2, 3]);
  assert.equal(react[0].unique_source_count, 2);
  assert.equal(react[0].discussion_count, 5);
  assert.equal(react[1].mention_velocity, 50);

  const newTopic = snapshots.filter(snapshot => snapshot.entity_id === 'new-topic');
  assert.equal(newTopic[1].mention_velocity, null);
});

test('Pulse never fabricates a percent from a zero baseline or insufficient history', () => {
  assert.equal(mentionVelocity(0, 1), null);
  assert.equal(mentionVelocity(4, 2), -50);
  const visible = usablePulseItems([
    { mention_velocity: null, mention_count: 1, unique_source_count: 1 },
    { mention_velocity: 25, mention_count: 2, unique_source_count: 1 },
    { mention_velocity: -10, mention_count: 0, unique_source_count: 1 },
  ]);
  assert.equal(visible.length, 1);
  assert.equal(visible[0].mention_velocity, 25);
});

test('Pulse job health alerts after a daily snapshot run is missed', () => {
  const now = day('2026-09-22T12:00:00Z');
  assert.equal(pulseHealth('2026-09-21T12:00:00Z', now).stale, false);
  assert.equal(pulseHealth('2026-09-21T08:00:00Z', now).stale, true);
  assert.equal(pulseHealth(null, now).stale, true);
});
