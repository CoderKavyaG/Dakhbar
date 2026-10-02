// Consolidated Test Suite: 05-pulse-radar.test.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { buildMetricSnapshots, mentionVelocity, usablePulseItems } from '../src/lib/pulse';
import { pulseHealth } from '../src/lib/pulse-health';
import { MIN_RADAR_SNAPSHOT_DAYS, QUADRANT_LABELS, RADAR_MIN_ACCELERATION_MENTIONS, RADAR_VOLUME_THRESHOLD, buildRadarDataset } from '../src/lib/radar';
import { topicPath, topicSlug } from '../src/lib/topic-slug';
import { computeTrendStats, filterSnapshotsForRange, formatMonthDay, rankCategoryMovers, type CategoryEntityMetric, type MetricSnapshotData } from '../src/lib/trend';

// --- Section: pulse.test.ts ---
{
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
}

// --- Section: radar.test.ts ---
{
test('MIN_RADAR_SNAPSHOT_DAYS is 7, volume threshold is 2.0, and anti-noise min volume is 3', () => {
  assert.equal(MIN_RADAR_SNAPSHOT_DAYS, 7);
  assert.equal(RADAR_VOLUME_THRESHOLD, 2.0);
  assert.equal(RADAR_MIN_ACCELERATION_MENTIONS, 3);
});

test('Quadrant labels reflect honest corpus coverage rather than technology maturity', () => {
  assert.equal(QUADRANT_LABELS.emerging_accelerating.title, 'Rising Momentum');
  assert.match(QUADRANT_LABELS.emerging_accelerating.subtitle, /Targeted coverage/i);

  assert.equal(QUADRANT_LABELS.established_accelerating.title, 'Surging Leaders');
  assert.match(QUADRANT_LABELS.established_accelerating.subtitle, /High-volume coverage/i);

  assert.equal(QUADRANT_LABELS.established_stable.title, 'Core Foundations');
  assert.match(QUADRANT_LABELS.established_stable.subtitle, /High-volume coverage/i);

  assert.equal(QUADRANT_LABELS.emerging_stable.title, 'Niche & Focused');
  assert.match(QUADRANT_LABELS.emerging_stable.subtitle, /Targeted coverage/i);
});

test('Anti-noise gate prevents low-sample 1-to-2 mention spikes from misclassifying as accelerating', () => {
  const noisyEntity = {
    id: 'e-noisy',
    name: 'Noisy Tiny Tech',
    type: 'tool',
    metric_snapshots: [
      { snapshot_at: '2026-09-19T00:00:00Z', mention_count: 0, mention_velocity: 0 },
      { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 0, mention_velocity: 0 },
      { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 0, mention_velocity: 0 },
      { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 0, mention_velocity: 0 },
      { snapshot_at: '2026-09-23T00:00:00Z', mention_count: 0, mention_velocity: 0 },
      { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 1, mention_velocity: 0 },
      { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 2, mention_velocity: 100 }, // 1 -> 2 (+100%, but only 2 mentions, gain +1, avg 0.43)
    ],
  };

  const realMoverEntity = {
    id: 'e-real-mover',
    name: 'Real Surging Tech',
    type: 'framework',
    metric_snapshots: [
      { snapshot_at: '2026-09-19T00:00:00Z', mention_count: 1, mention_velocity: 0 },
      { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 1, mention_velocity: 0 },
      { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 1, mention_velocity: 0 },
      { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 1, mention_velocity: 0 },
      { snapshot_at: '2026-09-23T00:00:00Z', mention_count: 1, mention_velocity: 0 },
      { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 2, mention_velocity: 100 },
      { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 6, mention_velocity: 200 }, // 2 -> 6 (+200%, latest 6 >= 3, delta +4)
    ],
  };

  const dataset = buildRadarDataset([noisyEntity, realMoverEntity]);
  assert.equal(dataset.eligibleCount, 2);

  const plottedNoisy = dataset.plottedEntities.find(e => e.name === 'Noisy Tiny Tech');
  assert.ok(plottedNoisy);
  // Must be filtered to steady/niche (bottom half) rather than showing as a breakout
  assert.equal(plottedNoisy.quadrant, 'emerging_stable');
  assert.ok(plottedNoisy.chartY < 50, 'Noisy entity should be mapped below the acceleration centerline');

  const plottedReal = dataset.plottedEntities.find(e => e.name === 'Real Surging Tech');
  assert.ok(plottedReal);
  assert.equal(plottedReal.quadrant, 'emerging_accelerating');
  assert.ok(plottedReal.chartY >= 50, 'Real surge entity should be mapped above the acceleration centerline');
});

test('Young entities with 2-3 days of history are strictly excluded, not misplaced or interpolated', () => {
  const mixedEntities = [
    {
      id: 'e-young-2d',
      name: 'Young Framework 2D',
      type: 'framework',
      metric_snapshots: [
        { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 8, mention_velocity: 100 },
        { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 12, mention_velocity: 50 },
      ],
    },
    {
      id: 'e-young-3d',
      name: 'Young Database 3D',
      type: 'database',
      metric_snapshots: [
        { snapshot_at: '2026-09-23T00:00:00Z', mention_count: 4, mention_velocity: 0 },
        { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 5, mention_velocity: 25 },
        { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 6, mention_velocity: 20 },
      ],
    },
    {
      id: 'e-mature-8d',
      name: 'Mature Language 8D',
      type: 'language',
      metric_snapshots: [
        { snapshot_at: '2026-09-18T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-19T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-23T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 4, mention_velocity: 33 },
      ],
    },
  ];

  const dataset = buildRadarDataset(mixedEntities);
  assert.equal(dataset.totalTracked, 3);
  assert.equal(dataset.eligibleCount, 1);
  assert.equal(dataset.excludedCount, 2);

  // Plotted set contains ONLY the eligible mature entity
  assert.equal(dataset.plottedEntities.length, 1);
  assert.equal(dataset.plottedEntities[0].name, 'Mature Language 8D');
  assert.equal(dataset.plottedEntities[0].daysOfHistory, 8);

  // Excluded entities list contains both young entities with exact honest explanations
  assert.equal(dataset.excludedEntities.length, 2);

  const excluded2d = dataset.excludedEntities.find(e => e.name === 'Young Framework 2D');
  assert.ok(excluded2d);
  assert.equal(excluded2d.daysOfHistory, 2);
  assert.equal(
    excluded2d.reason,
    'Only 2 daily snapshots recorded (minimum 7 required for trend baseline).'
  );

  const excluded3d = dataset.excludedEntities.find(e => e.name === 'Young Database 3D');
  assert.ok(excluded3d);
  assert.equal(excluded3d.daysOfHistory, 3);
  assert.equal(
    excluded3d.reason,
    'Only 3 daily snapshots recorded (minimum 7 required for trend baseline).'
  );
});

test('Eligible entities are classified into the four distinct momentum quadrants', () => {
  const sampleEntities = [
    // 1. High Volume & Accelerating (Surging Leaders): avg >= 2.0, vel > 0 & genuine
    {
      id: 'e-anthropic',
      name: 'Anthropic',
      type: 'company',
      metric_snapshots: [
        { snapshot_at: '2026-09-19T00:00:00Z', mention_count: 6, mention_velocity: 100 },
        { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 6, mention_velocity: 100 },
        { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 6, mention_velocity: 100 },
        { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 6, mention_velocity: 100 },
        { snapshot_at: '2026-09-23T00:00:00Z', mention_count: 6, mention_velocity: 100 },
        { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 6, mention_velocity: 100 },
        { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 6, mention_velocity: 100 },
      ],
    },
    // 2. Targeted Coverage & Accelerating (Rising Momentum): avg < 2.0, vel > 0 & genuine (latest >= 3)
    {
      id: 'e-nvidia',
      name: 'NVIDIA',
      type: 'company',
      metric_snapshots: [
        { snapshot_at: '2026-09-19T00:00:00Z', mention_count: 1, mention_velocity: 200 },
        { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 1, mention_velocity: 200 },
        { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 1, mention_velocity: 200 },
        { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 1, mention_velocity: 200 },
        { snapshot_at: '2026-09-23T00:00:00Z', mention_count: 1, mention_velocity: 200 },
        { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 1, mention_velocity: 200 },
        { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 3, mention_velocity: 200 },
      ],
    },
    // 3. High Volume & Stable/Declining (Core Foundations): avg >= 2.0, vel <= 0
    {
      id: 'e-linux',
      name: 'Linux',
      type: 'platform',
      metric_snapshots: [
        { snapshot_at: '2026-09-19T00:00:00Z', mention_count: 3, mention_velocity: -40 },
        { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 3, mention_velocity: -40 },
        { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 3, mention_velocity: -40 },
        { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 3, mention_velocity: -40 },
        { snapshot_at: '2026-09-23T00:00:00Z', mention_count: 3, mention_velocity: -40 },
        { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 3, mention_velocity: -40 },
        { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 3, mention_velocity: -40 },
      ],
    },
    // 4. Targeted Coverage & Stable/Declining (Niche & Focused): avg < 2.0, vel <= 0
    {
      id: 'e-zig',
      name: 'Zig',
      type: 'language',
      metric_snapshots: [
        { snapshot_at: '2026-09-19T00:00:00Z', mention_count: 0, mention_velocity: 0 },
        { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 0, mention_velocity: 0 },
        { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 0, mention_velocity: 0 },
        { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 0, mention_velocity: 0 },
        { snapshot_at: '2026-09-23T00:00:00Z', mention_count: 0, mention_velocity: 0 },
        { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 0, mention_velocity: 0 },
        { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 0, mention_velocity: 0 },
      ],
    },
  ];

  const dataset = buildRadarDataset(sampleEntities, { viewBoxWidth: 700, viewBoxHeight: 520 });
  assert.equal(dataset.eligibleCount, 4);
  assert.equal(dataset.excludedCount, 0);

  const anthropic = dataset.plottedEntities.find(e => e.name === 'Anthropic');
  assert.ok(anthropic);
  assert.equal(anthropic.quadrant, 'established_accelerating');
  assert.equal(anthropic.quadrantLabel, 'Surging Leaders');
  assert.ok(anthropic.chartX >= 50);
  assert.ok(anthropic.chartY >= 50);

  const nvidia = dataset.plottedEntities.find(e => e.name === 'NVIDIA');
  assert.ok(nvidia);
  assert.equal(nvidia.quadrant, 'emerging_accelerating');
  assert.equal(nvidia.quadrantLabel, 'Rising Momentum');
  assert.ok(nvidia.chartX < 50);
  assert.ok(nvidia.chartY >= 50);

  const linux = dataset.plottedEntities.find(e => e.name === 'Linux');
  assert.ok(linux);
  assert.equal(linux.quadrant, 'established_stable');
  assert.equal(linux.quadrantLabel, 'Core Foundations');
  assert.ok(linux.chartX >= 50);
  assert.ok(linux.chartY < 50);

  const zig = dataset.plottedEntities.find(e => e.name === 'Zig');
  assert.ok(zig);
  assert.equal(zig.quadrant, 'emerging_stable');
  assert.equal(zig.quadrantLabel, 'Niche & Focused');
  assert.ok(zig.chartX < 50);
  assert.ok(zig.chartY < 50);

  // SVG coordinates bounds check
  for (const point of dataset.plottedEntities) {
    assert.ok(point.svgX >= 40 && point.svgX <= 660, `svgX out of bounds: ${point.svgX}`);
    assert.ok(point.svgY >= 40 && point.svgY <= 480, `svgY out of bounds: ${point.svgY}`);
  }
});

test('Radar route redirects gracefully to search', async () => {
  const { readFile } = await import('node:fs/promises');
  const radarRedirect = await readFile('src/app/radar/page.tsx', 'utf8');
  assert.match(radarRedirect, /redirect\('\/search'\)/);
});
}

// --- Section: trend.test.ts ---
{
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

test('computes valid compact sparkline coordinates without collapsing plotWidth to zero', () => {
  const sample: MetricSnapshotData[] = [
    { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 2, unique_source_count: 1, discussion_count: 0, mention_velocity: null },
    { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 8, unique_source_count: 2, discussion_count: 0, mention_velocity: 300 },
    { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 6, unique_source_count: 2, discussion_count: 0, mention_velocity: -25 },
  ];
  const stats = computeTrendStats(sample, '7d', 48, 18);
  assert.equal(stats.points.length, 3);
  assert.equal(stats.points[0].x, 2); // left edge with 2px padding
  assert.equal(stats.points[2].x, 46); // right edge (48 - 2px padding)
  assert.ok(stats.points[2].x > stats.points[0].x, 'x must spread horizontally');
  assert.ok(stats.svgPath.includes('46,'), 'path must reach right edge');
});

test('rankCategoryMovers enforces minimum volume threshold and prevents small-sample noise from outranking real trends', () => {
  const entities: CategoryEntityMetric[] = [
    {
      id: 'high-volume',
      name: 'HighVolume AI',
      type: 'company',
      slug: 'high-volume-ai',
      storyCount: 50,
      latestMentions: 25,
      previousMentions: 10,
      absoluteGain: 15,
      latestVelocity: 150.0, // +150% (10 -> 25)
    },
    {
      id: 'substantial-gain',
      name: 'OpenAI',
      type: 'company',
      slug: 'openai',
      storyCount: 60,
      latestMentions: 7,
      previousMentions: 3,
      absoluteGain: 4,
      latestVelocity: 133.3, // +133.3% (3 -> 7)
    },
    {
      id: 'noisy-jump',
      name: 'TinyLab',
      type: 'company',
      slug: 'tinylab',
      storyCount: 4,
      latestMentions: 4,
      previousMentions: 1,
      absoluteGain: 3,
      latestVelocity: 300.0, // +300% (1 -> 4) - huge % but small volume
    },
    {
      id: 'below-threshold',
      name: 'MicroApp',
      type: 'company',
      slug: 'microapp',
      storyCount: 2,
      latestMentions: 2,
      previousMentions: 1,
      absoluteGain: 1,
      latestVelocity: 100.0, // +100% (1 -> 2) - below min threshold
    },
    {
      id: 'decliner',
      name: 'SlowLab',
      type: 'company',
      slug: 'slowlab',
      storyCount: 10,
      latestMentions: 3,
      previousMentions: 6,
      absoluteGain: -3,
      latestVelocity: -50.0,
    },
  ];

  const result = rankCategoryMovers(entities, { minMentionsThreshold: 3, limit: 3 });

  // 1. Below threshold (MicroApp: latestMentions = 2 < 3) is excluded
  assert.equal(
    result.topGainers.some(g => g.name === 'MicroApp'),
    false,
    'Entities below minimum mention threshold must be excluded from top movers'
  );

  // 2. High-volume real trend (+15 mentions, +150%) must rank #1
  assert.equal(result.topGainers[0].name, 'HighVolume AI');
  assert.equal(result.topGainers[0].absoluteGain, 15);

  // 3. Substantial trend (OpenAI: +4 mentions, +133.3%) must rank ABOVE noisy jump (TinyLab: +3 mentions, +300%)
  assert.equal(result.topGainers[1].name, 'OpenAI');
  assert.equal(result.topGainers[1].absoluteGain, 4);

  assert.equal(result.topGainers[2].name, 'TinyLab');
  assert.equal(result.topGainers[2].absoluteGain, 3);

  // 4. Decliners properly capture absolute drop
  assert.equal(result.topDecliners.length, 1);
  assert.equal(result.topDecliners[0].name, 'SlowLab');
  assert.equal(result.topDecliners[0].absoluteGain, -3);

  // 5. Volume leaders rank strictly by latestMentions
  assert.equal(result.topByVolume[0].name, 'HighVolume AI');
  assert.equal(result.topByVolume[1].name, 'OpenAI');
});
}

// --- Section: topics.test.ts ---
{
test('topic slugs are stable and readable', () => {
  assert.equal(topicSlug('PostgreSQL'), 'postgresql');
  assert.equal(topicSlug('React JS'), 'react-js');
  assert.equal(topicPath({ name: 'OpenAI' }), '/topics/openai');
});

test('Front Page (Today and Following), Topic, and Saved reuse the shared StoryCard', async () => {
  const sources = await Promise.all([
    readFile('src/app/page.tsx', 'utf8'),
    readFile('src/app/topics/[slug]/page.tsx', 'utf8'),
    readFile('src/app/saved/page.tsx', 'utf8'),
  ]);
  sources.forEach(source => assert.match(source, /<StoryCard/));
});
}
