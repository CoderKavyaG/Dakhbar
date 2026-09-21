export interface BriefSelectionStore<TStory> {
  getFollowingEntityIds(userId: string): Promise<string[]>;
  findStories(entityIds: string[], since: Date): Promise<TStory[]>;
}

export async function selectBriefStories<TStory>(store: BriefSelectionStore<TStory>, userId: string, since: Date) {
  const entityIds = await store.getFollowingEntityIds(userId);
  const stories = entityIds.length ? await store.findStories(entityIds, since) : [];
  return { entityIds, stories, since };
}
