import Link from 'next/link';
import { getFrontPageStories } from '@/lib/front-page';
import { getDeveloperPulse } from '@/lib/pulse';
import { getPulseRadarData } from '@/lib/radar';
import { countIndependentSources, storyDek, storyDestination } from '@/lib/story-evidence';
import { topicPath } from '@/lib/topic-slug';
import {
  MetroTrendUp,
  MetroTrendDown,
  MetroConfirmed,
  MetroSource,
  MetroFollow,
} from '@/components/lab/symbols';
import '../lab-b.css';

export const dynamic = 'force-dynamic';

export default async function LabBPage() {
  const [stories, pulse, radar] = await Promise.all([
    getFrontPageStories(24),
    getDeveloperPulse(8),
    getPulseRadarData(),
  ]);

  const [lead, ...rest] = stories;
  if (!lead) return null;

  const leadDocs = lead.documents.map((m: any) => m.raw_document);
  const leadEvidence = leadDocs.find((d: any) => d.og_description) ?? leadDocs[0];
  const leadDek = storyDek(leadEvidence, 360);
  const leadDest = storyDestination(lead.id, leadDocs);
  const leadSources = countIndependentSources(leadDocs);

  return (
    <main className="lab-b-shell">
      <div className="lab-b-container">
        {/* Lab Navigation Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1.5rem', fontFamily: 'var(--font-plex-mono)', fontSize: '0.8rem' }}>
          <Link href="/lab/a" style={{ padding: '4px 10px', border: '1px solid #161817', textDecoration: 'none', color: '#161817' }}>← Direction A (Pop Tabloid)</Link>
          <span style={{ fontWeight: 700, padding: '4px 10px', background: '#161817', color: '#fff' }}>DIRECTION B: DATA AS EDITORIAL ILLUSTRATION</span>
          <Link href="/lab/c" style={{ padding: '4px 10px', border: '1px solid #161817', textDecoration: 'none', color: '#161817' }}>→ Direction C (Wire Dispatch)</Link>
        </div>

        {/* Architectural Index Bar */}
        <div className="lab-b-index-strip">
          <div>Edition № 42 // Section 01: Core Signals</div>
          <div>Transit Index // {stories.length} Stations Active</div>
          <div>Copenhagen & Dubai Editorial Reference</div>
        </div>

        {/* Master Lead & Infographic Column */}
        <div className="lab-b-headline-masthead">
          <article className="lab-b-lead-area">
            <div className="lab-b-station-label">
              <span className="lab-b-station-node" />
              <span>Terminal Lead // {lead.entities[0]?.entity.name || 'Broadsheet'}</span>
            </div>

            <h1 className="lab-b-lead-title">
              <Link href={leadDest.href}>{lead.title}</Link>
            </h1>

            {/* Refined Text-Serif Pull-Quote */}
            <div className="lab-b-lead-serif-dek">
              {leadDek.text}
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', fontFamily: 'var(--font-plex-mono)', fontSize: '0.78rem', color: 'var(--metro-ink-muted)' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <MetroSource size={12} /> {leadSources} corroborated node{leadSources !== 1 ? 's' : ''}
              </span>
              <span>Coordinates: 24h consensus</span>
              <Link
                href={leadDest.href}
                style={{ marginLeft: 'auto', color: 'var(--metro-ink)', textDecoration: 'none', fontWeight: 600, borderBottom: '1px solid var(--metro-ink)' }}
              >
                Inspect Station Report →
              </Link>
            </div>
          </article>

          {/* Designed Infographic: Transit Route Map Pulse */}
          <aside className="lab-b-infographic-panel">
            <div className="lab-b-panel-header">
              <h3>Developer Line</h3>
              <span>24h Velocity Vector</span>
            </div>

            <div className="lab-b-route-list">
              {pulse.items.slice(0, 6).map((item: any, idx: number) => {
                const isAcc = item.velocity >= 0;
                return (
                  <div key={item.entityId} className="lab-b-route-item">
                    <span className={`lab-b-route-stop ${isAcc ? 'accelerating' : 'cooling'}`} />
                    <div className="lab-b-route-info">
                      <Link href={topicPath({ name: item.name })} className="lab-b-route-name">
                        {item.name}
                      </Link>
                      <div className="lab-b-route-meta">
                        <span>Stop {String(idx + 1).padStart(2, '0')}</span>
                        <span style={{ color: isAcc ? 'var(--line-teal)' : 'var(--line-red)', fontWeight: 600 }}>
                          {isAcc ? `+${item.velocity}%` : `${item.velocity}%`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Labeled Stations Summary */}
            <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--metro-hairline)', fontSize: '0.72rem', fontFamily: 'var(--font-plex-mono)', color: 'var(--metro-ink-muted)' }}>
              <div>Radar Quadrant: {radar.quadrants.emerging_accelerating.length} accelerating / {radar.quadrants.established_stable.length} stable</div>
            </div>
          </aside>
        </div>

        {/* Section Index 02 */}
        <div className="lab-b-section-label">
          <span>02 // Assembled Field Reports</span>
          <span>Hairline Coordinate Grid</span>
        </div>

        {/* Editorial Danish Grid */}
        <div className="lab-b-editorial-grid">
          {rest.slice(0, 8).map((story: any, i: number) => {
            const docs = story.documents.map((m: any) => m.raw_document);
            const ev = docs.find((d: any) => d.og_description) ?? docs[0];
            const dest = storyDestination(story.id, docs);
            const dek = storyDek(ev, 200);
            const count = countIndependentSources(docs);
            const lineClass = i % 3 === 0 ? 'ai' : i % 3 === 1 ? 'infra' : 'tools';

            return (
              <article key={story.id} className="lab-b-story-tile">
                <span className={`lab-b-tile-line-accent ${lineClass}`} />

                <div>
                  <div className="lab-b-tile-number">
                    SIGNAL {String(i + 1).padStart(2, '0')} // {story.entities[0]?.entity.name || 'DISPATCH'}
                  </div>

                  <h3 className="lab-b-tile-title">
                    <Link href={dest.href}>{story.title}</Link>
                  </h3>

                  {/* Refined Text-Only Serif Excerpt */}
                  <div className="lab-b-tile-quote">
                    “{dek.text}”
                  </div>
                </div>

                <div className="lab-b-tile-footer">
                  <span>{count} node{count !== 1 ? 's' : ''} verified</span>
                  <Link href={dest.href} style={{ color: 'var(--metro-ink)', textDecoration: 'none', fontWeight: 600 }}>
                    Report →
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
