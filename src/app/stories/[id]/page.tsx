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
import { AdPlacement } from '@/components/ad-placement';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ReadingAccordion } from '@/components/ui/accordion';
import { getRelatedStories } from '@/lib/related-stories';
import { countIndependentSources, publisherDomain, storyDek } from '@/lib/story-evidence';
import { topicPath } from '@/lib/topic-slug';
import { getCategoryForEntity } from '@/lib/taxonomy';
import { processStoryContent } from '@/lib/story-content';
import { GitHubIcon } from '@/components/icons/github';
import type { Metadata } from 'next';
import { Layers, ShieldCheck, Clock, ExternalLink, Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const story = await db.story.findUnique({
    where: { id },
    include: {
      documents: {
        orderBy: { raw_document: { published_at: 'asc' } },
        include: { raw_document: { select: { title: true, url: true, og_description: true, og_image_url: true, content: true, published_at: true } } },
      },
      entities: { include: { entity: true } },
    },
  });

  if (!story || !story.documents.length) {
    return { title: 'Story Not Found' };
  }

  const documents = story.documents.map(m => m.raw_document);
  const evidence = documents.find(d => d.og_description) ?? documents[0];
  const dek = storyDek(evidence, 240);
  const heroImage = documents.find(d => d.og_image_url)?.og_image_url;

  return {
    title: story.title,
    description: dek.text,
    openGraph: {
      title: story.title,
      description: dek.text,
      type: 'article',
      url: `/stories/${story.id}`,
      images: heroImage ? [{ url: heroImage, alt: story.title }] : undefined,
      publishedTime: documents[0]?.published_at ? new Date(documents[0].published_at).toISOString() : undefined,
      modifiedTime: story.updated_at.toISOString(),
      tags: story.entities.map(e => e.entity.name),
    },
    twitter: {
      card: heroImage ? 'summary_large_image' : 'summary',
      title: story.title,
      description: dek.text,
      images: heroImage ? [heroImage] : undefined,
    },
  };
}

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
  const heroImage = documents.find(d => d.og_image_url)?.og_image_url;
  const isSingleSource = reports.length < 2;
  const sourceCount = countIndependentSources(documents);

  // Load trend snapshots for the primary entity
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

  const processedContent = processStoryContent(evidence.content, story.title, reports[0]?.url);
  const allRepos = [
    ...processedContent.githubRepos,
    ...reports.flatMap(r => (r.url.includes('github.com') ? [{
      url: r.url,
      fullName: r.url.replace(/^https?:\/\/github\.com\//i, '').replace(/[/?#].*$/, ''),
      owner: r.url.replace(/^https?:\/\/github\.com\//i, '').split('/')[0] || '',
      repo: r.url.replace(/^https?:\/\/github\.com\//i, '').split('/')[1] || '',
    }] : [])),
  ].filter((repo, idx, arr) => arr.findIndex(x => x.url.toLowerCase() === repo.url.toLowerCase()) === idx);

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: story.title,
    description: dek.text,
    datePublished: documents[0]?.published_at ? new Date(documents[0].published_at).toISOString() : story.created_at.toISOString(),
    dateModified: story.updated_at.toISOString(),
    mainEntityOfPage: {
      '@type': 'WebPage',
      '@id': `/stories/${story.id}`,
    },
    author: [
      {
        '@type': 'Organization',
        name: 'Dअख़बार Editorial',
        url: 'https://dakhbar.com',
      },
    ],
    image: heroImage ? [heroImage] : undefined,
    publisher: {
      '@type': 'Organization',
      name: 'Dअख़बार',
      url: 'https://dakhbar.com',
    },
    citation: reports.map(r => r.url),
    about: story.entities.map(e => ({
      '@type': 'Thing',
      name: e.entity.name,
    })),
  };

  const primaryCategory = primaryEntity
    ? getCategoryForEntity(primaryEntity.name, primaryEntity.type)
    : null;

  return (
    <main className="paper-shell story-detail-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Breadcrumb Navigation */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span>/</span>
        {primaryCategory ? (
          <>
            <Link href={`/category/${primaryCategory.slug}`}>{primaryCategory.title}</Link>
            <span>/</span>
          </>
        ) : null}
        {primaryEntity ? (
          <>
            <Link href={topicPath(primaryEntity)}>{primaryEntity.name}</Link>
            <span>/</span>
          </>
        ) : null}
        <span>Story & Sources</span>
      </nav>

      {/* Main Story Article */}
      <article className="story-master-article">
        {/* Top Hero Masthead Section */}
        <header className="story-master-header">
          {/* Entity Tags & Category Badge */}
          <div className="story-entity-chips">
            {story.entities.map(e => (
              <EntityFollowControl
                key={e.entity_id}
                entity={{ id: e.entity_id, name: e.entity.name }}
                returnTo={topicPath(e.entity)}
              />
            ))}
          </div>

          {/* BroadSheet Headline */}
          <h1 className="story-master-title">{story.title}</h1>

          {/* Master Dek / Summary */}
          <p className="story-master-dek">
            {dek.kind === 'domain' ? 'Reporting from ' : ''}
            {processedContent.cleanLead || dek.text}
          </p>

          {/* Primary Source Reporting Card — Prominently placed at top under Title */}
          <div className="primary-source-lead-card">
            <div className="source-lead-meta">
              <div className="source-lead-publisher">
                {reports[0].url.includes('github.com') ? (
                  <span className="source-icon-badge github-badge">
                    <GitHubIcon size={15} /> GitHub
                  </span>
                ) : reports[0].url.includes('news.ycombinator.com') ? (
                  <span className="source-icon-badge hn-badge">
                    <span className="y-combinator-icon">Y</span> Hacker News
                  </span>
                ) : reports[0].url.includes('dev.to') ? (
                  <span className="source-icon-badge devto-badge">
                    DEV
                  </span>
                ) : (
                  <span className="source-icon-badge web-badge">
                    <ExternalLink size={13} /> {publisherDomain(reports[0].url)}
                  </span>
                )}
                <span className="source-lead-domain">{publisherDomain(reports[0].url)}</span>
                {reports[0].author && (
                  <span className="source-lead-author">Dispatched by {reports[0].author}</span>
                )}
              </div>

              <div className="source-lead-actions">
                <a
                  href={reports[0].url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="read-primary-btn"
                >
                  Read original reporting <ExternalLink size={13} className="inline-icon" />
                </a>
              </div>
            </div>

            {/* Action Strip: Corroboration verification + Pub Time on Left; Save & Follow on Right */}
            <div className="story-action-strip">
              <div className="action-strip-left">
                <span className="source-corroboration-pill">
                  <ShieldCheck size={14} className="inline-icon text-data" />
                  {sourceCount} {sourceCount === 1 ? 'reporting source' : 'independent sources verified'}
                </span>
                <time
                  dateTime={reports[0].published_at.toISOString()}
                  className="story-pub-time"
                >
                  <Clock size={13} className="inline-icon" />
                  {reports[0].published_at.toLocaleString('en-IN', {
                    timeZone: 'Asia/Kolkata',
                    month: 'short',
                    day: 'numeric',
                    hour: 'numeric',
                    minute: '2-digit',
                  })}
                </time>
              </div>

              <div className="action-strip-right">
                <SaveStory id={story.id} variant="outline" />
                <FollowToggle
                  entityIds={story.entities.map(e => e.entity_id)}
                  returnTo={'/stories/' + story.id}
                  followLabel="Follow story"
                  followingLabel="Following story"
                  variant="outline"
                />
              </div>
            </div>
          </div>

          {/* Featured Hero Visual Image */}
          {heroImage && (
            <div className="story-hero-media-wrap">
              <StoryImage
                src={heroImage}
                alt={story.title}
                className="story-hero-featured-image"
              />
              <span className="hero-media-caption">
                Primary report visual via {publisherDomain(reports[0].url)}
              </span>
            </div>
          )}
        </header>

        {/* 2-Column Broadsheet Reading Grid */}
        <div className="story-columns-grid">
          {/* Left Main Column: Grounded QA + Primary Sources */}
          <div className="story-content-column">
            {/* Full Story Content & Editorial Synthesis */}
            <section className="story-full-dispatch" aria-labelledby="story-dispatch-heading">
              <header className="dispatch-header">
                <div>
                  <span className="section-note">Synthesized Story Dispatch</span>
                  <h2 id="story-dispatch-heading">Full Story Coverage</h2>
                </div>
                <Badge className="badge-sources-count">
                  {sourceCount} {sourceCount === 1 ? 'reporting source' : 'corroborated sources'}
                </Badge>
              </header>

              <div className="dispatch-lead-prose">
                {processedContent.paragraphs.length > 0 ? (
                  processedContent.paragraphs.map((para, i) => (
                    <p key={i} className={i === 0 ? "lead-paragraph" : "body-paragraph"}>
                      {para}
                    </p>
                  ))
                ) : (
                  <p className="lead-paragraph">
                    {evidence.og_description ?? dek.text}
                  </p>
                )}

                {/* GitHub Open Source Repository Cards */}
                {allRepos.map(repo => (
                  <div key={repo.url} className="story-github-repo-card">
                    <div className="github-card-left">
                      <span className="github-logo-wrap">
                        <GitHubIcon size={24} />
                      </span>
                      <div className="github-card-info">
                        <span className="github-card-kicker">Open Source Codebase</span>
                        <h4 className="github-card-title">{repo.fullName}</h4>
                        <p className="github-card-desc">Source repository and technical assets on GitHub</p>
                      </div>
                    </div>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="github-inspect-btn"
                    >
                      View on GitHub <ExternalLink size={13} className="inline-icon" />
                    </a>
                  </div>
                ))}

                {/* Live Project / Web App Deployment Card (if non-HN and non-GitHub) */}
                {!reports[0].url.includes('news.ycombinator.com') && !reports[0].url.includes('github.com') && (
                  <div className="story-live-link-card">
                    <div className="live-link-left">
                      <div>
                        <span className="live-link-kicker">Project Site & Demonstration</span>
                        <h4 className="live-link-title">{publisherDomain(reports[0].url)}</h4>
                      </div>
                    </div>
                    <a
                      href={reports[0].url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="live-visit-btn"
                    >
                      Open {publisherDomain(reports[0].url)} <ExternalLink size={13} className="inline-icon" />
                    </a>
                  </div>
                )}

                {reports.length > 1 && (
                  <p className="subsequent-paragraph">
                    This development was independently reported and cross-corroborated across {sourceCount} developer sources, tracing first from {publisherDomain(reports[0].url)} and subsequently confirmed with additional technical disclosures.
                  </p>
                )}
              </div>

              {/* Key Developments Takeaways */}
              <div className="story-takeaways-card">
                <h3 className="takeaways-title">
                  <Sparkles size={15} className="inline-icon text-data" /> Key Developments & Technical Summary
                </h3>
                <ul className="takeaways-list">
                  {reports.map((report, idx) => (
                    <li key={report.id} className="takeaway-item">
                      <span className="takeaway-bullet">0{idx + 1}</span>
                      <div className="takeaway-text">
                        <h4 className="takeaway-headline">{report.title}</h4>
                        <p>{storyDek(report, 280).text}</p>
                        <span className="takeaway-source">Reported by {publisherDomain(report.url)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Grounded Story Q&A Assistant with Mascot */}
            <StoryAsk
              storyId={story.id}
              signedIn={Boolean(userId)}
              subscriber={reader?.subscription_status === 'active'}
            />

            {/* Primary Source Reporting Section */}
            <section className="source-reporting-section" aria-labelledby="sources-heading">
              <header className="section-heading">
                <div>
                  <span className="section-note">Original Coverage</span>
                  <h2 id="sources-heading">
                    {isSingleSource ? 'Primary source reporting' : 'Corroborated reporting timeline'}
                  </h2>
                </div>
                <p>
                  {isSingleSource
                    ? `Direct report indexed by Dअख़बार from ${publisherDomain(reports[0].url)}`
                    : 'Ordered by first discovery and subsequent confirmation across developer sources'}
                </p>
              </header>

              {isSingleSource ? (
                /* Single Source Clean Card */
                <article className="primary-source-card">
                  <div className="source-card-header">
                    <Badge className="badge-source-domain">{publisherDomain(reports[0].url)}</Badge>
                    <time dateTime={reports[0].published_at.toISOString()} className="source-time">
                      {reports[0].published_at.toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </time>
                  </div>
                  <h3 className="source-card-title">{reports[0].title}</h3>
                  {(reports[0].og_description || reports[0].content) && (
                    <p className="source-card-dek">{storyDek(reports[0], 360).text}</p>
                  )}
                  <div className="source-card-footer">
                    <Button asChild variant="default" className="read-original-btn">
                      <a href={reports[0].url} target="_blank" rel="noopener noreferrer">
                        Read original on {publisherDomain(reports[0].url)} <ExternalLink size={14} />
                      </a>
                    </Button>
                  </div>
                </article>
              ) : (
                /* Multi-Source Timeline */
                <div className="reporting-timeline-wrap">
                  <ol className="reporting-timeline">
                    {reports.map((document, index) => (
                      <li key={document.id} className="timeline-node">
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
                          <span className="timeline-status-tag">
                            {index === 0 ? 'First indexed report' : 'Further reporting'}
                          </span>
                        </div>

                        <article className="source-card">
                          <div className="source-card-header">
                            <Badge className="badge-source-domain">{publisherDomain(document.url)}</Badge>
                          </div>
                          <h3 className="source-card-title">{document.title}</h3>
                          {(document.og_description || document.content) && (
                            <p className="source-card-dek">{storyDek(document, 320).text}</p>
                          )}
                          <div className="source-card-footer">
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
                      These timestamps record when each link was indexed. They do not establish when the
                      publisher first reported the news. Reports are grouped by matching topics and text;
                      read the original sources to assess their claims.
                    </p>
                  </ReadingAccordion>
                </div>
              )}

              {/* Publisher Provenance & Fair Use Notice */}
              <aside className="source-disclaimer">
                <p>
                  Dअख़बार indexes and links to original reporting. We don’t host or claim ownership of
                  this content — click through to read the full piece on the original publication.
                </p>
                <Link href="/methodology" className="disclaimer-methodology-link">
                  Learn how we source and rank signals →
                </Link>
              </aside>
            </section>
          </div>

          {/* Right Sidebar Column: Topic Telemetry, Key Entities, and Sponsor Placement */}
          <aside className="story-sidebar-column">
            {/* Entity Trend Sparkline Widget (Moved cleanly to sidebar) */}
            {primaryEntity && entitySnapshots.length > 0 && (
              <div className="sidebar-widget story-trend-widget">
                <div className="widget-header">
                  <div className="widget-title-group">
                    <Layers size={14} className="text-data inline-icon" />
                    <h4>{primaryEntity.name} Buzz</h4>
                  </div>
                  <Link href={topicPath(primaryEntity)} className="widget-view-all">
                    Topic ↗
                  </Link>
                </div>
                <TopicTrendChart
                  snapshots={entitySnapshots}
                  entityName={primaryEntity.name}
                  entityType={primaryEntity.type}
                />
              </div>
            )}

            {/* Key Entities in This Story */}
            <div className="sidebar-widget tagged-entities-widget">
              <div className="widget-header">
                <h4>Tagged Topics</h4>
                <span className="data-count">{story.entities.length}</span>
              </div>
              <div className="tagged-entities-list">
                {story.entities.map(e => (
                  <div key={e.entity_id} className="tagged-entity-row">
                    <Link href={topicPath(e.entity)} className="entity-link-title">
                      {e.entity.name}
                    </Link>
                    <EntityFollowControl
                      entity={{ id: e.entity_id, name: e.entity.name }}
                      returnTo={'/stories/' + story.id}
                    />
                  </div>
                ))}
              </div>
            </div>

            {/* Sponsor / Partner Dispatch Placement */}
            <AdPlacement slot="story-sidebar" />
          </aside>
        </div>
      </article>

      {/* Related Coverage Bottom Grid */}
      {related.length > 0 && (
        <section className="related-section" aria-labelledby="related-heading">
          <header className="section-heading">
            <div>
              <span className="section-note">Continue reading</span>
              <h2 id="related-heading">More in this sector</h2>
            </div>
            <p>Shared topics, related developments</p>
          </header>
          <div className="related-stories-grid">
            {related.map(item => (
              <StoryCard story={item} key={item.id} />
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
