export type TrendRange = '24h' | '7d' | '30d';

export type MetricSnapshotData = {
  snapshot_at: Date | string;
  mention_count: number;
  unique_source_count?: number;
  discussion_count?: number;
  mention_velocity?: number | null;
};

export type TrendPoint = {
  x: number;
  y: number;
  date: string;
  formattedDate: string;
  mentions: number;
  velocity: number | null;
  sources: number;
};

export type TrendComputation = {
  hasEnoughData: boolean;
  emptyReason?: string;
  range: TrendRange;
  isPartial: boolean;
  rangeLabel: string;
  periodDescription: string;
  startDate: string | null;
  endDate: string | null;
  daysAvailable: number;
  currentMentions: number;
  currentVelocity: number | null;
  peakMentions: number;
  totalMentions: number;
  points: TrendPoint[];
  svgPath: string;
  svgArea: string;
};

export function formatMonthDay(dateInput: Date | string): string {
  const d = typeof dateInput === 'string' ? new Date(dateInput) : dateInput;
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sept', 'Oct', 'Nov', 'Dec'];
  return `${monthNames[d.getUTCMonth()]} ${d.getUTCDate()}`;
}

export function filterSnapshotsForRange(
  snapshots: MetricSnapshotData[],
  range: TrendRange
): MetricSnapshotData[] {
  if (!snapshots.length) return [];
  // Sort chronologically ascending
  const sorted = [...snapshots].sort(
    (a, b) => new Date(a.snapshot_at).getTime() - new Date(b.snapshot_at).getTime()
  );

  if (range === '24h') {
    // 24h shows the last 2 consecutive daily checkpoints for day-over-day comparison
    return sorted.slice(-2);
  }
  if (range === '7d') {
    return sorted.slice(-7);
  }
  // 30d: up to 30 daily snapshots
  return sorted.slice(-30);
}

export function computeTrendStats(
  allSnapshots: MetricSnapshotData[],
  range: TrendRange = '7d',
  viewBoxWidth = 400,
  viewBoxHeight = 120
): TrendComputation {
  const filtered = filterSnapshotsForRange(allSnapshots, range);

  if (filtered.length < 2) {
    const isSingle = filtered.length === 1;
    return {
      hasEnoughData: false,
      emptyReason: isSingle
        ? 'Only 1 daily snapshot recorded so far. Trend charts require at least 2 days of history.'
        : 'No historical metric snapshots available yet for this topic.',
      range,
      isPartial: true,
      rangeLabel: 'Insufficient data',
      periodDescription: 'Tracking in progress',
      startDate: filtered[0] ? new Date(filtered[0].snapshot_at).toISOString().slice(0, 10) : null,
      endDate: filtered[0] ? new Date(filtered[0].snapshot_at).toISOString().slice(0, 10) : null,
      daysAvailable: filtered.length,
      currentMentions: filtered[0]?.mention_count ?? 0,
      currentVelocity: filtered[0]?.mention_velocity ?? null,
      peakMentions: filtered[0]?.mention_count ?? 0,
      totalMentions: filtered[0]?.mention_count ?? 0,
      points: [],
      svgPath: '',
      svgArea: '',
    };
  }

  const daysAvailable = filtered.length;
  const firstDate = new Date(filtered[0].snapshot_at);
  const lastDate = new Date(filtered[filtered.length - 1].snapshot_at);
  const startDateStr = formatMonthDay(firstDate);
  const endDateStr = formatMonthDay(lastDate);

  let isPartial = false;
  let rangeLabel = '';
  let periodDescription = '';

  if (range === '30d') {
    if (daysAvailable < 30) {
      isPartial = true;
      rangeLabel = `Since ${startDateStr} (${daysAvailable} days of history)`;
      periodDescription = `${startDateStr} – ${endDateStr} (${daysAvailable} days recorded)`;
    } else {
      isPartial = false;
      rangeLabel = 'Last 30 days';
      periodDescription = `${startDateStr} – ${endDateStr} (30-day window)`;
    }
  } else if (range === '7d') {
    if (daysAvailable < 7) {
      isPartial = true;
      rangeLabel = `Since ${startDateStr} (${daysAvailable} days of history)`;
      periodDescription = `${startDateStr} – ${endDateStr} (${daysAvailable} days recorded)`;
    } else {
      isPartial = false;
      rangeLabel = 'Last 7 days';
      periodDescription = `${startDateStr} – ${endDateStr} (7-day window)`;
    }
  } else {
    // 24h
    isPartial = false;
    rangeLabel = 'Last 24 hours';
    periodDescription = `${startDateStr} – ${endDateStr} (24-hour change)`;
  }

  const isCompact = viewBoxWidth <= 120;
  const paddingLeft = isCompact ? 2 : 24;
  const paddingRight = isCompact ? 2 : 24;
  const paddingTop = isCompact ? 2 : 16;
  const paddingBottom = isCompact ? 2 : 28;
  const plotWidth = Math.max(1, viewBoxWidth - paddingLeft - paddingRight);
  const plotHeight = Math.max(1, viewBoxHeight - paddingTop - paddingBottom);
  const yBase = viewBoxHeight - paddingBottom;

  const mentionCounts = filtered.map(s => s.mention_count);
  const peakMentions = Math.max(1, ...mentionCounts);
  const totalMentions = mentionCounts.reduce((sum, v) => sum + v, 0);

  const points: TrendPoint[] = filtered.map((s, index) => {
    const x = paddingLeft + (index / (filtered.length - 1)) * plotWidth;
    const yRatio = s.mention_count / peakMentions;
    const y = paddingTop + (1 - yRatio) * plotHeight;
    return {
      x: Number(x.toFixed(1)),
      y: Number(y.toFixed(1)),
      date: new Date(s.snapshot_at).toISOString().slice(0, 10),
      formattedDate: formatMonthDay(s.snapshot_at),
      mentions: s.mention_count,
      velocity: s.mention_velocity ?? null,
      sources: s.unique_source_count ?? 1,
    };
  });

  const pathPoints = points.map(p => `${p.x},${p.y}`).join(' ');
  const areaPoints = `${points[0].x},${yBase} ` + pathPoints + ` ${points[points.length - 1].x},${yBase}`;

  const latest = filtered[filtered.length - 1];

  return {
    hasEnoughData: true,
    range,
    isPartial,
    rangeLabel,
    periodDescription,
    startDate: startDateStr,
    endDate: endDateStr,
    daysAvailable,
    currentMentions: latest.mention_count,
    currentVelocity: latest.mention_velocity ?? null,
    peakMentions,
    totalMentions,
    points,
    svgPath: pathPoints,
    svgArea: areaPoints,
  };
}

export type CategoryEntityMetric = {
  id: string;
  name: string;
  type: string;
  slug: string;
  storyCount: number;
  latestMentions: number;
  previousMentions: number;
  absoluteGain: number;
  latestVelocity: number | null;
  snapshots?: Array<{
    snapshot_at: Date | string;
    mention_count: number;
    mention_velocity?: number | null;
  }>;
};

export type CategoryMoversResult = {
  topGainers: CategoryEntityMetric[];
  topDecliners: CategoryEntityMetric[];
  topByVolume: CategoryEntityMetric[];
};

/**
 * Ranks category entities for movement intelligence, enforcing a minimum absolute
 * volume threshold and ranking by absolute net mention delta first so that low-sample
 * noisy jumps (e.g. 1 -> 4 mentions) cannot outrank high-volume real trends (e.g. 10 -> 25 mentions).
 */
export function rankCategoryMovers(
  entities: CategoryEntityMetric[],
  options: {
    minMentionsThreshold?: number;
    limit?: number;
  } = {}
): CategoryMoversResult {
  const minThreshold = options.minMentionsThreshold ?? 3;
  const limit = options.limit ?? 3;

  // Filter for valid velocity, non-zero previous baseline, and meeting the minimum mention volume
  const eligibleMovers = entities.filter(
    e =>
      e.latestVelocity !== null &&
      e.latestMentions >= minThreshold &&
      e.previousMentions > 0
  );

  // Gainers: prioritize absolute mention gain first to prevent small-sample noise from dominating,
  // then percentage velocity as tie-breaker for equal net gains.
  const topGainers = eligibleMovers
    .filter(e => (e.latestVelocity ?? 0) > 0 && e.absoluteGain > 0)
    .sort((a, b) => {
      if (b.absoluteGain !== a.absoluteGain) {
        return b.absoluteGain - a.absoluteGain;
      }
      return (b.latestVelocity ?? 0) - (a.latestVelocity ?? 0);
    })
    .slice(0, limit);

  // Decliners: prioritize absolute drop first, then negative velocity
  const topDecliners = eligibleMovers
    .filter(e => (e.latestVelocity ?? 0) < 0 && e.absoluteGain < 0)
    .sort((a, b) => {
      if (a.absoluteGain !== b.absoluteGain) {
        return a.absoluteGain - b.absoluteGain; // most negative drop first
      }
      return (a.latestVelocity ?? 0) - (b.latestVelocity ?? 0);
    })
    .slice(0, limit);

  // Top by volume (highest latest daily mentions)
  const topByVolume = [...entities]
    .sort((a, b) => b.latestMentions - a.latestMentions)
    .slice(0, 4);

  return {
    topGainers,
    topDecliners,
    topByVolume,
  };
}

