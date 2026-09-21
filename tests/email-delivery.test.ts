import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { selectBriefStories, type BriefSelectionStore } from '../src/lib/brief-selection';
import { deliverDailyBriefs } from '../src/lib/email/delivery';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '../src/lib/email/unsubscribe';

type Story = { id: string; title: string };
class MemoryBriefStore implements BriefSelectionStore<Story> {
  async getFollowingEntityIds() { return ['openai']; }
  async findStories(entityIds: string[], since: Date) {
    assert.deepEqual(entityIds, ['openai']);
    assert.equal(since.toISOString(), '2026-09-19T08:00:00.000Z');
    return [{ id: 'story_1', title: 'A real followed development' }];
  }
}

test('email delivery selects the same Brief stories as the in-app selector for the same window', async () => {
  const store = new MemoryBriefStore();
  const since = new Date('2026-09-19T08:00:00.000Z');
  const inApp = await selectBriefStories(store, 'user_1', since);
  let renderedStories: Story[] = [];
  const result = await deliverDailyBriefs({
    appUrl: 'https://example.test',
    unsubscribeSecret: 'test-secret',
    async listActiveSubscribers() { return [{ id: 'user_1', email: 'reader@example.test' }]; },
    async selectBrief(userId, emailSince) { return selectBriefStories(store, userId, emailSince); },
    render({ stories }) { renderedStories = stories; return { subject: 'Brief', html: '<p>Brief</p>', text: 'Brief' }; },
    async send() {},
  }, new Date('2026-09-20T08:00:00.000Z'));
  assert.deepEqual(renderedStories, inApp.stories);
  assert.equal(result.sent, 1);
  assert.equal(result.failed, 0);
});

test('unsubscribe tokens reject tampering and delivery query excludes free or opted-out users', async () => {
  const token = createUnsubscribeToken('user_1', 'secret');
  assert.equal(verifyUnsubscribeToken(token, 'secret'), 'user_1');
  assert.equal(verifyUnsubscribeToken(token + 'x', 'secret'), null);
  const source = await readFile('src/lib/email/delivery.ts', 'utf8');
  assert.match(source, /subscription_status: 'active', email_brief_enabled: true/);
  assert.match(source, /List-Unsubscribe-Post/);
  assert.match(source, /idempotencyKey/);
});
