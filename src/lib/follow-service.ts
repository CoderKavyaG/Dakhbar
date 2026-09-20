export interface FollowStore {
  getFollowingEntityIds(userId: string): Promise<string[]>;
  followEntities(userId: string, entityIds: string[]): Promise<void>;
  unfollowEntities(userId: string, entityIds: string[]): Promise<void>;
}

export type FollowToggleResult = { following: boolean; entityIds: string[] };

export async function toggleFollowing(
  store: FollowStore,
  userId: string,
  requestedEntityIds: readonly string[],
): Promise<FollowToggleResult> {
  const entityIds = [...new Set(requestedEntityIds.filter(Boolean))];
  if (!entityIds.length) return { following: false, entityIds };
  const current = new Set(await store.getFollowingEntityIds(userId));
  const allFollowed = entityIds.every(id => current.has(id));
  if (allFollowed) {
    await store.unfollowEntities(userId, entityIds);
    return { following: false, entityIds };
  }
  const missing = entityIds.filter(id => !current.has(id));
  await store.followEntities(userId, missing);
  return { following: true, entityIds };
}

export function followsAll(existingEntityIds: readonly string[], requestedEntityIds: readonly string[]) {
  if (!requestedEntityIds.length) return false;
  const existing = new Set(existingEntityIds);
  return requestedEntityIds.every(id => existing.has(id));
}
