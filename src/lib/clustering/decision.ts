export const MERGE_THRESHOLD = 0.9;
export const POSSIBLY_RELATED_THRESHOLD = 0.7;

export type Candidate = { storyId: string; similarity: number; sharedEntityCount: number };
export type ClusterDecision =
  | { kind: 'merge'; storyId: string; similarity: number }
  | { kind: 'possibly-related'; storyId: string; similarity: number }
  | { kind: 'new' };

export function decideCluster(candidates: Candidate[]): ClusterDecision {
  const best = candidates.filter(candidate => candidate.sharedEntityCount > 0).sort((left, right) => right.similarity - left.similarity)[0];
  if (!best || best.similarity < POSSIBLY_RELATED_THRESHOLD) return { kind: 'new' };
  if (best.similarity >= MERGE_THRESHOLD) return { kind: 'merge', storyId: best.storyId, similarity: best.similarity };
  return { kind: 'possibly-related', storyId: best.storyId, similarity: best.similarity };
}

export function calculateSignificance(input: { documentCount: number; distinctSourceCount: number; ageHours: number }) {
  const recencyDecay = Math.exp(-Math.max(0, input.ageHours) / 36);
  return Number(((input.distinctSourceCount * 2 + input.documentCount) * recencyDecay).toFixed(6));
}
