import {test} from 'node:test';
import assert from 'node:assert/strict';
import {reusableBrief} from '../src/lib/brief-snapshot';
const now=new Date('2026-09-22T12:00:00Z');
const snapshot={entityIds:['react','rust'],storyIds:['a'],since:'2026-09-21T12:00:00Z',createdAt:'2026-09-22T11:59:00Z'};
test('Brief can retain the last edition on refresh without accepting another user topic selection',()=>{
 assert.equal(reusableBrief(snapshot,['rust','react'],now),true);
 assert.equal(reusableBrief(snapshot,['react'],now),false);
 assert.equal(reusableBrief(snapshot,['rust','react'],new Date('2026-09-24')),false);
 assert.equal(reusableBrief(null,['react'],now),false);
});
