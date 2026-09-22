import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractEntityIds } from '../src/lib/clustering/entities';
import { fuseRankedStoryDocuments, parseTemporalWindow, planSearchQuery, reciprocalRankFusion } from '../src/lib/retrieval';
const entities = [{ id:'openai', name:'OpenAI', aliases:['Open AI'] }, { id:'go', name:'Go', aliases:['Golang'] }];
const now = new Date('2026-09-23T15:30:00.000Z');
test('intent resolution reuses dictionary matching and routes questions to research',()=>{
 assert.equal(planSearchQuery('Open AI',entities,now).intent,'navigational');
 assert.deepEqual(planSearchQuery('How did OpenAI change this week?',entities,now),{intent:'research-question',entityIds:['openai'],temporal:{start:new Date('2026-09-21T00:00:00Z'),end:now,label:'this week'},retrievalQuery:'How did change'});
 assert.equal(planSearchQuery('a product announcement',entities,now).intent,'informational');
 assert.deepEqual(extractEntityIds('Google',null,entities),[]);
 assert.equal(planSearchQuery('reactions to software',entities,now).intent,'informational');
});
test('supported time phrases create UTC ranges',()=>{
 assert.deepEqual(parseTemporalWindow('last 24 hours',now),{start:new Date('2026-09-22T15:30:00Z'),end:now,label:'last 24 hours'});
 assert.equal(parseTemporalWindow('today',now)?.start.toISOString(),'2026-09-23T00:00:00.000Z');
 assert.equal(parseTemporalWindow('since Monday',now)?.start.toISOString(),'2026-09-21T00:00:00.000Z');
 assert.equal(parseTemporalWindow('this week',new Date('2026-09-20T12:00:00Z'))?.start.toISOString(),'2026-09-14T00:00:00.000Z');
});
test('RRF at k=60 rewards shared support and keeps a strong one-signal hit over weak hits',()=>{
 const lexical=[{id:'lexical-strong',rank:1},{id:'both-strong',rank:2},{id:'weak-both',rank:180}];
 const vector=[{id:'vector-strong',rank:1},{id:'both-strong',rank:2},{id:'weak-both',rank:180}];
 const fused=reciprocalRankFusion([lexical,vector]);const rank=(id:string)=>fused.findIndex(row=>row.id===id);
 assert.equal(fused.find(row=>row.id==='both-strong')?.score,2/62);assert.ok(rank('lexical-strong')<rank('weak-both'));assert.ok(rank('vector-strong')<rank('weak-both'));assert.equal(reciprocalRankFusion([[{id:'one',rank:1}]])[0].score,1/61);
});

test('hybrid fusion ranks each story by its strongest combined evidence document',()=>{
 const ranked=fuseRankedStoryDocuments(
  [{document_id:'lex',story_id:'lexical',position:1},{document_id:'shared-doc',story_id:'shared',position:2},{document_id:'weak-a',story_id:'weak',position:180}],
  [{document_id:'vector',story_id:'semantic',position:1},{document_id:'shared-doc',story_id:'shared',position:2},{document_id:'weak-b',story_id:'weak',position:180}],
 );
 assert.equal(ranked[0].id,'shared');assert.ok(ranked.findIndex(x=>x.id==='lexical')<ranked.findIndex(x=>x.id==='weak'));assert.ok(ranked.findIndex(x=>x.id==='semantic')<ranked.findIndex(x=>x.id==='weak'));
});
