export const MERGE_THRESHOLD = 0.9;
export const POSSIBLY_RELATED_THRESHOLD = 0.7;
export const TITLE_SIMILARITY_THRESHOLD = 0.45;
export const TITLE_ENTITY_OVERLAP_FLOOR = 2;

export type Candidate = { storyId: string; similarity: number; sharedEntityCount: number; titleSimilarity?: number };
export type ClusterDecision =
  | { kind: 'merge'; storyId: string; similarity: number }
  | { kind: 'possibly-related'; storyId: string; similarity: number }
  | { kind: 'new' };

export function decideCluster(candidates: Candidate[]): ClusterDecision {
  const eligible = candidates.filter(candidate => candidate.sharedEntityCount > 0);
  const directMerge = eligible
    .filter(candidate => candidate.similarity >= MERGE_THRESHOLD)
    .sort((left, right) => right.similarity - left.similarity)[0];
  if (directMerge) return { kind: 'merge', storyId: directMerge.storyId, similarity: directMerge.similarity };
  const titleMerge = eligible
    .filter(candidate => candidate.sharedEntityCount >= TITLE_ENTITY_OVERLAP_FLOOR && (candidate.titleSimilarity ?? 0) >= TITLE_SIMILARITY_THRESHOLD)
    .sort((left, right) => (right.titleSimilarity ?? 0) - (left.titleSimilarity ?? 0) || right.similarity - left.similarity)[0];
  if (titleMerge) return { kind: 'merge', storyId: titleMerge.storyId, similarity: titleMerge.similarity };
  const best = eligible.sort((left, right) => right.similarity - left.similarity)[0];
  if (!best || best.similarity < POSSIBLY_RELATED_THRESHOLD) return { kind: 'new' };
  return { kind: 'possibly-related', storyId: best.storyId, similarity: best.similarity };
}

const TITLE_STOP_WORDS = new Set(['a', 'an', 'and', 'are', 'as', 'at', 'by', 'for', 'from', 'in', 'made', 'of', 'on', 'or', 'says', 'the', 'to', 'with']);

function titleTokens(value: string) {
  return new Set(value.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim().split(/\s+/).filter(token => token.length > 1 && !TITLE_STOP_WORDS.has(token)));
}

export function titleSimilarity(left: string, right: string) {
  const leftTokens = titleTokens(left);
  const rightTokens = titleTokens(right);
  if (!leftTokens.size || !rightTokens.size) return 0;
  let shared = 0;
  for (const token of leftTokens) if (rightTokens.has(token)) shared++;
  return (2 * shared) / (leftTokens.size + rightTokens.size);
}

export function bestTitleSimilarity(title: string, candidateTitles: string[]) {
  return candidateTitles.reduce((best, candidate) => Math.max(best, titleSimilarity(title, candidate)), 0);
}
export function calculateSignificance(input: { documentCount: number; distinctSourceCount: number; ageHours: number }) {
  const recencyDecay = Math.exp(-Math.max(0, input.ageHours) / 36);
  const corroborationWeight = Math.pow(Math.max(1, input.distinctSourceCount), 1.5) * 4;
  return Number(((corroborationWeight + input.documentCount) * recencyDecay).toFixed(6));
}
