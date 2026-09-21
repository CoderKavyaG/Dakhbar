import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideFollowChange, FREE_FOLLOW_LIMIT } from '../src/lib/follow-entitlement';

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
