// Consolidated Test Suite: 09-reader-following.test.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FREE_FOLLOW_LIMIT, decideFollowChange } from '../src/lib/follow-entitlement';
import { followsAll, toggleFollowing, type FollowStore } from '../src/lib/follow-service';
import { navigationItems } from '../src/lib/navigation';
import { isReaderProtectedPath, readerRouteStatus } from '../src/lib/reader-access';

// --- Section: reader-access.test.ts ---
{
test('anonymous readers can browse public editorial routes', () => {
  for (const route of ['/', '/search', '/stories/story-1', '/topics/openai', '/methodology', '/pricing']) {
    assert.equal(isReaderProtectedPath(route), false);
    assert.equal(readerRouteStatus(route, null), 200);
  }
});

test('Personal reader routes require a reader session', () => {
  for (const route of ['/saved', '/for-you', '/brief']) {
    assert.equal(isReaderProtectedPath(route), true);
    assert.equal(readerRouteStatus(route, null), 307);
    assert.equal(readerRouteStatus(route, 'user_1'), 200);
  }
});
}

// --- Section: auth-ux.test.ts ---
{
const read = (path: string) => readFile(path, 'utf8');

test('reader sign-in entry points use Clerk modal and replay a pending follow', async () => {
  const [join, follow, css] = await Promise.all([
    read('src/components/join-us-button.tsx'),
    read('src/components/follow-toggle-client.tsx'),
    read('src/app/globals.css'),
  ]);
  assert.match(join, /SignInButton mode="modal"/);
  assert.match(join, />Join us</);
  assert.match(follow, /openSignIn/);
  assert.match(follow, /awaitingSignIn/);
  assert.match(follow, /sessionStorage\.setItem\(PENDING_FOLLOW_KEY/);
  assert.match(follow, /sessionStorage\.removeItem\(PENDING_FOLLOW_KEY/);
  assert.match(follow, /submit\('follow'\)/);
  assert.match(css, /\.cl-modalBackdrop/);
  assert.match(css, /backdrop-filter:\s*blur/);
});

test('signed-out navigation hides personalized routes and Following tab hides its badge on visit', async () => {
  const [header, briefLink] = await Promise.all([
    read('src/components/site-header.tsx'),
    read('src/components/primary-nav.tsx'),
  ]);
  assert.deepEqual(navigationItems(false).map(i => i.href), ['/','/methodology','/pricing']);
  assert.ok(navigationItems(true).some(i => i.href === '/?tab=following'));
  assert.ok(navigationItems(true).some(i => i.href === '/saved'));
  assert.doesNotMatch(header, /href="\/sign-in"/);
  assert.match(briefLink, /briefCount > 0/);
});

test('ordinary story cards expose a follow control for every entity tag', async () => {
  const card = await read('src/components/story-card.tsx');
  assert.match(card, /story\.entities\[0\][\s\S]*<EntityFollowControl/);
  assert.match(card, /story\.entities\.slice\(1\)\.map/);
  assert.doesNotMatch(card, /slice\(1,\s*3\)/);
});

test('header consolidates account into single avatar entry point with zero mascot decoration in dropdown', async () => {
  const [header, accountMenu] = await Promise.all([
    read('src/components/site-header.tsx'),
    read('src/components/account-menu.tsx'),
  ]);
  assert.match(header, /<AccountMenu/);
  assert.doesNotMatch(header, /className="desk-member-badge"/);
  assert.match(accountMenu, /Desk Member|Free Reader/);
  assert.match(accountMenu, /href="\/saved"/);
  assert.doesNotMatch(accountMenu, /BrandMark|brand-mark|reporter/i);
});
}

// --- Section: following.test.ts ---
{
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
}

// --- Section: follow-cap.test.ts ---
{
const five = ['one', 'two', 'three', 'four', 'five'];

test('free readers can follow through five entities and are capped exactly on the sixth', () => {
  assert.equal(FREE_FOLLOW_LIMIT, 5);
  const fifth = decideFollowChange({ currentEntityIds: five.slice(0, 4), requestedEntityIds: ['five'], intent: 'follow', subscriptionStatus: 'free' });
  assert.equal(fifth.kind, 'follow');
  assert.equal(fifth.projectedCount, 5);
  const sixth = decideFollowChange({ currentEntityIds: five, requestedEntityIds: ['six'], intent: 'follow', subscriptionStatus: 'free' });
  assert.equal(sixth.kind, 'upgrade');
  assert.equal(sixth.currentCount, 5);
});

test('active subscribers bypass the cap while canceled and past-due readers do not', () => {
  assert.equal(decideFollowChange({ currentEntityIds: five, requestedEntityIds: ['six'], intent: 'follow', subscriptionStatus: 'active' }).kind, 'follow');
  assert.equal(decideFollowChange({ currentEntityIds: five, requestedEntityIds: ['six'], intent: 'follow', subscriptionStatus: 'canceled' }).kind, 'upgrade');
  assert.equal(decideFollowChange({ currentEntityIds: five, requestedEntityIds: ['six'], intent: 'follow', subscriptionStatus: 'past_due' }).kind, 'upgrade');
});

test('unfollow remains available at the free limit', () => {
  const decision = decideFollowChange({ currentEntityIds: five, requestedEntityIds: ['five'], intent: 'toggle', subscriptionStatus: 'free' });
  assert.equal(decision.kind, 'unfollow');
  assert.equal(decision.projectedCount, 4);
});
}
