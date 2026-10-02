import { db } from './db';

export const PULSE_DAY_MS = 24 * 60 * 60 * 1000;

export type PulseEntity = { id: string; created_at: Date };
export type PulseDocument = { id: string; published_at: Date; source_id: string; discussion_count: number; entity_ids: string[] };
export type MetricSnapshotInput = {
  entity_id: string;
  snapshot_at: Date;
  mention_count: number;
  unique_source_count: number;
  discussion_count: number;
  mention_velocity: number | null;
};

export function utcDay(value: Date) {
  return new Date(Date.UTC(value.getUTCFullYear(), value.getUTCMonth(), value.getUTCDate()));
}

export function previousCompletedDay(now = new Date()) {
  return new Date(utcDay(now).getTime() - PULSE_DAY_MS);
}

export function mentionVelocity(previous: number, current: number) {
  if (previous <= 0) return null;
  return Number((((current - previous) / previous) * 100).toFixed(1));
}

function daysFrom(first: Date, through: Date) {
  const days: Date[] = [];
  for (let day = utcDay(first); day <= through; day = new Date(day.getTime() + PULSE_DAY_MS)) days.push(day);
  return days;
}

export function buildMetricSnapshots(entities: PulseEntity[], documents: PulseDocument[], through: Date) {
  if (!entities.length || !documents.length) return [] as MetricSnapshotInput[];
  const firstDocumentDay = utcDay(documents.reduce((first, document) => document.published_at < first ? document.published_at : first, documents[0].published_at));
  const snapshots: MetricSnapshotInput[] = [];
  for (const entity of entities) {
    let previousMentions: number | undefined;    for (const snapshotAt of daysFrom(firstDocumentDay, utcDay(through))) {
      const nextDay = new Date(snapshotAt.getTime() + PULSE_DAY_MS);
      const matches = documents.filter(document => document.published_at >= snapshotAt && document.published_at < nextDay && document.entity_ids.includes(entity.id));
      const mentionCount = new Set(matches.map(document => document.id)).size;
      snapshots.push({
        entity_id: entity.id,
        snapshot_at: snapshotAt,
        mention_count: mentionCount,
        unique_source_count: new Set(matches.map(document => document.source_id)).size,
        discussion_count: matches.reduce((sum, document) => sum + document.discussion_count, 0),
        mention_velocity: previousMentions === undefined ? null : mentionVelocity(previousMentions, mentionCount),
      });
      previousMentions = mentionCount;
    }
  }
  return snapshots;
}

function discussionCount(raw: unknown) {
  if (!raw || typeof raw !== 'object') return 0;
  const value = (raw as Record<string, unknown>).descendants;
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

async function loadPulseData() {
  const [entities, documents] = await Promise.all([
    db.entity.findMany({ select: { id: true, created_at: true } }),
    db.rawDocument.findMany({
      select: {
        id: true, published_at: true, source_id: true, raw_json: true,
        story_documents: { select: { story: { select: { entities: { select: { entity_id: true } } } } } },
      },
    }),
  ]);
  return {
    entities,
    documents: documents.map(document => ({
      id: document.id,
      published_at: document.published_at,
      source_id: document.source_id,
      discussion_count: discussionCount(document.raw_json),
      entity_ids: document.story_documents.flatMap(member => member.story.entities.map(entity => entity.entity_id)),
    })),
  };
}

export async function backfillEntityMetricSnapshots(now = new Date()) {
  const through = previousCompletedDay(now);
  const { entities, documents } = await loadPulseData();
  const snapshots = buildMetricSnapshots(entities, documents, through);
  const chunkSize = 50;
  for (let i = 0; i < snapshots.length; i += chunkSize) {
    const chunk = snapshots.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(snapshot =>
        db.entityMetricSnapshot.upsert({
          where: { entity_id_snapshot_at: { entity_id: snapshot.entity_id, snapshot_at: snapshot.snapshot_at } },
          update: snapshot,
          create: snapshot,
        })
      )
    );
  }
  return {
    through,
    entitiesCovered: new Set(snapshots.map(snapshot => snapshot.entity_id)).size,
    snapshotsWritten: snapshots.length,
    firstDocumentAt: documents.length ? documents.reduce((first, document) => document.published_at < first ? document.published_at : first, documents[0].published_at) : null,
  };
}

import { computeTrendStats } from './trend';

export async function computeLatestEntityMetricSnapshots(now = new Date()) {
  return backfillEntityMetricSnapshots(now);
}

export type PulseSidebarItem = {
  entityId: string;
  name: string;
  mentionCount: number;
  uniqueSourceCount: number;
  velocity: number;
  snapshotAt: Date;
  sparkline?: {
    svgPath: string;
    lastPoint?: { x: number; y: number };
  } | null;
};

export function usablePulseItems<T extends { mention_velocity: number | null; mention_count: number; unique_source_count: number }>(items: T[]) {
  return items.filter(item => item.mention_velocity !== null && item.mention_count > 0 && item.unique_source_count > 0);
}

export async function getDeveloperPulse(limit = 5) {
  const latest = await db.entityMetricSnapshot.findFirst({ orderBy: { snapshot_at: 'desc' }, select: { snapshot_at: true } });
  if (!latest) return { snapshotAt: null, items: [] as PulseSidebarItem[] };
  const rows = await db.entityMetricSnapshot.findMany({
    where: { snapshot_at: latest.snapshot_at, mention_velocity: { not: null } },
    include: { entity: { select: { id: true, name: true } } },
    orderBy: [{ mention_velocity: 'desc' }, { mention_count: 'desc' }],
    take: limit * 3,
  });
  const filtered = usablePulseItems(rows).slice(0, limit);
  const entityIds = filtered.map(row => row.entity.id);

  // Fetch recent snapshots to build mini sparklines
  const historical = await db.entityMetricSnapshot.findMany({
    where: { entity_id: { in: entityIds } },
    orderBy: { snapshot_at: 'asc' },
    select: { entity_id: true, snapshot_at: true, mention_count: true, mention_velocity: true },
  });

  const historyByEntity = new Map<string, typeof historical>();
  for (const h of historical) {
    const list = historyByEntity.get(h.entity_id) ?? [];
    list.push(h);
    historyByEntity.set(h.entity_id, list);
  }

  return {
    snapshotAt: latest.snapshot_at,
    items: filtered.map(row => {
      const entityHistory = historyByEntity.get(row.entity.id) ?? [];
      const stats = computeTrendStats(entityHistory, '7d', 48, 18);
      const lastPoint = stats.points.length ? stats.points[stats.points.length - 1] : undefined;
      return {
        entityId: row.entity.id,
        name: row.entity.name,
        mentionCount: row.mention_count,
        uniqueSourceCount: row.unique_source_count,
        velocity: row.mention_velocity!,
        snapshotAt: row.snapshot_at,
        sparkline: stats.svgPath ? {
          svgPath: stats.svgPath,
          lastPoint: lastPoint ? { x: lastPoint.x, y: lastPoint.y } : undefined,
        } : null,
      };
    }),
  };
}

