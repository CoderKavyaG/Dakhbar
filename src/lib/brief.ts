export const FIRST_BRIEF_WINDOW_MS = 24 * 60 * 60 * 1000;

export function briefSince(lastSeenAt: Date | null, now: Date) {
  return lastSeenAt ?? new Date(now.getTime() - FIRST_BRIEF_WINDOW_MS);
}

export function briefSummary(count: number) {
  if (count === 0) return 'No new developments since you were last here.';
  if (count === 1) return '1 development since you were last here.';
  return count + ' developments since you were last here.';
}

export function briefStoryWhere(entityIds: string[], since: Date) {
  return { entities: { some: { entity_id: { in: entityIds } } }, documents: { some: { raw_document: { published_at: { gte: since } } } } };
}
