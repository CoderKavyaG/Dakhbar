import Link from 'next/link';
import { notFound } from 'next/navigation';
import { TrendingUp, Sparkles } from 'lucide-react';
import { ArticleGrid } from '@/components/article-grid';
import { StoryCard } from '@/components/story-card';
import { Badge } from '@/components/ui/badge';
import { getCategoryPageData } from '@/lib/reader-data';
import { topicPath } from '@/lib/topic-slug';

export const dynamic = 'force-dynamic';

export default async function CategoryPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const data = await getCategoryPageData(decodeURIComponent(slug));
  if (!data) notFound();

  const { category, entities, storyCount, stories, intelligence } = data;

  return (
    <main className="paper-shell category-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span>/</span>
        <Link href="/topics">Topics</Link>
        <span>/</span>
        <span>{category.title}</span>
      </nav>

      {/* Sector Hero */}
      <section className="category-hero">
        <div className="category-hero-content">
          <p className="section-note">Sector Intelligence</p>
          <h1>{category.title}</h1>
          <p className="category-hero-lead">{category.description}</p>
        </div>
      </section>

      {/* Sector Intelligence Panel */}
      <section className="category-intel-section" aria-labelledby="sector-intel-heading">
        <div className="category-intel-card">
          <header className="category-intel-header">
            <div className="category-intel-title">
              <span className="section-note">Developer Pulse · Sector Overview</span>
              <h2 id="sector-intel-heading">Sector Activity & Movement</h2>
            </div>
          </header>

          <div className="category-metrics-strip">
            <div className="category-stat-item">
              <span className="stat-label">Tracked Entities</span>
              <div className="stat-value">
                <strong>{entities.length}</strong>
                <small>in this sector</small>
              </div>
            </div>

            <div className="category-stat-item">
              <span className="stat-label">Daily Sector Mentions</span>
              <div className="stat-value">
                <strong>{intelligence.totalDailyMentions}</strong>
                <small>latest 24h cycle</small>
              </div>
            </div>

            <div className="category-stat-item">
              <span className="stat-label">Indexed Stories</span>
              <div className="stat-value">
                <strong>{storyCount}</strong>
                <small>cross-source reporting</small>
              </div>
            </div>
          </div>

          {/* Leaders & Velocity Movers */}
          {(intelligence.topGainers.length > 0 || intelligence.topByVolume.length > 0) && (
            <div className="category-movers-panel">
              {intelligence.topGainers.length > 0 && (
                <div className="movers-column">
                  <span className="movers-title">
                    <TrendingUp size={15} className="inline-icon text-data" /> Trending Up this Week
                  </span>
                  <ul className="movers-list">
                    {intelligence.topGainers.map(item => (
                      <li key={item.id} className="mover-item">
                        <Link href={topicPath({ name: item.name })} className="mover-link">
                          <span className="mover-name">{item.name}</span>
                          <span className="mover-pill pos">
                            +{item.latestVelocity?.toFixed(1)}% <span className="mover-counts">({item.previousMentions} → {item.latestMentions} / day)</span>
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {intelligence.topByVolume.length > 0 && (
                <div className="movers-column">
                  <span className="movers-title">
                    <Sparkles size={15} className="inline-icon" /> Highest Mention Activity
                  </span>
                  <ul className="movers-list">
                    {intelligence.topByVolume.map(item => (
                      <li key={item.id} className="mover-item">
                        <Link href={topicPath({ name: item.name })} className="mover-link">
                          <span className="mover-name">{item.name}</span>
                          <span className="mover-pill neutral">
                            {item.latestMentions} {item.latestMentions === 1 ? 'mention' : 'mentions'} / day
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Sector Entity Navigator */}
          <div className="category-entities-strip">
            <span className="sector-entities-label">All Sector Topics:</span>
            <div className="category-pills-row">
              {entities.map(e => (
                <Link
                  key={e.id}
                  href={topicPath({ name: e.name })}
                  className="category-entity-pill"
                >
                  <span className="pill-name">{e.name}</span>
                  {e.latestVelocity !== null && e.latestVelocity !== 0 && (
                    <span className={`pill-vel ${e.latestVelocity > 0 ? 'pos' : 'neg'}`}>
                      {e.latestVelocity > 0 ? '+' : ''}{e.latestVelocity.toFixed(0)}%
                    </span>
                  )}
                </Link>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Stories Grid */}
      <section className="category-stories-section">
        <header className="section-heading">
          <div>
            <span className="section-note">Sector Coverage</span>
            <h2>Reporting on {category.title}</h2>
          </div>
          <Badge>
            {storyCount} {storyCount === 1 ? 'story' : 'stories'}
          </Badge>
        </header>

        {stories.length === 0 ? (
          <div className="category-empty">
            <p>No recent stories indexed for this sector yet.</p>
          </div>
        ) : (
          <ArticleGrid className="article-grid-results">
            {stories.map(story => (
              <StoryCard key={story.id} story={story} />
            ))}
          </ArticleGrid>
        )}
      </section>
    </main>
  );
}
