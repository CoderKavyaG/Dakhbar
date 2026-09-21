import {test} from 'node:test';
import assert from 'node:assert/strict';
import {ingestionHealth,STALE_AFTER_MS} from '../src/lib/ingestion-health';
test('successful zero-item runs stay healthy and a missed run alerts at 35 minutes',()=>{const now=Date.parse('2026-09-21T10:00:00Z');assert.equal(ingestionHealth(new Date(now-15*60000).toISOString(),true,false,now).alert,false);assert.equal(ingestionHealth(new Date(now-STALE_AFTER_MS).toISOString(),true,false,now).stale,true);});
test('dead worker or paused queue alerts immediately even with recent ingestion',()=>{const now=Date.now();assert.equal(ingestionHealth(new Date(now).toISOString(),false,false,now).alert,true);assert.equal(ingestionHealth(new Date(now).toISOString(),true,true,now).alert,true);assert.equal(ingestionHealth(null,true,false,now).alert,true);});
