import { db } from './db';

type SearchResult = {
  id: string;
  title: string;
  significance_score: number;
  updated_at: Date;
  score: number;
};

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
  const entityMatches = await db.$queryRaw<{ id: string; name: string; type: string; score: number }[]>`
    SELECT e.id, e.name, e.type::text,
      GREATEST(
        similarity(e.name, ${q}),
        COALESCE((SELECT MAX(similarity(alias, ${q})) FROM unnest(e.aliases) AS alias), 0)
      )::float8 AS score
    FROM "Entity" e
    WHERE similarity(e.name, ${q}) > 0.2
       OR EXISTS (SELECT 1 FROM unnest(e.aliases) AS alias WHERE similarity(alias, ${q}) > 0.2)
    ORDER BY score DESC, e.name ASC
    LIMIT 5
  `;
  const isNavigational = Boolean(entityMatches[0] && entityMatches[0].score >= 0.35);
  if (isNavigational) {
    const stories = await db.story.findMany({
      where: { entities: { some: { entity_id: entityMatches[0].id } } },
      orderBy: [{ significance_score: 'desc' }, { updated_at: 'desc' }],
      take: 30,
      include: storyInclude,
    });
    return {
      intent: 'navigational' as const,
      entityMatches,
      stories,
    };
  }
  const ranked = await db.$queryRaw<SearchResult[]>`
    WITH story_text AS (
      SELECT s.id, s.title, s.significance_score, s.updated_at,
        setweight(to_tsvector('english', s.title), 'A') ||
        setweight(to_tsvector('english', COALESCE(string_agg(rd.title || ' ' || COALESCE(rd.content, ''), ' '), '')), 'B') AS document
      FROM "Story" s
      JOIN "StoryDocument" sd ON sd.story_id = s.id
      JOIN "RawDocument" rd ON rd.id = sd.raw_document_id
      GROUP BY s.id
    ), ranked AS (
      SELECT id, title, significance_score, updated_at,
        ts_rank_cd(document, websearch_to_tsquery('english', ${q}))::float8 AS lexical_score
      FROM story_text
      WHERE document @@ websearch_to_tsquery('english', ${q})
    )
    SELECT id, title, significance_score, updated_at,
      (lexical_score * 0.85 + EXP(-EXTRACT(EPOCH FROM (NOW() - updated_at)) / 259200.0) * 0.15)::float8 AS score
    FROM ranked
    ORDER BY score DESC, significance_score DESC
    LIMIT 50
  `;
  const hydrated = await db.story.findMany({
    where: { id: { in: ranked.map(story => story.id) } },
    include: storyInclude,
  });
  const byId = new Map(hydrated.map(story => [story.id, story]));
  return {
    intent: 'informational' as const,
    entityMatches,
    stories: ranked.flatMap(story => {
      const detail = byId.get(story.id);
      return detail ? [detail] : [];
    }),
  };
}
