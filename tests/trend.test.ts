import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeTrendStats, filterSnapshotsForRange, formatMonthDay, type MetricSnapshotData } from '../src/lib/trend';

test('formatMonthDay converts date to concise human readable string', () => {
  assert.equal(formatMonthDay(new Date('2026-09-14T00:00:00Z')), 'Sept 14');
  assert.equal(formatMonthDay('2026-09-24T00:00:00Z'), 'Sept 24');
});

test('filterSnapshotsForRange slices snapshots according to requested range limit', () => {
  const dates = [
    '2026-09-14T00:00:00Z',
    '2026-09-15T00:00:00Z',
    '2026-09-16T00:00:00Z',
    '2026-09-17T00:00:00Z',
    '2026-09-18T00:00:00Z',
    '2026-09-19T00:00:00Z',
    '2026-09-20T00:00:00Z',
    '2026-09-21T00:00:00Z',
    '2026-09-22T00:00:00Z',
    '2026-09-23T00:00:00Z',
    '2026-09-24T00:00:00Z',
  ];
  const snaps: MetricSnapshotData[] = dates.map((d, i) => ({
    snapshot_at: d,
    mention_count: 5 + i,
  }));
  assert.equal(filterSnapshotsForRange(snaps, '24h').length, 2);
  assert.equal(filterSnapshotsForRange(snaps, '7d').length, 7);
  assert.equal(filterSnapshotsForRange(snaps, '30d').length, 11);
});


test('handles zero-history data with an honest empty state', () => {
  const result = computeTrendStats([], '7d');
  assert.equal(result.hasEnoughData, false);
  assert.equal(result.points.length, 0);
  assert.equal(result.svgPath, '');
  assert.match(result.emptyReason!, /No historical metric snapshots available/);
});

test('handles single-snapshot thin history with clear message', () => {
  const single: MetricSnapshotData[] = [
    { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 5, unique_source_count: 2, discussion_count: 10, mention_velocity: null },
  ];
  const result = computeTrendStats(single, '7d');
  assert.equal(result.hasEnoughData, false);
  assert.equal(result.points.length, 0);
  assert.match(result.emptyReason!, /Only 1 daily snapshot recorded/);
});

test('handles partial-history data for 30d range with honest date labeling', () => {
  const elevenDays: MetricSnapshotData[] = [
    { snapshot_at: '2026-09-14T00:00:00Z', mention_count: 2, unique_source_count: 1, discussion_count: 0, mention_velocity: null },
    { snapshot_at: '2026-09-15T00:00:00Z', mention_count: 3, unique_source_count: 1, discussion_count: 0, mention_velocity: 50 },
    { snapshot_at: '2026-09-16T00:00:00Z', mention_count: 2, unique_source_count: 1, discussion_count: 0, mention_velocity: -33.3 },
    { snapshot_at: '2026-09-17T00:00:00Z', mention_count: 5, unique_source_count: 1, discussion_count: 0, mention_velocity: 150 },
    { snapshot_at: '2026-09-18T00:00:00Z', mention_count: 12, unique_source_count: 1, discussion_count: 0, mention_velocity: 140 },
    { snapshot_at: '2026-09-19T00:00:00Z', mention_count: 5, unique_source_count: 1, discussion_count: 0, mention_velocity: -58.3 },
    { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 4, unique_source_count: 1, discussion_count: 0, mention_velocity: -20 },
    { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 3, unique_source_count: 2, discussion_count: 0, mention_velocity: -25 },
    { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 6, unique_source_count: 2, discussion_count: 0, mention_velocity: 100 },
    { snapshot_at: '2026-09-23T00:00:00Z', mention_count: 3, unique_source_count: 1, discussion_count: 0, mention_velocity: -50 },
    { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 7, unique_source_count: 2, discussion_count: 0, mention_velocity: 133.3 },
  ];

  const result30d = computeTrendStats(elevenDays, '30d');
  assert.equal(result30d.hasEnoughData, true);
  assert.equal(result30d.isPartial, true);
  assert.equal(result30d.daysAvailable, 11);
  assert.equal(result30d.rangeLabel, 'Since Sept 14 (11 days of history)');
  assert.equal(result30d.currentMentions, 7);
  assert.equal(result30d.currentVelocity, 133.3);
  assert.equal(result30d.peakMentions, 12);
  assert.equal(result30d.points.length, 11);
  assert.ok(result30d.svgPath.length > 0);
  assert.ok(result30d.svgArea.length > 0);

  // Check 7d range on same data (has full 7 days)
  const result7d = computeTrendStats(elevenDays, '7d');
  assert.equal(result7d.hasEnoughData, true);
  assert.equal(result7d.isPartial, false);
  assert.equal(result7d.daysAvailable, 7);
  assert.equal(result7d.rangeLabel, 'Last 7 days');
  assert.equal(result7d.points.length, 7);

  // Check 24h range on same data
  const result24h = computeTrendStats(elevenDays, '24h');
  assert.equal(result24h.hasEnoughData, true);
  assert.equal(result24h.daysAvailable, 2);
  assert.equal(result24h.rangeLabel, 'Last 24 hours');
  assert.equal(result24h.points.length, 2);
});

test('computes valid SVG polyline and polygon coordinates within viewBox bounds', () => {
  const sample: MetricSnapshotData[] = [
    { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 0, unique_source_count: 0, discussion_count: 0, mention_velocity: null },
    { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 10, unique_source_count: 2, discussion_count: 0, mention_velocity: null },
    { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 5, unique_source_count: 1, discussion_count: 0, mention_velocity: -50 },
  ];
  const stats = computeTrendStats(sample, '7d', 400, 120);
  assert.equal(stats.points.length, 3);
  assert.equal(stats.points[0].x, 24);
  assert.equal(stats.points[0].y, 92); // 0 mentions is baseline (16 + 76)
  assert.equal(stats.points[1].y, 16); // 10 mentions is peak
  assert.equal(stats.points[2].y, 54); // 5 mentions is midpoint (16 + 38)
  assert.equal(stats.points[2].x, 376); // Right edge (400 - 24)
});
