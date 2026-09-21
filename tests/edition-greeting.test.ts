import {test} from 'node:test';
import assert from 'node:assert/strict';
import {editionGreeting} from '../src/lib/edition-greeting';
import {storyDestination} from '../src/lib/story-evidence';
test('welcome follows local morning, afternoon, tea, and night boundaries',()=>{assert.match(editionGreeting(5).title,/morning/);assert.match(editionGreeting(12).title,/afternoon/);assert.equal(editionGreeting(16).drink,'tea');assert.equal(editionGreeting(23).drink,'night');});
test('distinct reports from the same publisher earn a timeline page; duplicated URLs do not',()=>{assert.equal(storyDestination('series',[{url:'https://example.com/a',content:null},{url:'https://example.com/b',content:null}]).external,false);assert.equal(storyDestination('duplicate',[{url:'https://example.com/a',content:null},{url:'https://example.com/a',content:null}]).external,true);});
