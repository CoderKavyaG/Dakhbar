export type CategorySlug = 'ai-companies' | 'infrastructure' | 'languages-tools';

export type CategoryDefinition = {
  slug: CategorySlug;
  title: string;
  navTitle: string;
  description: string;
  aliases: string[];
};

export const CATEGORIES: CategoryDefinition[] = [
  {
    slug: 'ai-companies',
    title: 'AI & companies',
    navTitle: 'AI & companies',
    description: 'Frontier AI labs, foundation models, machine learning frameworks, and AI infrastructure.',
    aliases: ['ai', 'ai-and-companies', 'ai-companies'],
  },
  {
    slug: 'infrastructure',
    title: 'Infrastructure',
    navTitle: 'Infrastructure',
    description: 'Cloud computing platforms, distributed databases, container runtimes, and backend systems.',
    aliases: ['infrastructure', 'infra', 'cloud'],
  },
  {
    slug: 'languages-tools',
    title: 'Languages & tools',
    navTitle: 'Languages & tools',
    description: 'Programming languages, JavaScript runtimes, UI frameworks, build tools, and developer utilities.',
    aliases: ['languages-tools', 'languages-and-tools', 'tools', 'languages'],
  },
];

// Explicit canonical mapping for all known entities to guarantee 0 orphans and 0 ambiguity
const ENTITY_CATEGORY_MAP: Record<string, CategorySlug> = {
  // AI & Companies
  'OpenAI': 'ai-companies',
  'Anthropic': 'ai-companies',
  'Google': 'ai-companies',
  'Microsoft': 'ai-companies',
  'Meta': 'ai-companies',
  'NVIDIA': 'ai-companies',
  'Apple': 'ai-companies',
  'Mistral AI': 'ai-companies',
  'DeepSeek': 'ai-companies',
  'Hugging Face': 'ai-companies',
  'PyTorch': 'ai-companies',
  'TensorFlow': 'ai-companies',
  'Model Context Protocol': 'ai-companies',

  // Infrastructure
  'Amazon Web Services': 'infrastructure',
  'Cloudflare': 'infrastructure',
  'Vercel': 'infrastructure',
  'GitHub': 'infrastructure',
  'Docker': 'infrastructure',
  'Kubernetes': 'infrastructure',
  'Linux': 'infrastructure',
  'PostgreSQL': 'infrastructure',
  'MySQL': 'infrastructure',
  'SQLite': 'infrastructure',
  'Redis': 'infrastructure',
  'MongoDB': 'infrastructure',
  'Supabase': 'infrastructure',
  'Terraform': 'infrastructure',
  'GraphQL': 'infrastructure',

  // Languages & Tools
  'TypeScript': 'languages-tools',
  'JavaScript': 'languages-tools',
  'Python': 'languages-tools',
  'Rust': 'languages-tools',
  'Go': 'languages-tools',
  'Java': 'languages-tools',
  'C++': 'languages-tools',
  'Zig': 'languages-tools',
  'React': 'languages-tools',
  'Next.js': 'languages-tools',
  'Vue.js': 'languages-tools',
  'Angular': 'languages-tools',
  'Svelte': 'languages-tools',
  'Node.js': 'languages-tools',
  'Deno': 'languages-tools',
  'Bun': 'languages-tools',
  'WebAssembly': 'languages-tools',
  'Prisma': 'languages-tools',
  'Tailwind CSS': 'languages-tools',
  'Stripe': 'languages-tools',
  'Hacker News': 'languages-tools',
};

const AI_KEYWORDS = [
  'ai', 'llm', 'gpt', 'claude', 'deepmind', 'mistral', 'nvidia', 'cuda',
  'model', 'neural', 'diffusion', 'transformer', 'inference', 'deepseek',
  'openai', 'anthropic', 'hugging', 'pytorch', 'tensorflow', 'gemini', 'llama',
  'groq', 'lpu', 'cohere', 'bedrock', 'qwen', 'agent', 'ollama', 'vllm',
];


const INFRA_KEYWORDS = [
  'cloud', 'infra', 'server', 'deploy', 'aws', 'k8s', 'kubernetes', 'docker',
  'database', 'postgres', 'mysql', 'redis', 'mongo', 'sqlite', 'linux',
  'terraform', 'supabase', 'cloudflare', 'vercel', 'host',
];

/**
 * Deterministically resolves the category for an entity.
 * Uses exact mapping first, then falls back to heuristic inference for dynamically ingested entities.
 */
export function getCategoryForEntity(entityName: string, entityType?: string): CategoryDefinition {
  // 1. Direct exact map
  const mappedSlug = ENTITY_CATEGORY_MAP[entityName];
  if (mappedSlug) {
    const found = CATEGORIES.find(c => c.slug === mappedSlug);
    if (found) return found;
  }

  // 2. Case-insensitive exact map match
  const lowerName = entityName.toLowerCase();
  for (const [name, catSlug] of Object.entries(ENTITY_CATEGORY_MAP)) {
    if (name.toLowerCase() === lowerName) {
      const found = CATEGORIES.find(c => c.slug === catSlug);
      if (found) return found;
    }
  }

  // 3. Heuristic inference for new/dynamic entities (e.g. GitHub repos or RSS)
  if (AI_KEYWORDS.some(kw => lowerName.includes(kw))) {
    return CATEGORIES[0]; // AI & companies
  }

  if (entityType === 'database' || INFRA_KEYWORDS.some(kw => lowerName.includes(kw))) {
    return CATEGORIES[1]; // Infrastructure
  }

  // Default to Languages & tools
  return CATEGORIES[2];
}

export function getCategoryBySlug(slug: string): CategoryDefinition | null {
  const normalized = slug.toLowerCase();
  return (
    CATEGORIES.find(
      c => c.slug === normalized || c.aliases.includes(normalized)
    ) ?? null
  );
}

export function getAllCategories(): CategoryDefinition[] {
  return CATEGORIES;
}

export function getEntitiesForCategory(categorySlug: CategorySlug): string[] {
  return Object.entries(ENTITY_CATEGORY_MAP)
    .filter(([, slug]) => slug === categorySlug)
    .map(([name]) => name);
}
