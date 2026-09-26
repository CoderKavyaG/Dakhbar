import Link from 'next/link';
import { ArrowRight, Compass } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getTopicsIndexData } from '@/lib/reader-data';
import { topicPath } from '@/lib/topic-slug';

export const dynamic = 'force-dynamic';

export default async function TopicsIndexPage() {
  const { categories, totalEntities } = await getTopicsIndexData();

  return (
    <main className="paper-shell topics-index-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span>/</span>
        <span>Topics & Sectors</span>
      </nav>

      <section className="topics-hero">
        <div className="topics-hero-content">
          <p className="section-note">Taxonomy & Intelligence</p>
          <h1>Topics & Sectors</h1>
          <p className="topics-hero-lead">
            {totalEntities} tracked entities across AI foundation labs, cloud infrastructure, and developer tooling.
            Select any entity for full story coverage and historical mention velocity.
          </p>
        </div>

        <div className="topics-radar-banner">
          <div className="radar-banner-content">
            <Badge className="badge-radar">
              <Compass size={12} className="inline-icon" /> Developer Pulse Radar
            </Badge>
            <h3>Market Momentum Quadrants</h3>
            <p>
              Map emerging breakout tools, surging leaders, and foundational infrastructure across all {totalEntities} tracked technologies.
            </p>
          </div>
          <Button asChild variant="default" className="radar-banner-btn">
            <Link href="/pulse">
              Open Pulse Radar <ArrowRight size={15} className="inline-icon" />
            </Link>
          </Button>
        </div>
      </section>

      <div className="topics-categories-container">
        {categories.map(category => (
          <section
            key={category.slug}
            className="topics-category-section"
            aria-labelledby={`sector-${category.slug}`}
          >
            <header className="topics-category-header">
              <div className="topics-category-title-wrap">
                <span className="section-note">Sector</span>
                <h2 id={`sector-${category.slug}`}>{category.title}</h2>
                <p>{category.description}</p>
              </div>

              <div className="topics-category-actions">
                <Badge>
                  {category.entityCount} {category.entityCount === 1 ? 'entity' : 'entities'}
                </Badge>
                <Link
                  href={`/category/${category.slug}`}
                  className="topics-category-explore-link"
                >
                  Explore sector overview <ArrowRight size={14} className="inline-icon" />
                </Link>
              </div>
            </header>

            <div className="topics-entity-grid">
              {category.entities.map(entity => (
                <Link
                  key={entity.id}
                  href={topicPath({ name: entity.name })}
                  className="topics-entity-card"
                >
                  <div className="topics-entity-main">
                    <span className="topics-entity-name">{entity.name}</span>
                    <span className="topics-entity-type">{entity.type}</span>
                  </div>

                  <div className="topics-entity-meta">
                    <span className="topics-story-count">
                      {entity.storyCount} {entity.storyCount === 1 ? 'story' : 'stories'}
                    </span>
                    {entity.latestMentions > 0 && (
                      <span className="topics-mention-pill">
                        {entity.latestMentions} / day
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
