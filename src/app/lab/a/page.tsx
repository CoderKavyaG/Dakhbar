import Link from 'next/link';
import { getFrontPageStories } from '@/lib/front-page';
import { getDeveloperPulse } from '@/lib/pulse';
import { getPulseRadarData } from '@/lib/radar';
import { countIndependentSources, storyDek, storyDestination } from '@/lib/story-evidence';
import { topicPath } from '@/lib/topic-slug';
import {
  TabloidTrendUp,
  TabloidTrendDown,
  TabloidConfirmed,
  TabloidUnclear,
  TabloidSource,
  TabloidFollow,
} from '@/components/lab/symbols';
import '../lab-a.css';

export const dynamic = 'force-dynamic';

export default async function LabAPage() {
  const [stories, pulse, radar] = await Promise.all([
    getFrontPageStories(24),
    getDeveloperPulse(8),
    getPulseRadarData(),
  ]);

  const [lead, ...rest] = stories;
  if (!lead) return null;

  const leadDocs = lead.documents.map((m: any) => m.raw_document);
  const leadEvidence = leadDocs.find((d: any) => d.og_description) ?? leadDocs[0];
  const leadDek = storyDek(leadEvidence, 340);
  const leadDest = storyDestination(lead.id, leadDocs);
  const leadSources = countIndependentSources(leadDocs);

  return (
    <main className="lab-a-shell">
      <div className="lab-a-container">
        {/* Lab Navigation Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', fontFamily: 'var(--font-plex-mono)' }}>
          <span style={{ fontWeight: 700, padding: '4px 8px', background: '#000', color: '#fff' }}>DIRECTION A: POP TABLOID</span>
          <Link href="/lab/b" style={{ padding: '4px 8px', border: '1.5px solid #000', textDecoration: 'none', color: '#000' }}>→ Direction B (Metro Data)</Link>
          <Link href="/lab/c" style={{ padding: '4px 8px', border: '1.5px solid #000', textDecoration: 'none', color: '#000' }}>→ Direction C (Wire Dispatch)</Link>
        </div>

        {/* Masthead */}
        <header className="lab-a-masthead">
          <div>
            <span className="lab-a-edition-stamp">Front Page Dispatch</span>
            <h1 className="lab-a-masthead-title">The Daily <span>Dev</span></h1>
          </div>
          <div style={{ textAlign: 'right', fontFamily: 'var(--font-plex-mono)', fontSize: '0.85rem', fontWeight: 600 }}>
            <div>{stories.length} stories broken today</div>
            <div style={{ color: 'var(--tabloid-orange)' }}>Live edition active</div>
          </div>
        </header>

        {/* Lead Stage & Sidebar Grid */}
        <div className="lab-a-hero-grid">
          {/* Main Lead Story Card */}
          <article className="lab-a-lead-card">
            <div>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <span className="lab-a-sticker-badge orange">
                  <TabloidConfirmed size={14} /> Breaking Lead
                </span>
                {lead.entities.slice(0, 2).map((e: any) => (
                  <Link
                    key={e.entity_id}
                    href={topicPath(e.entity)}
                    className="lab-a-sticker-badge yellow"
                    style={{ textDecoration: 'none' }}
                  >
                    {e.entity.name}
                  </Link>
                ))}
              </div>

              <h2 className="lab-a-lead-headline">
                <Link href={leadDest.href}>{lead.title}</Link>
              </h2>

              {/* Text-Only Lead Pull-Quote */}
              <div className="lab-a-pullquote-box">
                “{leadDek.text}”
              </div>
            </div>

            <div className="lab-a-meta-row">
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                  <TabloidSource size={13} /> {leadSources} independent sources
                </span>
                <span>Verified reporting</span>
              </div>
              <Link href={leadDest.href} className="lab-a-btn-punch">
                Read Lead Story →
              </Link>
            </div>
          </article>

          {/* Sidebar: Pop Developer Pulse */}
          <aside className="lab-a-sidebar">
            <div className="lab-a-pulse-block">
              <div className="lab-a-pulse-header">
                <h3 className="lab-a-pulse-title">Developer Pulse</h3>
                <span style={{ fontFamily: 'var(--font-plex-mono)', fontSize: '0.72rem', fontWeight: 700 }}>24H VELOCITY</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column' }}>
                {pulse.items.slice(0, 6).map((item: any, idx: number) => {
                  const isUp = item.velocity >= 0;
                  return (
                    <div key={item.entityId} className="lab-a-pulse-item">
                      <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                        <span style={{ fontFamily: 'var(--font-plex-mono)', fontWeight: 800, fontSize: '0.85rem' }}>#{idx + 1}</span>
                        <Link href={topicPath({ name: item.name })} className="lab-a-pulse-entity">
                          {item.name}
                        </Link>
                      </div>
                      <span className="lab-a-pulse-velocity">
                        {isUp ? <TabloidTrendUp size={12} /> : <TabloidTrendDown size={12} />}
                        {isUp ? `+${item.velocity}%` : `${item.velocity}%`}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Radar Callout Block */}
            <div style={{ background: '#fff', border: '3px solid #000', padding: '1.25rem', boxShadow: '5px 5px 0 #000' }}>
              <div style={{ fontFamily: 'Funnel Display', fontWeight: 800, fontSize: '1.1rem', textTransform: 'uppercase', marginBottom: '6px' }}>
                Radar Momentum
              </div>
              <p style={{ fontSize: '0.88rem', margin: '0 0 10px', color: '#444', lineHeight: 1.4 }}>
                {radar.eligibleCount} developer entities tracked across 4 empirical momentum quadrants.
              </p>
              <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                {radar.quadrants.emerging_accelerating.slice(0, 3).map((pt: any) => (
                  <span key={pt.id} style={{ background: 'var(--tabloid-yellow)', border: '1.5px solid #000', padding: '2px 6px', fontSize: '0.75rem', fontWeight: 700, fontFamily: 'var(--font-plex-mono)' }}>
                    ▲ {pt.name}
                  </span>
                ))}
              </div>
            </div>
          </aside>
        </div>

        {/* Asymmetric Stories Grid */}
        <div className="lab-a-grid-title">Today’s Dispatches</div>
        <div className="lab-a-stories-grid">
          {rest.slice(0, 8).map((story: any, i: number) => {
            const docs = story.documents.map((m: any) => m.raw_document);
            const ev = docs.find((d: any) => d.og_description) ?? docs[0];
            const dest = storyDestination(story.id, docs);
            const dek = storyDek(ev, 200);
            const count = countIndependentSources(docs);
            const badgeColor = i % 3 === 0 ? 'blue' : i % 3 === 1 ? 'yellow' : 'orange';

            return (
              <article key={story.id} className="lab-a-story-card">
                <div>
                  <div style={{ display: 'flex', gap: '6px', marginBottom: '8px' }}>
                    <span className={`lab-a-sticker-badge ${badgeColor}`}>
                      {story.entities[0]?.entity.name || 'Dispatch'}
                    </span>
                  </div>

                  <h3 className="lab-a-card-title">
                    <Link href={dest.href}>{story.title}</Link>
                  </h3>

                  {/* Designed Text-Only Treatment: Real Excerpt Pull-Quote */}
                  <div className="lab-a-card-pullquote">
                    “{dek.text}”
                  </div>
                </div>

                <div className="lab-a-card-footer">
                  <span>{count} source{count !== 1 ? 's' : ''}</span>
                  <Link href={dest.href} style={{ color: 'inherit', fontWeight: 700, textDecoration: 'none' }}>
                    Read story →
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
