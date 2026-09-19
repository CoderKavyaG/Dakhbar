import { db } from '../src/lib/db';

async function main() {
  const [extensions, counts, sizes, ambiguous] = await Promise.all([
    db.$queryRaw<{ extname: string }[]>`SELECT extname FROM pg_extension WHERE extname IN ('vector', 'pg_trgm') ORDER BY extname`,
    Promise.all([db.entity.count(), db.story.count(), db.storyDocument.count(), db.storyEntity.count()]),
    db.$queryRaw<{ size: bigint; stories: bigint }[]>`
      SELECT COUNT(*)::bigint AS stories, size
      FROM (SELECT story_id, COUNT(*)::bigint AS size FROM "StoryDocument" GROUP BY story_id) groups
      GROUP BY size ORDER BY size DESC
    `,
    db.story.count({ where: { status: 'review_needed' } }),
  ]);
  console.log(JSON.stringify({
    extensions, entities: counts[0], stories: counts[1], memberships: counts[2], storyEntities: counts[3], ambiguous,
    sizeDistribution: sizes.map(row => ({ size: Number(row.size), stories: Number(row.stories) })),
  }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
