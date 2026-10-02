import { db } from './db';
import { topicSlug } from './topic-slug';
import { getCategoryForEntity } from './taxonomy';
import { publisherDomain } from './story-evidence';

export type TrendingTopicItem = {
  rank: number;
  id: string;
  name: string;
  type: string;
  slug: string;
  categoryTitle: string;
  categorySlug: string;
  storyCount: number;
  latestMentions: number;
  latestVelocity: number | null;
};

export type StorySuggestionItem = {
  id: string;
  title: string;
  domain?: string;
  publishedAt: string;
  href: string;
};

export type TopicSuggestionItem = {
  id: string;
  name: string;
  type: string;
  slug: string;
  categoryTitle: string;
  storyCount: number;
  latestMentions: number;
  latestVelocity: number | null;
};

export type SourceSuggestionItem = {
  domain: string;
  storyCount: number;
};

export type SearchSuggestionsResponse = {
  trending: TrendingTopicItem[];
  stories: StorySuggestionItem[];
  topics: TopicSuggestionItem[];
  sources: SourceSuggestionItem[];
  researchEligible: boolean;
  totalMatches: number;
};

let cachedTrending: { data: TrendingTopicItem[]; timestamp: number } | null = null;
const TRENDING_CACHE_TTL_MS = 60_000;

export async function getTrendingTopics(limit = 8): Promise<TrendingTopicItem[]> {
  if (cachedTrending && Date.now() - cachedTrending.timestamp < TRENDING_CACHE_TTL_MS) {
    return cachedTrending.data.slice(0, limit);
  }

  const entities = await db.entity.findMany({
    select: {
      id: true,
      name: true,
      type: true,
      _count: { select: { stories: true } },
      metric_snapshots: {
        orderBy: { snapshot_at: 'desc' },
        take: 1,
        select: {
          mention_count: true,
          mention_velocity: true,
        },
      },
    },
    orderBy: { name: 'asc' },
  });

  const ranked = entities
    .map(entity => {
      const mentions = entity.metric_snapshots[0]?.mention_count ?? 0;
      const velocity = entity.metric_snapshots[0]?.mention_velocity ?? null;
      const category = getCategoryForEntity(entity.name, entity.type);
      // Ranking weight prioritizes velocity movers first, then daily volume, then overall story count
      const score = (velocity !== null && velocity > 0 ? velocity * 2 : 0) + (mentions * 3) + entity._count.stories;
      return {
        id: entity.id,
        name: entity.name,
        type: entity.type,
        slug: topicSlug(entity.name),
        categoryTitle: category.title,
        categorySlug: category.slug,
        storyCount: entity._count.stories,
        latestMentions: mentions,
        latestVelocity: velocity,
        score,
      };
    })
    .sort((a, b) => b.score - a.score || b.storyCount - a.storyCount)
    .slice(0, 20)
    .map((item, index) => ({
      rank: index + 1,
      id: item.id,
      name: item.name,
      type: item.type,
      slug: item.slug,
      categoryTitle: item.categoryTitle,
      categorySlug: item.categorySlug,
      storyCount: item.storyCount,
      latestMentions: item.latestMentions,
      latestVelocity: item.latestVelocity,
    }));

  cachedTrending = { data: ranked, timestamp: Date.now() };
  return ranked.slice(0, limit);
}

export async function getLiveSearchSuggestions(query: string): Promise<SearchSuggestionsResponse> {
  const q = query.trim().slice(0, 100);
  const trending = q ? (cachedTrending?.data.slice(0, 4) ?? []) : await getTrendingTopics(6);

  if (!q) {
    return {
      trending,
      stories: [],
      topics: [],
      sources: [],
      researchEligible: false,
      totalMatches: 0,
    };
  }

  // 1. Search matching topics / entities
  const capitalizedQ = q.charAt(0).toUpperCase() + q.slice(1);
  const matchingEntities = await db.entity.findMany({
    where: {
      OR: [
        { name: { contains: q, mode: 'insensitive' } },
        { aliases: { hasSome: [q, q.toLowerCase(), q.toUpperCase(), capitalizedQ] } },
      ],
    },
    take: 5,
    select: {
      id: true,
      name: true,
      type: true,
      _count: { select: { stories: true } },
      metric_snapshots: {
        orderBy: { snapshot_at: 'desc' },
        take: 1,
        select: {
          mention_count: true,
          mention_velocity: true,
        },
      },
    },
  });

  const topics: TopicSuggestionItem[] = matchingEntities.map(e => {
    const category = getCategoryForEntity(e.name, e.type);
    return {
      id: e.id,
      name: e.name,
      type: e.type,
      slug: topicSlug(e.name),
      categoryTitle: category.title,
      storyCount: e._count.stories,
      latestMentions: e.metric_snapshots[0]?.mention_count ?? 0,
      latestVelocity: e.metric_snapshots[0]?.mention_velocity ?? null,
    };
  });

  // 2. Search matching stories
  const matchingStories = await db.story.findMany({
    where: {
      status: 'active',
      OR: [
        { title: { contains: q, mode: 'insensitive' } },
        { entities: { some: { entity: { name: { contains: q, mode: 'insensitive' } } } } },
      ],
    },
    orderBy: [{ significance_score: 'desc' }, { updated_at: 'desc' }],
    take: 4,
    include: {
      documents: {
        where: { is_primary: true },
        take: 1,
        include: { raw_document: { select: { url: true } } },
      },
    },
  });

  const stories: StorySuggestionItem[] = matchingStories.map(s => {
    const primaryUrl = s.documents[0]?.raw_document?.url;
    return {
      id: s.id,
      title: s.title,
      domain: primaryUrl ? publisherDomain(primaryUrl) : undefined,
      publishedAt: s.updated_at.toISOString(),
      href: `/stories/${s.id}`,
    };
  });

  // 3. Extract matching source publishers / domains
  const rawDocs = await db.rawDocument.findMany({
    where: {
      url: { contains: q, mode: 'insensitive' },
    },
    take: 10,
    select: { url: true },
  });

  const domainCounts = new Map<string, number>();
  for (const doc of rawDocs) {
    const dom = publisherDomain(doc.url);
    if (dom && dom.toLowerCase().includes(q.toLowerCase())) {
      domainCounts.set(dom, (domainCounts.get(dom) ?? 0) + 1);
    }
  }

  const sources: SourceSuggestionItem[] = Array.from(domainCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([domain, storyCount]) => ({ domain, storyCount }));

  const totalMatches = stories.length + topics.length + sources.length;
  const researchEligible = stories.length >= 2;

  return {
    trending,
    stories,
    topics,
    sources,
    researchEligible,
    totalMatches,
  };
}
