import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideCluster, calculateSignificance } from '../src/lib/clustering/decision';

test('clean similarity merge requires entity overlap', () => {
  assert.deepEqual(decideCluster([{ storyId: 's1', similarity: 0.9, sharedEntityCount: 1 }]), { kind: 'merge', storyId: 's1', similarity: 0.9 });
  assert.deepEqual(decideCluster([{ storyId: 's1', similarity: 0.99, sharedEntityCount: 0 }]), { kind: 'new' });
});
test('ambiguous band creates a separate possibly-related story', () => {
  assert.deepEqual(decideCluster([{ storyId: 's1', similarity: 0.72, sharedEntityCount: 2 }]), { kind: 'possibly-related', storyId: 's1', similarity: 0.72 });
});
test('below threshold creates an unrelated story and best valid candidate wins', () => {
  assert.deepEqual(decideCluster([{ storyId: 's1', similarity: 0.69, sharedEntityCount: 1 }]), { kind: 'new' });
  const best = decideCluster([{ storyId: 'a', similarity: 0.86, sharedEntityCount: 1 }, { storyId: 'b', similarity: 0.92, sharedEntityCount: 1 }]);
  assert.notEqual(best.kind, 'new');
  if (best.kind !== 'new') assert.equal(best.storyId, 'b');
});
test('significance rewards sources and documents while decaying with age', () => {
  const recent = calculateSignificance({ documentCount: 3, distinctSourceCount: 2, ageHours: 1 });
  assert.ok(recent > calculateSignificance({ documentCount: 1, distinctSourceCount: 1, ageHours: 1 }));
  assert.ok(recent > calculateSignificance({ documentCount: 3, distinctSourceCount: 2, ageHours: 48 }));
});
