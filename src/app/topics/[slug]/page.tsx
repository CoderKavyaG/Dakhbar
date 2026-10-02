import { ArticleGrid } from '@/components/article-grid';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StoryCard } from '@/components/story-card';
import { TopicSummary } from '@/components/topic-summary';
import { TopicTrendChart, type ContributingStoryItem } from '@/components/topic-trend-chart';
import { Badge } from '@/components/ui/badge';
import { getTopicBySlug } from '@/lib/reader-data';
import { storyDestination, publisherDomain, countIndependentSources } from '@/lib/story-evidence';
import { getCategoryForEntity } from '@/lib/taxonomy';
import type { Metadata } from 'next';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const topic = await getTopicBySlug(decodeURIComponent(slug));
  if (!topic) return { title: 'Topic Not Found' };

  const name = topic.entity.name;
  const type = topic.entity.type;
  const count = topic.storyCount;
  const latestSnapshot = topic.snapshots.length > 0 ? topic.snapshots[topic.snapshots.length - 1] : null;
  const velocity = latestSnapshot?.mention_velocity != null ? Math.round(latestSnapshot.mention_velocity) : null;
  const mentions = latestSnapshot?.mention_count ?? null;

  const trendSummary = velocity !== null
    ? `${velocity > 0 ? '+' : ''}${velocity}% 24h velocity with ${mentions ?? 0} daily mentions`
    : `${count} verified stories`;

  const description = `Is ${name} trending? ${name} (${type}) developer trends: ${trendSummary} and cross-source reporting across ${count} indexed stories.`;

  return {
    title: `${name} Developer News & Velocity Trends`,
    description,
    openGraph: {
      title: `${name} | Developer News & Trend Signals`,
      description,
      type: 'website',
      url: `/topics/${slug}`,
    },
    twitter: {
      card: 'summary',
      title: `${name} | Developer News & Trend Signals`,
      description,
    },
  };
}

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = await getTopicBySlug(decodeURIComponent(slug));
  if (!topic) notFound();
  const returnTo = '/topics/' + encodeURIComponent(slug);

  const category = getCategoryForEntity(topic.entity.name, topic.entity.type);
  const latestSnapshot = topic.snapshots.length > 0 ? topic.snapshots[topic.snapshots.length - 1] : null;
  const velocity = latestSnapshot?.mention_velocity != null ? Math.round(latestSnapshot.mention_velocity) : null;
  const mentions = latestSnapshot?.mention_count ?? null;
  const uniqueSources = latestSnapshot?.unique_source_count ?? null;

  const contributingStories: ContributingStoryItem[] = topic.stories.map(story => {
    const rawDocs = story.documents.map(d => d.raw_document);
    const dest = storyDestination(story.id, rawDocs);
    const primaryUrl = rawDocs[0]?.url;
    return {
      id: story.id,
      title: story.title,
      href: dest.href,
      isExternal: dest.external,
      sourceCount: countIndependentSources(rawDocs),
      domain: primaryUrl ? publisherDomain(primaryUrl) : undefined,
      publishedAt: story.updated_at.toISOString(),
    };
  });

  return (
    <main className="paper-shell topic-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span>/</span>
        <Link href={`/category/${category.slug}`}>{category.title}</Link>
        <span>/</span>
        <span>{topic.entity.name}</span>
      </nav>
      <section className="topic-hero">
        <div className="topic-hero-main">
          <div className="topic-kicker-row">
            <Link href={`/category/${category.slug}`} className="topic-category-link">
              {category.title}
            </Link>
            <Badge>{topic.entity.type}</Badge>
          </div>
          <h1>{topic.entity.name}</h1>
          <p className="topic-intel-lead">
            <strong>Is {topic.entity.name} trending?</strong>{' '}
            {velocity !== null
              ? `${topic.entity.name} is ${velocity > 0 ? 'trending up' : velocity < 0 ? 'cooling down' : 'holding steady'} at ${velocity > 0 ? '+' : ''}${velocity}% 24-hour velocity with ${mentions ?? 0} developer mentions across ${uniqueSources ?? 'multiple'} independent sources.`
              : `${topic.entity.name} has ${topic.storyCount} corroborated stories indexed across independent developer sources with steady baseline coverage.`}{' '}
            All signals are synthesized deterministically from cross-source reporting.
          </p>
        </div>
        <TopicSummary entity={topic.entity} storyCount={topic.storyCount} returnTo={returnTo} />
      </section>

      <TopicTrendChart
        snapshots={topic.snapshots}
        entityName={topic.entity.name}
        entityType={topic.entity.type}
        contributingStories={contributingStories}
      />

      <section className="topic-stories">
        <header className="section-heading">
          <div>
            <span className="section-note">Latest coverage</span>
            <h2>Stories about {topic.entity.name}</h2>
          </div>
          <Badge>{topic.storyCount} {topic.storyCount === 1 ? 'story' : 'stories'}</Badge>
        </header>
        <ArticleGrid className="article-grid-results">
          {topic.stories.map(story => <StoryCard key={story.id} story={story} />)}
        </ArticleGrid>
      </section>
    </main>
  );
}
