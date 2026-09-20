import type { Prisma } from '@prisma/client';
import { db } from './db';
import { briefSince, briefStoryWhere } from './brief';
import { topicSlug } from './topic-slug';

export const readerStoryInclude = {
  entities: { include: { entity: true } },
  documents: {
    orderBy: [{ is_primary: 'desc' as const }, { created_at: 'asc' as const }],
    include: { raw_document: { select: { url: true, content: true, og_description: true, og_image_url: true } } },
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

export async function getBrief(userId: string, now = new Date()) {
  const { entityIds, since } = await getBriefWindow(userId, now);
  const stories = entityIds.length ? await db.story.findMany({
    where: briefStoryWhere(entityIds, since),
    orderBy: [{ significance_score: 'desc' }, { updated_at: 'desc' }],
    take: 30,
    include: readerStoryInclude,
  }) : [];
  await db.userVisit.upsert({
    where: { user_id: userId },
    update: { last_seen_at: now },
    create: { user_id: userId, last_seen_at: now },
  });
  return { entityIds, stories, since, visitedAt: now };
}

export async function getTopicBySlug(slug: string) {
  const entities = await db.entity.findMany({
    select: { id: true, name: true, type: true },
    orderBy: { name: 'asc' },
  });
  const entity = entities.find(item => topicSlug(item.name) === slug.toLowerCase());
  if (!entity) return null;
  const stories = await db.story.findMany({
    where: { entities: { some: { entity_id: entity.id } } },
    orderBy: [{ significance_score: 'desc' }, { updated_at: 'desc' }],
    take: 40,
    include: readerStoryInclude,
  });
  return { entity, stories, storyCount: await db.story.count({ where: { entities: { some: { entity_id: entity.id } } } }) };
}

export async function getPopularEntities(limit = 8) {
  return db.entity.findMany({
    orderBy: { stories: { _count: 'desc' } },
    take: limit,
    select: { id: true, name: true, type: true, _count: { select: { stories: true } } },
  });
}

export const prismaFollowStore = {
  async getFollowingEntityIds(userId: string) {
    return getFollowingEntityIds(userId);
  },
  async followEntities(userId: string, entityIds: string[]) {
    if (!entityIds.length) return;
    await db.following.createMany({ data: entityIds.map(entity_id => ({ user_id: userId, entity_id })), skipDuplicates: true });
  },
  async unfollowEntities(userId: string, entityIds: string[]) {
    await db.following.deleteMany({ where: { user_id: userId, entity_id: { in: entityIds } } });
  },
};
