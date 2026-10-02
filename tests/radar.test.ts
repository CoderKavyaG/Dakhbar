import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRadarDataset,
  MIN_RADAR_SNAPSHOT_DAYS,
  RADAR_VOLUME_THRESHOLD,
  RADAR_MIN_ACCELERATION_MENTIONS,
  QUADRANT_LABELS,
} from '../src/lib/radar';

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
