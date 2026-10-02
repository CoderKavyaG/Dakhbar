// Consolidated Test Suite: 08-brief-delivery.test.ts
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import { FIRST_BRIEF_WINDOW_MS, briefSince, briefStoryWhere, briefSummary } from '../src/lib/brief';
import { assembleCachedBrief, type CachedCopy } from '../src/lib/brief-cache';
import { groundedOrFallback, type GroundedStoryFacts, verifyGroundedCopy } from '../src/lib/brief-generation';
import { selectBriefStories, type BriefSelectionStore } from '../src/lib/brief-selection';
import { reusableBrief } from '../src/lib/brief-snapshot';
import { deliverDailyBriefs } from '../src/lib/email/delivery';
import { createUnsubscribeToken, verifyUnsubscribeToken } from '../src/lib/email/unsubscribe';

// --- Section: brief.test.ts ---
{
test('a first Brief defaults to the preceding 24 hours', () => {
  const now = new Date('2026-09-20T12:00:00.000Z');
  assert.equal(briefSince(null, now).getTime(), now.getTime() - FIRST_BRIEF_WINDOW_MS);
});

test('a returning Brief starts at the stored visit time', () => {
  const now = new Date('2026-09-20T12:00:00.000Z');
  const lastSeen = new Date('2026-09-19T18:42:00.000Z');
  assert.equal(briefSince(lastSeen, now), lastSeen);
  assert.deepEqual(briefStoryWhere(['entity_1'], lastSeen), {
    entities: { some: { entity_id: { in: ['entity_1'] } } },
    documents: { some: { raw_document: { published_at: { gte: lastSeen } } } },
  });
});

test('Brief summary and zero-result copy are deterministic', () => {
  assert.equal(briefSummary(0), 'No new developments since you were last here.');
  assert.equal(briefSummary(1), '1 development since you were last here.');
  assert.equal(briefSummary(4), '4 developments since you were last here.');
});
}

// --- Section: brief-generation.test.ts ---
{
const facts: GroundedStoryFacts = {
  headline: 'OpenAI ships a PostgreSQL tool',
  entities: ['OpenAI', 'PostgreSQL'],
  sourceCount: 2,
  significance: 7.5,
  corroborationTimeline: [{ source: 'example.com', reportedAt: '2026-09-21T01:00:00.000Z' }],
};

test('grounded Brief copy accepts only names and numbers present in structured facts', () => {
  const copy = 'OpenAI ships a PostgreSQL tool, reported by 2 sources. The reporting remains grounded.';
  assert.equal(verifyGroundedCopy(copy, facts), true);
  assert.deepEqual(groundedOrFallback(copy, facts, 'fallback'), { text: copy, generated: true });
});

test('invented names or numbers force deterministic fallback', () => {
  const invented = 'Microsoft says OpenAI gained 3 customers.';
  assert.equal(verifyGroundedCopy(invented, facts), false);
  assert.deepEqual(groundedOrFallback(invented, facts, 'existing deterministic dek'), { text: 'existing deterministic dek', generated: false });
});


test('internal scores and raw timestamps are rejected even when present in input facts', () => {
  assert.equal(verifyGroundedCopy('OpenAI has a significance of 7.5.', facts), false);
  assert.equal(verifyGroundedCopy('OpenAI was reported at 2026-09-21T01:00:00.000Z.', facts), false);
});
}

// --- Section: brief-snapshot.test.ts ---
{
const now=new Date('2026-09-22T12:00:00Z');
const snapshot={entityIds:['react','rust'],storyIds:['a'],since:'2026-09-21T12:00:00Z',createdAt:'2026-09-22T11:59:00Z'};
test('Brief can retain the last edition on refresh without accepting another user topic selection',()=>{
 assert.equal(reusableBrief(snapshot,['rust','react'],now),true);
 assert.equal(reusableBrief(snapshot,['react'],now),false);
 assert.equal(reusableBrief(snapshot,['rust','react'],new Date('2026-09-24')),false);
 assert.equal(reusableBrief(null,['react'],now),false);
});
}

// --- Section: brief-cache.test.ts ---
{
test('six uncached stories use two batches; repeat and overlapping readers reuse copy',async()=>{
 const values=new Map<string,string>();const cache={get:async(k:string)=>values.get(k)??null,set:async(k:string,v:string)=>{values.set(k,v);}};
 let calls=0;const generate=async(stories:{id:string}[])=>{calls++;return Object.fromEntries(stories.map(s=>[s.id,{text:s.id,generated:true}])) as Record<string,CachedCopy>;};
 const stories=Array.from({length:6},(_,i)=>({id:'story-'+i}));const key=(s:{id:string},i:number)=>(i===0?'lead:':'standard:')+s.id;
 const first=await assembleCachedBrief(stories,cache,key,generate);assert.equal(calls,2);assert.equal(first.fullHit,false);
 const repeat=await assembleCachedBrief(stories,cache,key,generate);assert.equal(repeat.fullHit,true);assert.equal(calls,2);
 const overlap=await assembleCachedBrief([stories[0],stories[2],stories[4]],cache,key,generate);assert.equal(overlap.storyHits,3);assert.equal(calls,2);
});
test('new source facts invalidate just the changed story, and roles never share the wrong prompt',async()=>{
 const values=new Map<string,string>();const cache={get:async(k:string)=>values.get(k)??null,set:async(k:string,v:string)=>{values.set(k,v);}};let calls=0;
 const gen=async(stories:{id:string;version:number}[])=>{calls++;return Object.fromEntries(stories.map(s=>[s.id,{text:'v'+s.version,generated:true}]))};
 const key=(s:{id:string;version:number},i:number)=>JSON.stringify([s.id,s.version,i===0]);
 await assembleCachedBrief([{id:'a',version:1},{id:'b',version:1}],cache,key,gen);
 await assembleCachedBrief([{id:'a',version:1},{id:'b',version:2}],cache,key,gen);assert.equal(calls,3);
 await assembleCachedBrief([{id:'b',version:2}],cache,key,gen);assert.equal(calls,4);
});
}

// --- Section: email-delivery.test.ts ---
{
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
}
