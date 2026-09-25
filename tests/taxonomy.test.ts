import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ENTITY_SEED } from '../src/lib/clustering/entity-seed';
import {
  CATEGORIES,
  getCategoryForEntity,
  getCategoryBySlug,
  getAllCategories,
  getEntitiesForCategory,
  type CategorySlug,
} from '../src/lib/taxonomy';
import { db } from '../src/lib/db';

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
    'Stripe',
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
