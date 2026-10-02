// Consolidated Test Suite: 02-clustering.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { bestTitleSimilarity, calculateSignificance, decideCluster, titleSimilarity } from '../src/lib/clustering/decision';
import { extractEntityIds, type EntityDictionaryEntry } from '../src/lib/clustering/entities';
import { ENTITY_SEED } from '../src/lib/clustering/entity-seed';
import { db } from '../src/lib/db';
import { buildPendingRelationships, type PendingReviewStory } from '../src/lib/pending-relationships';
import { CATEGORIES, getAllCategories, getCategoryBySlug, getCategoryForEntity, getEntitiesForCategory, type CategorySlug } from '../src/lib/taxonomy';

// --- Section: clustering.test.ts ---
{
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
}

// --- Section: entities.test.ts ---
{
const entries: EntityDictionaryEntry[] = [
  { id: 'react', name: 'React', aliases: ['ReactJS', 'React.js'] },
  { id: 'postgres', name: 'PostgreSQL', aliases: ['Postgres'] },
  { id: 'go', name: 'Go', aliases: ['Golang', 'Go language'] },
  { id: 'cpp', name: 'C++', aliases: ['cpp'] },
];

test('extracts exact names and aliases case-insensitively', () => {
  assert.deepEqual(extractEntityIds('ReactJS meets POSTGRES', null, entries), ['react', 'postgres']);
});
test('does not match aliases inside larger words', () => {
  assert.deepEqual(extractEntityIds('Google reacts to a goal and we should go now', null, entries), []);
});
test('supports punctuation-bearing entity names and deduplicates matches', () => {
  assert.deepEqual(extractEntityIds('C++ and cpp tooling', 'C++', entries), ['cpp']);
});
}

// --- Section: taxonomy.test.ts ---
{
test('every seeded entity has exactly one valid category without orphans or duplicates', () => {
  const validSlugs: CategorySlug[] = ['ai-companies', 'infrastructure', 'languages-tools'];

  for (const entity of ENTITY_SEED) {
    const category = getCategoryForEntity(entity.name, entity.type);
    assert.ok(category, `Entity ${entity.name} must resolve to a category`);
    assert.ok(
      validSlugs.includes(category.slug),
      `Entity ${entity.name} resolved to invalid category slug: ${category.slug}`
    );
  }
});

test('AI category comprehensively includes all frontier labs, AI companies, and AI frameworks', () => {
  const aiEntities = [
    'OpenAI',
    'Anthropic',
    'Google',
    'Microsoft',
    'Meta',
    'NVIDIA',
    'Apple',
    'Mistral AI',
    'DeepSeek',
    'Hugging Face',
    'PyTorch',
    'TensorFlow',
    'Model Context Protocol',
  ];

  for (const name of aiEntities) {
    const category = getCategoryForEntity(name);
    assert.equal(
      category.slug,
      'ai-companies',
      `Expected ${name} to be in AI & companies, got ${category.slug}`
    );
  }
});

test('Infrastructure category contains cloud platforms, databases, and devops tech', () => {
  const infraEntities = [
    'Amazon Web Services',
    'Cloudflare',
    'Vercel',
    'GitHub',
    'Docker',
    'Kubernetes',
    'Linux',
    'PostgreSQL',
    'MySQL',
    'SQLite',
    'Redis',
    'MongoDB',
    'Supabase',
    'Terraform',
    'GraphQL',
    'Stripe',
  ];

  for (const name of infraEntities) {
    const category = getCategoryForEntity(name);
    assert.equal(
      category.slug,
      'infrastructure',
      `Expected ${name} to be in Infrastructure, got ${category.slug}`
    );
  }
});

test('Languages & tools category contains languages, runtimes, and web frameworks', () => {
  const langToolEntities = [
    'TypeScript',
    'JavaScript',
    'Python',
    'Rust',
    'Go',
    'Java',
    'C++',
    'React',
    'Next.js',
    'Vue.js',
    'Angular',
    'Svelte',
    'Node.js',
    'Deno',
    'Bun',
    'WebAssembly',
    'Prisma',
    'Tailwind CSS',
  ];

  for (const name of langToolEntities) {
    const category = getCategoryForEntity(name);
    assert.equal(
      category.slug,
      'languages-tools',
      `Expected ${name} to be in Languages & tools, got ${category.slug}`
    );
  }
});

test('getCategoryBySlug resolves canonical and alias slugs correctly', () => {
  assert.equal(getCategoryBySlug('ai-companies')?.slug, 'ai-companies');
  assert.equal(getCategoryBySlug('ai')?.slug, 'ai-companies');
  assert.equal(getCategoryBySlug('infrastructure')?.slug, 'infrastructure');
  assert.equal(getCategoryBySlug('infra')?.slug, 'infrastructure');
  assert.equal(getCategoryBySlug('languages-tools')?.slug, 'languages-tools');
  assert.equal(getCategoryBySlug('tools')?.slug, 'languages-tools');
  assert.equal(getCategoryBySlug('nonexistent'), null);
});

test('dynamic inference correctly categorizes new/unknown entities', () => {
  assert.equal(getCategoryForEntity('xAI').slug, 'ai-companies');
  assert.equal(getCategoryForEntity('Groq LPU', 'hardware').slug, 'ai-companies');
  assert.equal(getCategoryForEntity('Kafka Cluster', 'technology').slug, 'languages-tools');
  assert.equal(getCategoryForEntity('ClickHouse', 'database').slug, 'infrastructure');
  assert.equal(getCategoryForEntity('Mojo', 'language').slug, 'languages-tools');
});

test('getAllCategories and getEntitiesForCategory return populated categories and entity lists', () => {
  const all = getAllCategories();
  assert.equal(all.length, CATEGORIES.length);
  assert.equal(all.length, 3);

  const aiEntities = getEntitiesForCategory('ai-companies');
  assert.ok(aiEntities.includes('OpenAI'));
  assert.ok(aiEntities.includes('Anthropic'));
  assert.ok(aiEntities.includes('Google'));
  assert.ok(aiEntities.includes('NVIDIA'));

  const infraEntities = getEntitiesForCategory('infrastructure');
  assert.ok(infraEntities.includes('PostgreSQL'));
  assert.ok(infraEntities.includes('Docker'));

  const langEntities = getEntitiesForCategory('languages-tools');
  assert.ok(langEntities.includes('TypeScript'));
  assert.ok(langEntities.includes('Rust'));
});

test('database entities all map to a valid category with zero orphans', async () => {
  const dbEntities = await db.entity.findMany({
    select: { name: true, type: true },
  });

  assert.ok(dbEntities.length > 0, 'Database should have entities');

  for (const entity of dbEntities) {
    const cat = getCategoryForEntity(entity.name, entity.type);
    assert.ok(cat, `DB Entity "${entity.name}" must map to a category`);
    assert.ok(
      ['ai-companies', 'infrastructure', 'languages-tools'].includes(cat.slug),
      `DB Entity "${entity.name}" has invalid category: ${cat.slug}`
    );
  }
});
}

// --- Section: cluster-review.test.ts ---
{
const stories: PendingReviewStory[] = [{
  id: 'new-story',
  title: 'OpenAI and Anthropic face pacing lawsuit',
  documents: [{ similarity_score: 0.781 }],
  entities: [
    { entity_id: 'openai', entity: { name: 'OpenAI' } },
    { entity_id: 'anthropic', entity: { name: 'Anthropic' } },
  ],
  possibly_related_to: {
    id: 'candidate',
    title: 'Lawsuit alleges AI pacing agreement',
    entities: [
      { entity_id: 'openai', entity: { name: 'OpenAI' } },
      { entity_id: 'google', entity: { name: 'Google' } },
    ],
  },
}, {
  id: 'confirmed',
  title: 'A confirmed story',
  documents: [{ similarity_score: 1 }],
  entities: [],
  possibly_related_to: null,
}];

test('bulk review rows pair both headlines with shared evidence and score', () => {
  assert.deepEqual(buildPendingRelationships(stories), [{
    storyId: 'new-story',
    storyTitle: 'OpenAI and Anthropic face pacing lawsuit',
    candidateId: 'candidate',
    candidateTitle: 'Lawsuit alleges AI pacing agreement',
    similarity: 0.781,
    sharedEntities: ['OpenAI'],
  }]);
});

test('bulk review rows are sorted by similarity descending', () => {
  const lowerScore: PendingReviewStory = {
    ...stories[0],
    id: 'lower-story',
    title: 'Lower similarity candidate',
    documents: [{ similarity_score: 0.72 }],
  };
  assert.deepEqual(
    buildPendingRelationships([lowerScore, stories[0]]).map(item => item.similarity),
    [0.781, 0.72],
  );
});
}
