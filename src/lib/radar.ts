import { db } from './db';
import { topicSlug } from './topic-slug';
import { getCategoryForEntity } from './taxonomy';

export type RadarQuadrant =
  | 'emerging_accelerating' // Top-Left: Breakout Stars (High Velocity · Emerging Volume)
  | 'established_accelerating' // Top-Right: Surging Leaders (High Velocity · Established Volume)
  | 'established_stable' // Bottom-Right: Foundations & Standards (Mature Volume · Baseline/Steady)
  | 'emerging_stable'; // Bottom-Left: Niche & Cooling (Emerging Volume · Steady/Cooling)

export type RadarEntityPoint = {
  id: string;
  name: string;
  slug: string;
  type: string;
  category: {
    slug: string;
    label: string;
  };
  quadrant: RadarQuadrant;
  quadrantLabel: string;
  // Raw metrics
  daysOfHistory: number;
  totalMentions: number;
  averageDailyMentions: number; // 7d average
  latestMentions: number;
  velocityPercent: number; // 7d velocity %
  storyCount: number;
  // Scaled Cartesian Coordinates: [0..100] where center crosshair is (50, 50)
  chartX: number;
  chartY: number;
  // Scaled SVG Coordinates for viewBox
  svgX: number;
  svgY: number;
};

export type ExcludedRadarEntity = {
  id: string;
  name: string;
  slug: string;
  daysOfHistory: number;
  reason: string;
};

export type RadarDataset = {
  totalTracked: number;
  eligibleCount: number;
  excludedCount: number;
  plottedEntities: RadarEntityPoint[];
  excludedEntities: ExcludedRadarEntity[];
  quadrants: {
    emerging_accelerating: RadarEntityPoint[];
    established_accelerating: RadarEntityPoint[];
    established_stable: RadarEntityPoint[];
    emerging_stable: RadarEntityPoint[];
  };
  viewBoxWidth: number;
  viewBoxHeight: number;
  volumeThreshold: number; // 2.0 average daily mentions
  velocityThreshold: number; // 0%
};

export const MIN_RADAR_SNAPSHOT_DAYS = 7;
export const RADAR_VOLUME_THRESHOLD = 2.0; // >= 2.0 average daily mentions = High-Volume Coverage
export const RADAR_MIN_ACCELERATION_MENTIONS = 3; // Minimum latest mentions or >= 2 net delta for acceleration to avoid 1-to-2 mention noise

export const QUADRANT_LABELS: Record<RadarQuadrant, { title: string; subtitle: string; badge: string }> = {
  emerging_accelerating: {
    title: 'Rising Momentum',
    subtitle: 'Targeted coverage · Accelerating velocity',
    badge: 'Accelerating',
  },
  established_accelerating: {
    title: 'Surging Leaders',
    subtitle: 'High-volume coverage · Accelerating velocity',
    badge: 'Surging',
  },
  established_stable: {
    title: 'Core Foundations',
    subtitle: 'High-volume coverage · Steady baseline',
    badge: 'Foundation',
  },
  emerging_stable: {
    title: 'Niche & Focused',
    subtitle: 'Targeted coverage · Steady baseline',
    badge: 'Focused',
  },
};

/**
 * Pure deterministic classification and coordinate calculation over entity snapshot records.
 * Ensures that entities with < 7 days of snapshots are strictly excluded, not misplaced or faked.
 */
export function buildRadarDataset(
  entities: Array<{
    id: string;
    name: string;
    type: string;
    storyCount?: number;
    metric_snapshots: Array<{
      snapshot_at: Date | string;
      mention_count: number;
      mention_velocity?: number | null;
    }>;
  }>,
  options: {
    viewBoxWidth?: number;
    viewBoxHeight?: number;
    volumeThreshold?: number;
  } = {}
): RadarDataset {
  const viewBoxWidth = options.viewBoxWidth ?? 700;
  const viewBoxHeight = options.viewBoxHeight ?? 520;
  const volumeThreshold = options.volumeThreshold ?? RADAR_VOLUME_THRESHOLD;

  const plottedEntities: RadarEntityPoint[] = [];
  const excludedEntities: ExcludedRadarEntity[] = [];

  const quadrants: RadarDataset['quadrants'] = {
    emerging_accelerating: [],
    established_accelerating: [],
    established_stable: [],
    emerging_stable: [],
  };

  const padding = { left: 40, right: 40, top: 40, bottom: 40 };
  const plotWidth = viewBoxWidth - padding.left - padding.right;
  const plotHeight = viewBoxHeight - padding.top - padding.bottom;
  const centerY = padding.top + plotHeight / 2;

  for (const entity of entities) {
    const snapshots = entity.metric_snapshots ?? [];

    if (snapshots.length < MIN_RADAR_SNAPSHOT_DAYS) {
      excludedEntities.push({
        id: entity.id,
        name: entity.name,
        slug: topicSlug(entity.name),
        daysOfHistory: snapshots.length,
        reason:
          snapshots.length === 0
            ? 'No historical metric snapshots available yet.'
            : `Only ${snapshots.length} daily snapshot${snapshots.length === 1 ? '' : 's'} recorded (minimum ${MIN_RADAR_SNAPSHOT_DAYS} required for trend baseline).`,
      });
      continue;
    }

    // Sort chronologically ascending
    const sorted = [...snapshots].sort(
      (a, b) => new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime()
    );

    const last7 = sorted.slice(-7);
    const sum7 = last7.reduce((acc, s) => acc + s.mention_count, 0);
    const averageDailyMentions = Number((sum7 / 7).toFixed(2));
    const totalMentions = sorted.reduce((acc, s) => acc + s.mention_count, 0);

    const latest = sorted[sorted.length - 1];
    const previous = sorted.length > 1 ? sorted[sorted.length - 2] : null;
    const velocityPercent = latest.mention_velocity ?? 0;
    const latestMentions = latest.mention_count;
    const previousMentions = previous ? previous.mention_count : 0;
    const absoluteGain = latestMentions - previousMentions;

    const isHighVolume = averageDailyMentions >= volumeThreshold;

    // Anti-noise gate: velocity > 0 is only treated as genuine acceleration if
    // supported by sufficient absolute volume or a meaningful net mention delta
    const hasGenuineAcceleration =
      velocityPercent > 0 &&
      (latestMentions >= RADAR_MIN_ACCELERATION_MENTIONS || absoluteGain >= 2 || averageDailyMentions >= 0.8);

    let quadrant: RadarQuadrant;
    if (isHighVolume && hasGenuineAcceleration) {
      quadrant = 'established_accelerating';
    } else if (!isHighVolume && hasGenuineAcceleration) {
      quadrant = 'emerging_accelerating';
    } else if (isHighVolume && !hasGenuineAcceleration) {
      quadrant = 'established_stable';
    } else {
      quadrant = 'emerging_stable';
    }

    // Normalize Volume Axis (X):
    // Targeted / Light half [0, volumeThreshold] maps to chartX [5..48] -> SVG [padding.left + 5% .. centerX - 2%]
    // High-Volume half [volumeThreshold, maxVolume] maps to chartX [52..95] -> SVG [centerX + 2% .. padding.left + plotWidth - 5%]
    const maxVolumeCap = 10.0;
    let chartX: number;
    let svgX: number;

    if (!isHighVolume) {
      const ratio = Math.min(1, Math.max(0, averageDailyMentions / volumeThreshold));
      chartX = 5 + ratio * 43; // 5 to 48
      svgX = padding.left + (chartX / 100) * plotWidth;
    } else {
      const ratio = Math.min(1, Math.max(0, (averageDailyMentions - volumeThreshold) / (maxVolumeCap - volumeThreshold)));
      chartX = 52 + ratio * 43; // 52 to 95
      svgX = padding.left + (chartX / 100) * plotWidth;
    }

    // Normalize Velocity Axis (Y):
    // Accelerating (> 0% up to +300%+) maps to chartY [52..95] (Top half of Cartesian) -> in SVG: [padding.top + 5% .. centerY - 2%]
    // Stable / Declining / Anti-noise filtered maps to chartY [5..48] (Bottom half of Cartesian) -> in SVG: [centerY + 2% .. padding.top + plotHeight - 5%]
    const maxVelocityCap = 300;
    let chartY: number;
    let svgY: number;

    if (hasGenuineAcceleration) {
      const ratio = Math.min(1, Math.max(0, velocityPercent / maxVelocityCap));
      chartY = 52 + ratio * 43; // 52 to 95
      // SVG Y goes downward, so top is padding.top + (1 - ratio) * halfHeight
      svgY = centerY - (ratio * (plotHeight / 2 - 12) + 12);
    } else {
      // If positive but filtered out by anti-noise gate, position near baseline centerline (chartY ~ 46)
      if (velocityPercent > 0) {
        chartY = 46;
        svgY = centerY + 14;
      } else {
        // Declining or flat
        const ratio = Math.min(1, Math.max(0, Math.abs(velocityPercent) / 100));
        chartY = 48 - ratio * 43; // 48 down to 5
        svgY = centerY + (ratio * (plotHeight / 2 - 12) + 12);
      }
    }

    const cat = getCategoryForEntity(entity.name);
    const point: RadarEntityPoint = {
      id: entity.id,
      name: entity.name,
      slug: topicSlug(entity.name),
      type: entity.type,
      category: {
        slug: cat.slug,
        label: cat.title,
      },
      quadrant,
      quadrantLabel: QUADRANT_LABELS[quadrant].title,
      daysOfHistory: sorted.length,
      totalMentions,
      averageDailyMentions,
      latestMentions: latest.mention_count,
      velocityPercent,
      storyCount: entity.storyCount ?? 0,
      chartX: Number(chartX.toFixed(1)),
      chartY: Number(chartY.toFixed(1)),
      svgX: Number(svgX.toFixed(1)),
      svgY: Number(svgY.toFixed(1)),
    };

    plottedEntities.push(point);
    quadrants[quadrant].push(point);
  }

  // Sort each quadrant by volume descending
  for (const key of Object.keys(quadrants) as RadarQuadrant[]) {
    quadrants[key].sort((a, b) => b.averageDailyMentions - a.averageDailyMentions);
  }

  return {
    totalTracked: entities.length,
    eligibleCount: plottedEntities.length,
    excludedCount: excludedEntities.length,
    plottedEntities,
    excludedEntities,
    quadrants,
    viewBoxWidth,
    viewBoxHeight,
    volumeThreshold,
    velocityThreshold: 0,
  };
}

/**
 * Server data fetcher for the Developer Pulse Radar page.
 */
export async function getPulseRadarData(): Promise<RadarDataset> {
  const entities = await db.entity.findMany({
    include: {
      metric_snapshots: {
        orderBy: { snapshot_at: 'asc' },
      },
      stories: { select: { story_id: true } },
    },
    orderBy: { name: 'asc' },
  });

  return buildRadarDataset(
    entities.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      storyCount: e.stories.length,
      metric_snapshots: e.metric_snapshots,
    }))
  );
}
