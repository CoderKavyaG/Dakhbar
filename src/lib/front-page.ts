import { db } from './db';

export const FRONT_PAGE_LIMIT = 18;

export function selectEligibleFrontPageStories<T extends { entities: readonly unknown[] }>(
  stories: T[],
  limit = FRONT_PAGE_LIMIT,
) {
  return stories.filter(story => story.entities.length > 0).slice(0, limit);
}

export async function getFrontPageStories(hours = 48) {
  const stories = await db.story.findMany({
    where: {
      updated_at: { gte: new Date(Date.now() - hours * 3600000) },
      entities: { some: {} },
    },
    orderBy: [{ significance_score: 'desc' }, { updated_at: 'desc' }],
    take: FRONT_PAGE_LIMIT,
    include: {
      entities: { include: { entity: true } },
      documents: {
        orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
        include: { raw_document: { include: { source: true } } },
      },
    },
  });
  return selectEligibleFrontPageStories(stories);
}

export function issueNumber(date = new Date()) {
  const epoch = Date.UTC(2026, 0, 1);
  return Math.max(1, Math.floor((Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) - epoch) / 86400000) + 1);
}
