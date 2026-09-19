import { db } from '../db';
import { calculateSignificance, decideCluster, type Candidate } from './decision';
import { createEmbedding, cosineSimilarity, parseVector, toVectorLiteral } from './embedding';
import { extractEntityIds } from './entities';

type StoredEmbedding = { embedding: string | null };

async function loadOrCreateEmbedding(document: { id: string; title: string; content: string | null }) {
  const rows = await db.$queryRaw<StoredEmbedding[]>`
    SELECT embedding::text AS embedding FROM "RawDocument" WHERE id = ${document.id}
  `;
  if (rows[0]?.embedding) return parseVector(rows[0].embedding);
  const vector = createEmbedding(document.title + '\n' + (document.content ?? ''));
  const literal = toVectorLiteral(vector);
  await db.$executeRaw`UPDATE "RawDocument" SET embedding = ${literal}::vector WHERE id = ${document.id}`;
  return vector;
}

async function candidateScores(vector: number[], entityIds: string[], publishedAt: Date): Promise<Candidate[]> {
  if (!entityIds.length) return [];
  const lower = new Date(publishedAt.getTime() - 72 * 60 * 60 * 1000);
  const upper = new Date(publishedAt.getTime() + 72 * 60 * 60 * 1000);
  const stories = await db.story.findMany({
    where: { updated_at: { gte: lower, lte: upper }, entities: { some: { entity_id: { in: entityIds } } } },
    select: { id: true, entities: { where: { entity_id: { in: entityIds } }, select: { entity_id: true } } },
  });
  return Promise.all(stories.map(async story => {
    const centroidRows = await db.$queryRaw<{ centroid: string | null }[]>`
      SELECT AVG(rd.embedding)::text AS centroid
      FROM "StoryDocument" sd
      JOIN "RawDocument" rd ON rd.id = sd.raw_document_id
      WHERE sd.story_id = ${story.id} AND rd.embedding IS NOT NULL
    `;
    const centroid = centroidRows[0]?.centroid;
    return { storyId: story.id, similarity: centroid ? cosineSimilarity(vector, parseVector(centroid)) : 0, sharedEntityCount: story.entities.length };
  }));
}

async function createStory(
  document: { id: string; title: string; published_at: Date },
  entityIds: string[],
  possiblyRelatedToId?: string,
  relationshipScore = 1,
) {
  return db.story.create({
    data: {
      title: document.title,
      status: possiblyRelatedToId ? 'review_needed' : 'active',
      possibly_related_to_id: possiblyRelatedToId,
      created_at: document.published_at,
      updated_at: document.published_at,
      documents: { create: { raw_document_id: document.id, similarity_score: relationshipScore, is_primary: true } },
      entities: { create: entityIds.map(entity_id => ({ entity_id })) },
    },
    select: { id: true },
  });
}

async function mergeIntoStory(storyId: string, document: { id: string; published_at: Date }, entityIds: string[], similarity: number) {
  await db.$transaction(async tx => {
    await tx.storyDocument.create({ data: { story_id: storyId, raw_document_id: document.id, similarity_score: similarity, is_primary: false } });
    if (entityIds.length) await tx.storyEntity.createMany({ data: entityIds.map(entity_id => ({ story_id: storyId, entity_id })), skipDuplicates: true });
    await tx.$executeRaw`UPDATE "Story" SET updated_at = GREATEST(updated_at, ${document.published_at}) WHERE id = ${storyId}`;
  });
}

export async function refreshSignificance(storyIds?: string[], now = new Date()) {
  const stories = await db.story.findMany({
    where: storyIds?.length ? { id: { in: storyIds } } : undefined,
    select: { id: true, created_at: true, documents: { select: { raw_document: { select: { source_id: true, published_at: true } } } } },
  });
  for (const story of stories) {
    const latest = story.documents.reduce((date, member) => member.raw_document.published_at > date ? member.raw_document.published_at : date, story.created_at);
    const score = calculateSignificance({
      documentCount: story.documents.length,
      distinctSourceCount: new Set(story.documents.map(member => member.raw_document.source_id)).size,
      ageHours: (now.getTime() - latest.getTime()) / 3600000,
    });
    await db.$executeRaw`UPDATE "Story" SET significance_score = ${score} WHERE id = ${story.id}`;
  }
}

export async function processUnclustered(limit = 1000) {
  const entities = await db.entity.findMany({ select: { id: true, name: true, aliases: true } });
  if (!entities.length) throw new Error('Entity seed is empty; run npm run seed:entities');
  const documents = await db.rawDocument.findMany({
    where: { story_documents: { none: {} } },
    orderBy: [{ published_at: 'asc' }, { id: 'asc' }],
    take: limit,
    select: { id: true, title: true, content: true, published_at: true },
  });
  const summary = { processed: 0, merged: 0, possiblyRelated: 0, newStories: 0 };
  const touched = new Set<string>();
  for (const document of documents) {
    const vector = await loadOrCreateEmbedding(document);
    const entityIds = extractEntityIds(document.title, document.content, entities);
    const candidates = await candidateScores(vector, entityIds, document.published_at);
    const decision = decideCluster(candidates);
    if (decision.kind === 'merge') {
      await mergeIntoStory(decision.storyId, document, entityIds, decision.similarity);
      touched.add(decision.storyId);
      summary.merged++;
    } else {
      const story = await createStory(document, entityIds, decision.kind === 'possibly-related' ? decision.storyId : undefined, decision.kind === 'possibly-related' ? decision.similarity : 1);
      touched.add(story.id);
      if (decision.kind === 'possibly-related') summary.possiblyRelated++;
      else summary.newStories++;
    }
    summary.processed++;
  }
  await refreshSignificance([...touched]);
  return summary;
}
