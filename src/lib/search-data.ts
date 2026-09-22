import { Prisma } from '@prisma/client';
import { db } from './db';
import { extractEntityIds } from './clustering/entities';
import { createEmbedding, toVectorLiteral } from './clustering/embedding';
import { fuseRankedStoryDocuments, planSearchQuery, type RankedEvidenceDocument, type SearchIntent } from './retrieval';


const storyInclude = {
  entities: { include: { entity: true } },
  documents: {
    orderBy: [{ is_primary: 'desc' as const }, { created_at: 'asc' as const }],
    include: { raw_document: { select: { url: true, content: true, og_description: true, og_image_url: true } } },
  },
};

export async function searchStories(query: string) {
  const q = query.trim().slice(0, 200);
  if (!q) return { intent: null, entityMatches: [], stories: [] };
  const dictionary = await db.entity.findMany({ select: { id: true, name: true, aliases: true, type: true } });
  const plan = planSearchQuery(q, dictionary, new Date());
  const exactIds = extractEntityIds(q, null, dictionary);
  const fuzzyMatches = await db.$queryRaw<{ id: string; name: string; type: string; score: number }[]>`
    SELECT e.id, e.name, e.type::text,
      GREATEST(similarity(e.name, ${q}), COALESCE((SELECT MAX(similarity(alias, ${q})) FROM unnest(e.aliases) AS alias), 0))::float8 AS score
    FROM "Entity" e
    WHERE similarity(e.name, ${q}) > 0.2
       OR EXISTS (SELECT 1 FROM unnest(e.aliases) AS alias WHERE similarity(alias, ${q}) > 0.2)
    ORDER BY score DESC, e.name ASC
    LIMIT 5
  `;
  const exactMatches = dictionary.filter(entity => exactIds.includes(entity.id)).map(entity => ({ id: entity.id, name: entity.name, type: String(entity.type), score: 1 }));
  const entityMatches = exactMatches.length ? exactMatches : fuzzyMatches;
  const fuzzyNavigational = !exactMatches.length && fuzzyMatches[0]?.score >= 0.35;
  const intent: SearchIntent = fuzzyNavigational && plan.intent === 'informational' ? 'navigational' : plan.intent;

  if (intent === 'navigational') {
    const entityIds = exactMatches.length ? exactMatches.map(entity => entity.id) : fuzzyMatches[0] ? [fuzzyMatches[0].id] : [];
    const stories = await db.story.findMany({
      where: { entities: { some: { entity_id: { in: entityIds } } } },
      orderBy: [{ significance_score: 'desc' }, { updated_at: 'desc' }],
      take: 30,
      include: storyInclude,
    });
    return { intent, entityMatches, stories };
  }

  const lexicalQuery = plan.retrievalQuery;
  const queryVector = toVectorLiteral(createEmbedding(lexicalQuery));
  const entityFilter = plan.entityIds.length
    ? Prisma.sql`AND EXISTS (SELECT 1 FROM "StoryEntity" se WHERE se.story_id = d.story_id AND se.entity_id IN (${Prisma.join(plan.entityIds)}))`
    : Prisma.empty;
  const dateFilter = plan.temporal
    ? Prisma.sql`AND d.published_at >= ${plan.temporal.start} AND d.published_at <= ${plan.temporal.end}`
    : Prisma.empty;
  const documents = Prisma.sql`
    SELECT rd.id AS document_id, sd.story_id, rd.published_at, rd.embedding,
      (setweight(to_tsvector('english', COALESCE(rd.title, '')), 'A') ||
       setweight(to_tsvector('english', COALESCE(rd.content, rd.og_description, '')), 'B')) AS search_vector
    FROM "RawDocument" rd JOIN "StoryDocument" sd ON sd.raw_document_id = rd.id
  `;
  const [lexical, vector] = await Promise.all([
    db.$queryRaw<RankedEvidenceDocument[]>(Prisma.sql`
      WITH d AS (${documents})
      SELECT d.document_id, d.story_id,
        row_number() OVER (ORDER BY ts_rank_cd(d.search_vector, websearch_to_tsquery('english', ${lexicalQuery})) DESC, d.published_at DESC)::int AS position
      FROM d
      WHERE d.search_vector @@ websearch_to_tsquery('english', ${lexicalQuery}) ${dateFilter} ${entityFilter}
      ORDER BY ts_rank_cd(d.search_vector, websearch_to_tsquery('english', ${lexicalQuery})) DESC, d.published_at DESC
      LIMIT 100
    `),
    db.$queryRaw<RankedEvidenceDocument[]>(Prisma.sql`
      WITH d AS (${documents})
      SELECT d.document_id, d.story_id,
        row_number() OVER (ORDER BY d.embedding <=> ${queryVector}::vector)::int AS position
      FROM d
      WHERE d.embedding IS NOT NULL ${dateFilter} ${entityFilter}
      ORDER BY d.embedding <=> ${queryVector}::vector
      LIMIT 100
    `),
  ]);
  const ranked = fuseRankedStoryDocuments(lexical, vector);
  const hydrated = await db.story.findMany({ where: { id: { in: ranked.map(story => story.id) } }, include: storyInclude });
  const byId = new Map(hydrated.map(story => [story.id, story]));
  return {
    intent,
    entityMatches,
    temporal: plan.temporal?.label ?? null,
    stories: ranked.flatMap(story => { const detail = byId.get(story.id); return detail ? [detail] : []; }),
  };
}
