import { ArticleGrid } from '@/components/article-grid';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { StoryCard } from '@/components/story-card';
import { TopicSummary } from '@/components/topic-summary';
import { TopicTrendChart, type ContributingStoryItem } from '@/components/topic-trend-chart';
import { Badge } from '@/components/ui/badge';
import { getTopicBySlug } from '@/lib/reader-data';
import { storyDestination, publisherDomain, countIndependentSources } from '@/lib/story-evidence';

export const dynamic = 'force-dynamic';

export default async function TopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const topic = await getTopicBySlug(decodeURIComponent(slug));
  if (!topic) notFound();
  const returnTo = '/topics/' + encodeURIComponent(slug);

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
        <Link href="/search">Topics</Link>
        <span>/</span>
        <span>{topic.entity.name}</span>
      </nav>
      <section className="topic-hero">
        <div>
          <p className="section-note">Topic</p>
          <h1>{topic.entity.name}</h1>
          <p>Reporting and developer signals that mention this {topic.entity.type}.</p>
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
