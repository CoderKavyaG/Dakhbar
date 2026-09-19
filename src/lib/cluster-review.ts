import { db } from './db';

export async function getClusterReviewData() {
  const [stories, totals] = await Promise.all([
    db.story.findMany({
      orderBy: [{ updated_at: 'desc' }, { significance_score: 'desc' }],
      take: 100,
      include: {
        entities: { include: { entity: true } },
        possibly_related_to: { select: { id: true, title: true } },
        documents: {
          orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }],
          include: { raw_document: { include: { source: true } } },
        },
      },
    }),
    Promise.all([
      db.story.count(),
      db.story.count({ where: { status: 'review_needed' } }),
      db.storyDocument.count(),
    ]),
  ]);
  stories.sort((left, right) => Number(right.status === 'review_needed') - Number(left.status === 'review_needed'));
  return { stories, totals: { stories: totals[0], reviewNeeded: totals[1], memberships: totals[2] } };
}
