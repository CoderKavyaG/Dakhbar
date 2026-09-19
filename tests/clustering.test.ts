import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestTitleSimilarity, decideCluster, calculateSignificance, titleSimilarity } from '../src/lib/clustering/decision';

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
  const singleSource = calculateSignificance({ documentCount: 3, distinctSourceCount: 1, ageHours: 1 });
  const threeSources = calculateSignificance({ documentCount: 3, distinctSourceCount: 3, ageHours: 1 });
  assert.ok(recent > calculateSignificance({ documentCount: 1, distinctSourceCount: 1, ageHours: 1 }));
  assert.ok(threeSources > singleSource * 3);
  assert.ok(recent > calculateSignificance({ documentCount: 3, distinctSourceCount: 2, ageHours: 48 }));
});

test('near-duplicate AI collusion lawsuit titles merge through the narrow title gate', () => {
  const first = 'Lawsuit says Anthropic, OpenAI and others made illegal agreement on AI slowdown';
  const second = "Lawsuit: Illegal Agreement of Anthropic, OpenAI, SpaceXAI, Google of AI Pacing 'Collusion'";
  const lexical = titleSimilarity(first, second);
  assert.ok(lexical >= 0.45);
  assert.deepEqual(decideCluster([{ storyId: 'lawsuit', similarity: 0.86, sharedEntityCount: 2, titleSimilarity: lexical }]), {
    kind: 'merge', storyId: 'lawsuit', similarity: 0.86,
  });
  assert.deepEqual(decideCluster([{ storyId: 'unrelated', similarity: 0.81, sharedEntityCount: 1, titleSimilarity: 0.9 }]), {
    kind: 'possibly-related', storyId: 'unrelated', similarity: 0.81,
  });
});

test('the three observed lawsuit headline variants satisfy the two-entity title gate', () => {
  const titles = [
    "Lawsuit Accuses Anthropic, OpenAI, SpaceXAI, Google of AI Pacing 'Collusion'",
    'Lawsuit says Anthropic, OpenAI and others made illegal agreement on AI slowdown',
    'Lawsuit: Illegal Agreement of Anthropic, OpenAI, SpaceXAI, Google on AI Slowdown',
  ];
  assert.ok(titleSimilarity(titles[0], titles[1]) >= 0.45);
  assert.ok(titleSimilarity(titles[0], titles[2]) >= 0.45);
  assert.equal(decideCluster([{ storyId: 'lawsuit', similarity: 0.31, sharedEntityCount: 2, titleSimilarity: titleSimilarity(titles[0], titles[1]) }]).kind, 'merge');
});

test('candidate title similarity checks every existing cluster member', () => {
  const incoming = 'Lawsuit says Anthropic, OpenAI and others made illegal agreement on AI slowdown';
  const displayed = "Anthropic, OpenAI, SpaceXAI, Google sued over call to 'pace' AI development";
  const member = 'Lawsuit: Illegal Agreement of Anthropic, OpenAI, SpaceXAI, Google on AI Slowdown';
  assert.equal(bestTitleSimilarity(incoming, [displayed, member]), titleSimilarity(incoming, member));
  assert.ok(bestTitleSimilarity(incoming, [displayed, member]) >= 0.8);
});
