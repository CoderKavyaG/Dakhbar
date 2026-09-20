import { test } from 'node:test';
import assert from 'node:assert/strict';
import { followsAll, toggleFollowing, type FollowStore } from '../src/lib/follow-service';

class MemoryFollowStore implements FollowStore {
  private rows = new Map<string, Set<string>>();
  async getFollowingEntityIds(userId: string) { return [...(this.rows.get(userId) ?? new Set())]; }
  async followEntities(userId: string, entityIds: string[]) {
    const current = this.rows.get(userId) ?? new Set<string>();
    entityIds.forEach(id => current.add(id));
    this.rows.set(userId, current);
  }
  async unfollowEntities(userId: string, entityIds: string[]) {
    const current = this.rows.get(userId) ?? new Set<string>();
    entityIds.forEach(id => current.delete(id));
    this.rows.set(userId, current);
  }
}

test('follow state persists when the page reads it again', async () => {
  const store = new MemoryFollowStore();
  const result = await toggleFollowing(store, 'reader_1', ['openai']);
  assert.equal(result.following, true);
  const stateAfterRefresh = await store.getFollowingEntityIds('reader_1');
  assert.equal(followsAll(stateAfterRefresh, ['openai']), true);
});

test('following toggle unfollows an already-followed entity', async () => {
  const store = new MemoryFollowStore();
  await toggleFollowing(store, 'reader_1', ['openai']);
  const result = await toggleFollowing(store, 'reader_1', ['openai']);
  assert.equal(result.following, false);
  assert.deepEqual(await store.getFollowingEntityIds('reader_1'), []);
});

test('story following fills missing entity follows without losing existing ones', async () => {
  const store = new MemoryFollowStore();
  await store.followEntities('reader_1', ['openai']);
  await toggleFollowing(store, 'reader_1', ['openai', 'anthropic', 'google']);
  assert.deepEqual((await store.getFollowingEntityIds('reader_1')).sort(), ['anthropic', 'google', 'openai']);
});
