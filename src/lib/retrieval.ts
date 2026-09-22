import { extractEntityIds, type EntityDictionaryEntry } from './clustering/entities';

export type SearchIntent = 'navigational' | 'informational' | 'research-question';
export type TemporalWindow = { start: Date; end: Date; label: string };
export type QueryPlan = { intent: SearchIntent; entityIds: string[]; temporal: TemporalWindow | null; retrievalQuery: string };
type RankedItem = { id: string; rank: number };

const DAY = 86_400_000;
const QUESTION_WORDS = /\b(?:why|how|what|when|where|who|which)\b/i;

export function parseTemporalWindow(query: string, now = new Date()): TemporalWindow | null {
  const normalized = query.toLocaleLowerCase('en-US');
  const end = new Date(now);
  if (/\b(?:(?:in\s+)?the\s+)?last\s+24\s+hours?\b|\bpast\s+24\s+hours?\b/.test(normalized)) {
    return { start: new Date(end.getTime() - DAY), end, label: 'last 24 hours' };
  }
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (/\btoday\b/.test(normalized)) return { start: today, end, label: 'today' };
  if (/\bthis\s+week\b/.test(normalized)) {
    const weekday = today.getUTCDay();
    const mondayOffset = (weekday + 6) % 7;
    return { start: new Date(today.getTime() - mondayOffset * DAY), end, label: 'this week' };
  }
  if (/\bsince\s+monday\b/.test(normalized)) {
    const weekday = today.getUTCDay();
    return { start: new Date(today.getTime() - ((weekday + 6) % 7) * DAY), end, label: 'since Monday' };
  }
  return null;
}

function aliasRegex(alias: string) {
  const escaped = alias.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp('(?<![\\p{L}\\p{N}_])' + escaped + '(?![\\p{L}\\p{N}_])', 'giu');
}

export function planSearchQuery(query: string, entities: EntityDictionaryEntry[], now = new Date()): QueryPlan {
  const trimmed = query.trim().slice(0, 200);
  const entityIds = extractEntityIds(trimmed, null, entities);
  const temporal = parseTemporalWindow(trimmed, now);
  const question = /\?\s*$/.test(trimmed) || QUESTION_WORDS.test(trimmed);
  const intent: SearchIntent = question || (entityIds.length > 0 && temporal !== null)
    ? 'research-question'
    : entityIds.length > 0 ? 'navigational' : 'informational';
  let retrievalQuery = trimmed;
  for (const phrase of [/\b(?:(?:in\s+)?the\s+)?last\s+24\s+hours?\b/gi, /\bpast\s+24\s+hours?\b/gi, /\btoday\b/gi, /\bthis\s+week\b/gi, /\bsince\s+monday\b/gi]) retrievalQuery = retrievalQuery.replace(phrase, ' ');
  for (const id of entityIds) {
    const entity = entities.find(candidate => candidate.id === id);
    if (!entity) continue;
    for (const alias of [entity.name, ...entity.aliases]) if (alias.trim()) retrievalQuery = retrievalQuery.replace(aliasRegex(alias), ' ');
  }
  retrievalQuery = retrievalQuery.replace(/\s+/g, ' ').replace(/^[\s,:;?!-]+|[\s,:;?!-]+$/g, '').trim() || trimmed;
  return { intent, entityIds, temporal, retrievalQuery };
}

export function reciprocalRankFusion(lists: RankedItem[][], k = 60) {
  if (!Number.isFinite(k) || k <= 0) throw new Error('RRF k must be positive');
  const scores = new Map<string, number>();
  for (const list of lists) for (const item of list) {
    if (!Number.isSafeInteger(item.rank) || item.rank < 1) continue;
    scores.set(item.id, (scores.get(item.id) ?? 0) + 1 / (k + item.rank));
  }
  return [...scores].map(([id, score]) => ({ id, score }))
    .sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}


export type RankedEvidenceDocument = { document_id: string; story_id: string; position: number };
export function fuseRankedStoryDocuments(lexical: RankedEvidenceDocument[], vector: RankedEvidenceDocument[], k = 60) {
  const documentScores = reciprocalRankFusion([
    lexical.map(({ document_id, position }) => ({ id: document_id, rank: position })),
    vector.map(({ document_id, position }) => ({ id: document_id, rank: position })),
  ], k);
  const storyForDocument = new Map([...lexical, ...vector].map(row => [row.document_id, row.story_id]));
  const storyScores = new Map<string, number>();
  for (const item of documentScores) {
    const storyId = storyForDocument.get(item.id);
    if (storyId) storyScores.set(storyId, Math.max(storyScores.get(storyId) ?? 0, item.score));
  }
  return [...storyScores].map(([id, score]) => ({ id, score })).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
}
