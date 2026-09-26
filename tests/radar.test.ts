import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildRadarDataset,
  MIN_RADAR_SNAPSHOT_DAYS,
  RADAR_VOLUME_THRESHOLD,
} from '../src/lib/radar';

test('MIN_RADAR_SNAPSHOT_DAYS is 7 and volume threshold is 2.0', () => {
  assert.equal(MIN_RADAR_SNAPSHOT_DAYS, 7);
  assert.equal(RADAR_VOLUME_THRESHOLD, 2.0);
});

test('Entities with < 7 daily snapshots are strictly excluded, not misplaced', () => {
  const thinEntities = [
    {
      id: 'e-zero',
      name: 'Zero History Tech',
      type: 'technology',
      metric_snapshots: [],
    },
    {
      id: 'e-one',
      name: 'Single Day Tech',
      type: 'framework',
      metric_snapshots: [
        { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 5, mention_velocity: 100 },
      ],
    },
    {
      id: 'e-six',
      name: 'Six Days Tech',
      type: 'language',
      metric_snapshots: [
        { snapshot_at: '2026-09-20T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-21T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-22T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-23T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-24T00:00:00Z', mention_count: 3, mention_velocity: 0 },
        { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 3, mention_velocity: 0 },
      ],
    },
  ];

  const dataset = buildRadarDataset(thinEntities);
  assert.equal(dataset.totalTracked, 3);
  assert.equal(dataset.eligibleCount, 0);
  assert.equal(dataset.excludedCount, 3);
  assert.equal(dataset.plottedEntities.length, 0);
  assert.equal(dataset.excludedEntities.length, 3);
  assert.equal(dataset.excludedEntities[0].name, 'Zero History Tech');
  assert.match(dataset.excludedEntities[0].reason, /No historical metric snapshots/);
  assert.match(dataset.excludedEntities[1].reason, /Only 1 daily snapshot recorded/);
  assert.match(dataset.excludedEntities[2].reason, /Only 6 daily snapshots recorded/);
});

test('Eligible entities are classified into the four distinct momentum quadrants', () => {
  const sampleEntities = [
    // 1. Established & Accelerating (Surging): avg >= 2.0, vel > 0
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
    // 2. Emerging & Accelerating (Breakout): avg < 2.0, vel > 0
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
        { snapshot_at: '2026-09-25T00:00:00Z', mention_count: 1, mention_velocity: 200 },
      ],
    },
    // 3. Established & Stable/Declining (Foundations): avg >= 2.0, vel <= 0
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
    // 4. Emerging & Stable/Declining (Niche): avg < 2.0, vel <= 0
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
  assert.ok(anthropic.chartX >= 50);
  assert.ok(anthropic.chartY >= 50);

  const nvidia = dataset.plottedEntities.find(e => e.name === 'NVIDIA');
  assert.ok(nvidia);
  assert.equal(nvidia.quadrant, 'emerging_accelerating');
  assert.ok(nvidia.chartX < 50);
  assert.ok(nvidia.chartY >= 50);

  const linux = dataset.plottedEntities.find(e => e.name === 'Linux');
  assert.ok(linux);
  assert.equal(linux.quadrant, 'established_stable');
  assert.ok(linux.chartX >= 50);
  assert.ok(linux.chartY < 50);

  const zig = dataset.plottedEntities.find(e => e.name === 'Zig');
  assert.ok(zig);
  assert.equal(zig.quadrant, 'emerging_stable');
  assert.ok(zig.chartX < 50);
  assert.ok(zig.chartY < 50);

  // SVG coordinates bounds check
  for (const point of dataset.plottedEntities) {
    assert.ok(point.svgX >= 40 && point.svgX <= 660, `svgX out of bounds: ${point.svgX}`);
    assert.ok(point.svgY >= 40 && point.svgY <= 480, `svgY out of bounds: ${point.svgY}`);
  }
});

test('Pulse Radar page and route files are properly configured and gated', async () => {
  const { readFile } = await import('node:fs/promises');
  const pulsePage = await readFile('src/app/pulse/page.tsx', 'utf8');
  assert.match(pulsePage, /Developer Pulse Radar/);
  assert.match(pulsePage, /getPulseRadarData/);
  assert.match(pulsePage, /subscription_status === 'active'/);
  assert.match(pulsePage, /PulseRadarChart/);
  assert.match(pulsePage, /pulse-upgrade-card/);

  const radarRedirect = await readFile('src/app/radar/page.tsx', 'utf8');
  assert.match(radarRedirect, /redirect\('\/pulse'\)/);
});
