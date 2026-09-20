import { test } from 'node:test';
import assert from 'node:assert/strict';
import { relatedStoryWhere } from '../src/lib/related-stories';
test('related stories exclude the current story and require actual shared entity IDs',()=>{assert.deepEqual(relatedStoryWhere('current',['react']),{id:{not:'current'},entities:{some:{entity_id:{in:['react']}}}});});
