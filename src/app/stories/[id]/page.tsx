import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { StoryAsk } from '@/components/story-ask';
import { SaveStory } from '@/components/save-story';
import { EntityFollowControl } from '@/components/entity-follow-control';
import { FollowToggle } from '@/components/follow-toggle';
import { StoryImage } from '@/components/story-image';
import { StoryCard } from '@/components/story-card';
import { TopicTrendChart } from '@/components/topic-trend-chart';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReadingAccordion } from '@/components/ui/accordion';
import { getRelatedStories } from '@/lib/related-stories';
import { countIndependentSources, publisherDomain, storyDek } from '@/lib/story-evidence';
import { topicPath } from '@/lib/topic-slug';

export const dynamic = 'force-dynamic';

export default async function StoryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const story = await db.story.findUnique({
    where: { id },
    include: {
      entities: { include: { entity: true } },
      documents: {
        orderBy: { raw_document: { published_at: 'asc' } },
        include: { raw_document: { include: { source: true } } },
      },
    },
  });

  if (!story || !story.documents.length) notFound();

  const { userId } = await auth();
  const reader = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { subscription_status: true },
      })
    : null;

  const documents = story.documents.map(m => m.raw_document);
  const reports = documents.filter((d, i, all) => all.findIndex(other => other.url === d.url) === i);
  const evidence = documents.find(d => d.og_description) ?? documents[0];
  const dek = storyDek(evidence, 420);
  const image = documents.find(d => d.og_image_url)?.og_image_url;
  const isSingleSource = reports.length < 2;

  // For single-source stories, load the involved entity's trend snapshots
  const primaryEntity = story.entities[0]?.entity;
  const entitySnapshots = primaryEntity
    ? await db.entityMetricSnapshot.findMany({
        where: { entity_id: primaryEntity.id },
        orderBy: { snapshot_at: 'asc' },
        select: {
          snapshot_at: true,
          mention_count: true,
          unique_source_count: true,
          discussion_count: true,
          mention_velocity: true,
        },
      })
    : [];

  const related = await getRelatedStories(
    story.id,
    story.entities.map(e => e.entity_id)
  );

  return (
    <main className="paper-shell story-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span>/</span>
        <span>Story & sources</span>
      </nav>

      <article className="story-detail">
        <header className="story-detail-header">
          <div>
            <div className="story-context">
              {story.entities.map(e => (
                <EntityFollowControl
                  key={e.entity_id}
                  entity={{ id: e.entity_id, name: e.entity.name }}
                  returnTo={topicPath(e.entity)}
                />
              ))}
            </div>
            <h1>{story.title}</h1>
            <p className="detail-dek">
              {dek.kind === 'domain' ? 'Reporting from ' : ''}
              {dek.text}
            </p>
            <div className="detail-actions">
              <SaveStory id={story.id} />
              <FollowToggle
                entityIds={story.entities.map(e => e.entity_id)}
                returnTo={'/stories/' + story.id}
                followLabel="Follow the story"
                followingLabel="Following this story"
                variant="outline"
              />
              <span className="source-count-indicator">
                {countIndependentSources(documents)}{' '}
                {countIndependentSources(documents) === 1 ? 'reporting source' : 'reporting sources'}
              </span>
            </div>
          </div>
          <StoryImage src={image} alt="" className="story-detail-image" />
        </header>

        <div className="story-editorial-layout">
          {/* Main Column: Original Reporting & Timelines */}
          <div className="story-main-column">
            {isSingleSource ? (
              <section className="source-section single-source-section">
                <header className="section-heading">
                  <div>
                    <span className="section-note">Original Coverage</span>
                    <h2>Primary source reporting</h2>
                  </div>
                  <p>Direct report indexed by TheDailyDev</p>
                </header>

                <article className="source-card single-source-card">
                  <StoryImage
                    src={reports[0].og_image_url}
                    alt=""
                    className="source-card-image"
                  />
                  <div className="source-card-content">
                    <div className="source-card-meta">
                      <Badge>{publisherDomain(reports[0].url)}</Badge>
                      <time dateTime={reports[0].published_at.toISOString()}>
                        {reports[0].published_at.toLocaleString('en-IN', {
                          timeZone: 'Asia/Kolkata',
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </time>
                    </div>
                    <h3>{reports[0].title}</h3>
                    {(reports[0].og_description || reports[0].content) && (
                      <p>{storyDek(reports[0], 360).text}</p>
                    )}
                    <Button asChild variant="default">
                      <a href={reports[0].url} target="_blank" rel="noopener noreferrer">
                        Read original reporting ↗
                      </a>
                    </Button>
                  </div>
                </article>

                {/* Entity trend context reusing Phase 9 sparkline */}
                {primaryEntity && (
                  <div className="story-entity-trend-wrapper">
                    <TopicTrendChart
                      snapshots={entitySnapshots}
                      entityName={primaryEntity.name}
                      entityType={primaryEntity.type}
                    />
                  </div>
                )}
              </section>
            ) : (
              <section className="source-section">
                <header className="section-heading">
                  <div>
                    <span className="section-note">Follow the evidence</span>
                    <h2>Original reporting</h2>
                  </div>
                  <p>In the order shared across developer sources</p>
                </header>

                <ol className="reporting-timeline">
                  {reports.map((document, index) => (
                    <li key={document.id}>
                      <div className="reporting-time">
                        <span className="reporting-dot" />
                        <time dateTime={document.published_at.toISOString()}>
                          {document.published_at.toLocaleString('en-IN', {
                            timeZone: 'Asia/Kolkata',
                            month: 'short',
                            day: 'numeric',
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </time>
                        <span>{index === 0 ? 'First indexed report' : 'Further reporting'}</span>
                      </div>

                      <article className="source-card">
                        <StoryImage
                          src={document.og_image_url}
                          alt=""
                          className="source-card-image"
                        />
                        <div className="source-card-content">
                          <Badge>{publisherDomain(document.url)}</Badge>
                          <h3>{document.title}</h3>
                          {(document.og_description || document.content) && (
                            <p>{storyDek(document, 320).text}</p>
                          )}
                          <Button asChild variant="outline">
                            <a href={document.url} target="_blank" rel="noopener noreferrer">
                              Read original ↗
                            </a>
                          </Button>
                        </div>
                      </article>
                    </li>
                  ))}
                </ol>

                <ReadingAccordion title="What does this timeline represent?">
                  <p>
                    These timestamps record when each link was indexed. They do not establish when the publisher first reported the news. Reports are grouped by matching topics and text; read the original sources to assess their claims.
                  </p>
                </ReadingAccordion>
              </section>
            )}

            <aside className="source-disclaimer">
              <p>
                TheDailyDev indexes and links to original reporting. We don’t host or claim ownership of this content — click through to read the full piece.
              </p>
              <Link href="/methodology">Learn how we source and rank →</Link>
            </aside>
          </div>

          {/* Sidebar Column: Ask This Story Intelligence */}
          <aside className="story-side-column">
            <StoryAsk
              storyId={story.id}
              signedIn={Boolean(userId)}
              subscriber={reader?.subscription_status === 'active'}
            />
          </aside>
        </div>
      </article>

      {related.length > 0 && (
        <section className="related-section">
          <header className="section-heading">
            <div>
              <span className="section-note">Continue reading</span>
              <h2>More in this sector</h2>
            </div>
            <p>Shared topics, related coverage</p>
          </header>
          <div className="related-grid">
            {related.map(item => (
              <StoryCard story={item} key={item.id} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
