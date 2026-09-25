import { createQueue } from './queue';
import { reusableBrief, type BriefSnapshot } from './brief-snapshot';
import type { Prisma } from '@prisma/client';
import { db } from './db';
import { briefSince, briefStoryWhere } from './brief';
import { selectBriefStories } from './brief-selection';
import { topicSlug } from './topic-slug';

export const readerStoryInclude = {
  entities: { include: { entity: true } },
  documents: {
    orderBy: [{ is_primary: 'desc' as const }, { created_at: 'asc' as const }],
    include: { raw_document: { select: { title: true, url: true, content: true, og_description: true, og_image_url: true, published_at: true } } },
  },
} satisfies Prisma.StoryInclude;

export async function getFollowingEntityIds(userId: string) {
  const rows = await db.following.findMany({ where: { user_id: userId }, select: { entity_id: true } });
  return rows.map(row => row.entity_id);
}

export async function getForYouStories(userId: string) {
  const entityIds = await getFollowingEntityIds(userId);
  if (!entityIds.length) return { entityIds, stories: [] };
  const stories = await db.story.findMany({
    where: { entities: { some: { entity_id: { in: entityIds } } } },
    orderBy: [{ significance_score: 'desc' }, { updated_at: 'desc' }],
    take: 30,
    include: readerStoryInclude,
  });
  return { entityIds, stories };
}

export async function getBriefWindow(userId: string, now = new Date()) {
  const [entityIds, visit] = await Promise.all([
    getFollowingEntityIds(userId),
    db.userVisit.findUnique({ where: { user_id: userId } }),
  ]);
  const since = briefSince(visit?.last_seen_at ?? null, now);
  return { entityIds, since };
}

export async function getBriefNotificationCount(userId: string, now = new Date()) {
  const { entityIds, since } = await getBriefWindow(userId, now);
  return entityIds.length ? db.story.count({ where: briefStoryWhere(entityIds, since) }) : 0;
}

export const prismaBriefSelectionStore = {
  getFollowingEntityIds,
  findStories(entityIds: string[], since: Date) {
    return db.story.findMany({
      where: briefStoryWhere(entityIds, since),
      orderBy: [{ significance_score: 'desc' as const }, { updated_at: 'desc' as const }],
      take: 30,
      include: readerStoryInclude,
    });
  },
};

export function getBriefSelection(userId: string, since: Date) {
  return selectBriefStories(prismaBriefSelectionStore, userId, since);
}

export async function getBrief(userId: string, now = new Date()) {
  const { since } = await getBriefWindow(userId, now);
  const { entityIds, stories } = await getBriefSelection(userId, since);
  const queue = createQueue(true);
  queue.on('error',()=>{});
  try {
    const redis = await queue.client;
    const key = 'dakhbar:reader-brief:' + userId;
    if (stories.length) {
      await redis.set(key, JSON.stringify({entityIds,storyIds:stories.map(s=>s.id),since:since.toISOString(),createdAt:now.toISOString()}),{EX:86400});
    } else {
      const raw = await redis.get(key);
      const snapshot:BriefSnapshot|null = raw ? JSON.parse(raw) : null;
      if (reusableBrief(snapshot,entityIds,now) && snapshot) {
        const prior = await db.story.findMany({where:{id:{in:snapshot.storyIds},entities:{some:{entity_id:{in:entityIds}}}},include:readerStoryInclude});
        prior.sort((a,b)=>snapshot.storyIds.indexOf(a.id)-snapshot.storyIds.indexOf(b.id));
        if (prior.length) return {entityIds,stories:prior,since:new Date(snapshot.since),visitedAt:now,revisited:true};
      }
    }
  } catch { /* A cache outage never blocks the deterministic Brief. */ }
  finally { await queue.close(); }
  return { entityIds, stories, since, visitedAt: now, revisited:false };
}

export async function getTopicBySlug(slug: string) {
  const entities = await db.entity.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { name: 'asc' },
  });
  const entity = entities.find(item => topicSlug(item.name) === slug.toLowerCase());
  if (!entity) return null;
  const [stories, storyCount, snapshots] = await Promise.all([
    db.story.findMany({
      where: { entities: { some: { entity_id: entity.id } } },
      orderBy: [{ significance_score: 'desc' }, { updated_at: 'desc' }],
      take: 40,
      include: readerStoryInclude,
    }),
    db.story.count({ where: { entities: { some: { entity_id: entity.id } } } }),
    db.entityMetricSnapshot.findMany({
      where: { entity_id: entity.id },
      orderBy: { snapshot_at: 'asc' },
      select: {
        snapshot_at: true,
        mention_count: true,
        unique_source_count: true,
        discussion_count: true,
        mention_velocity: true,
      },
    }),
  ]);
  return { entity, stories, storyCount, snapshots };
}

export async function getPopularEntities(limit = 8) {
  return db.entity.findMany({
    orderBy: { stories: { _count: 'desc' } },
    take: limit,
    select: { id: true, name: true, type: true, _count: { select: { stories: true } } },
  });
}

export const prismaFollowStore = {
  async getFollowingEntityIds(userId: string) { return getFollowingEntityIds(userId); },
  async followEntities(userId: string, entityIds: string[]) {
    if (!entityIds.length) return;
    await db.following.createMany({ data: entityIds.map(entity_id => ({ user_id: userId, entity_id })), skipDuplicates: true });
  },
  async unfollowEntities(userId: string, entityIds: string[]) {
    await db.following.deleteMany({ where: { user_id: userId, entity_id: { in: entityIds } } });
  },
};

export async function getTopicsIndexData() {
  const entities = await db.entity.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      _count: { select: { stories: true } },
      metric_snapshots: {
        orderBy: { snapshot_at: 'desc' },
        take: 1,
        select: {
          mention_count: true,
          mention_velocity: true,
        },
      },
    },
  });

  const { getAllCategories, getCategoryForEntity } = await import('./taxonomy');
  const categories = getAllCategories().map(category => {
    const categoryEntities = entities
      .filter(e => getCategoryForEntity(e.name, e.type).slug === category.slug)
      .map(e => ({
        id: e.id,
        name: e.name,
        type: e.type,
        slug: topicSlug(e.name),
        storyCount: e._count.stories,
        latestMentions: e.metric_snapshots[0]?.mention_count ?? 0,
        latestVelocity: e.metric_snapshots[0]?.mention_velocity ?? null,
      }));

    return {
      slug: category.slug,
      title: category.title,
      description: category.description,
      entityCount: categoryEntities.length,
      totalStories: categoryEntities.reduce((sum, e) => sum + e.storyCount, 0),
      entities: categoryEntities,
    };
  });

  return {
    categories,
    totalEntities: entities.length,
  };
}

export async function getCategoryPageData(slug: string) {
  const { getCategoryBySlug, getCategoryForEntity } = await import('./taxonomy');
  const category = getCategoryBySlug(slug);
  if (!category) return null;

  const allEntities = await db.entity.findMany({
    orderBy: { name: 'asc' },
    select: {
      id: true,
      name: true,
      type: true,
      _count: { select: { stories: true } },
      metric_snapshots: {
        orderBy: { snapshot_at: 'desc' },
        take: 7,
        select: {
          snapshot_at: true,
          mention_count: true,
          mention_velocity: true,
        },
      },
    },
  });

  const catEntities = allEntities
    .filter(e => getCategoryForEntity(e.name, e.type).slug === category.slug)
    .map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      slug: topicSlug(e.name),
      storyCount: e._count.stories,
      latestMentions: e.metric_snapshots[0]?.mention_count ?? 0,
      latestVelocity: e.metric_snapshots[0]?.mention_velocity ?? null,
      snapshots: e.metric_snapshots,
    }));

  const entityIds = catEntities.map(e => e.id);

  const [stories, storyCount] = await Promise.all([
    db.story.findMany({
      where: { entities: { some: { entity_id: { in: entityIds } } } },
      orderBy: [{ significance_score: 'desc' }, { updated_at: 'desc' }],
      take: 36,
      include: readerStoryInclude,
    }),
    db.story.count({
      where: { entities: { some: { entity_id: { in: entityIds } } } },
    }),
  ]);

  // Aggregate metrics for sector intelligence
  const totalDailyMentions = catEntities.reduce((acc, e) => acc + e.latestMentions, 0);
  const movers = [...catEntities]
    .filter(e => e.latestVelocity !== null)
    .sort((a, b) => (b.latestVelocity ?? 0) - (a.latestVelocity ?? 0));

  const topGainers = movers.filter(m => (m.latestVelocity ?? 0) > 0).slice(0, 3);
  const topDecliners = [...movers].filter(m => (m.latestVelocity ?? 0) < 0).reverse().slice(0, 3);
  const topByVolume = [...catEntities].sort((a, b) => b.latestMentions - a.latestMentions).slice(0, 4);

  return {
    category,
    entities: catEntities,
    storyCount,
    stories,
    intelligence: {
      totalDailyMentions,
      topGainers,
      topDecliners,
      topByVolume,
    },
  };
}

