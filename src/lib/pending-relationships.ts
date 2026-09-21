export type PendingReviewStory = {
  id: string;
  title: string;
  documents: { similarity_score: number }[];
  entities: { entity_id: string; entity: { name: string } }[];
  possibly_related_to: null | {
    id: string;
    title: string;
    entities: { entity_id: string; entity: { name: string } }[];
  };
};

export function buildPendingRelationships(stories: PendingReviewStory[]) {
  return stories.flatMap(story => {
    const candidate = story.possibly_related_to;
    if (!candidate) return [];
    const candidateEntityIds = new Set(candidate.entities.map(item => item.entity_id));
    return [{
      storyId: story.id,
      storyTitle: story.title,
      candidateId: candidate.id,
      candidateTitle: candidate.title,
      similarity: story.documents[0]?.similarity_score ?? 0,
      sharedEntities: story.entities.filter(item => candidateEntityIds.has(item.entity_id)).map(item => item.entity.name),
    }];
  }).sort((left, right) => right.similarity - left.similarity || left.storyTitle.localeCompare(right.storyTitle));
}
