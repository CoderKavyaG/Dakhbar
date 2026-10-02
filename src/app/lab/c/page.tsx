import Link from 'next/link';
import { getFrontPageStories } from '@/lib/front-page';
import { getDeveloperPulse } from '@/lib/pulse';
import { getPulseRadarData } from '@/lib/radar';
import { countIndependentSources, storyDek, storyDestination } from '@/lib/story-evidence';
import { topicPath } from '@/lib/topic-slug';
import {
  WireTrendUp,
  WireTrendDown,
  WireConfirmed,
  WireSource,
  WireFollow,
} from '@/components/lab/symbols';
import '../lab-c.css';

export const dynamic = 'force-dynamic';

export default async function LabCPage() {
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

  const dateStr = new Date().toISOString().replace('T', ' // ').slice(0, 22) + ' UTC';

  return (
    <main className="lab-c-shell">
      <div className="lab-c-container">
        {/* Lab Navigation Switcher */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '1rem', fontSize: '0.78rem' }}>
          <Link href="/lab/a" style={{ padding: '4px 8px', border: '1px solid #121311', textDecoration: 'none', color: '#121311' }}>← Direction A (Pop Tabloid)</Link>
          <Link href="/lab/b" style={{ padding: '4px 8px', border: '1px solid #121311', textDecoration: 'none', color: '#121311' }}>← Direction B (Metro Data)</Link>
          <span style={{ fontWeight: 700, padding: '4px 8px', background: '#121311', color: '#f2eee5' }}>DIRECTION C: WIRE DISPATCH / TYPEWRITER</span>
        </div>

        {/* Ticker Tape */}
        <div className="lab-c-ticker-tape">
          <span>TELEX FEED // ACTIVE DISPATCH WIRE</span>
          <span className="hot">● LIVE SIGNAL // {stories.length} DISPATCHES INDEXED</span>
          <span>SPEED: 1200 BAUD</span>
        </div>

        {/* Wire Masthead */}
        <header className="lab-c-masthead">
          <div className="lab-c-dateline">DATELINE: {dateStr} // THE DAILY DEV WIRE</div>
          <h1 className="lab-c-title">WIRE DISPATCH</h1>
          <div className="lab-c-title-sub">
            RAW AGGREGATED DEVELOPER INTELLIGENCE // UNEDITED FIELD CORRESPONDENCE
          </div>
        </header>

        {/* Dispatch Two-Column Layout */}
        <div className="lab-c-layout">
          {/* Main Lead Ticket */}
          <article className="lab-c-lead-ticket">
            <div>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '1rem' }}>
                <span className="lab-c-ticket-badge">TOP WIRE // LEAD</span>
                <span style={{ color: 'var(--wire-signal)', fontWeight: 700, fontSize: '0.75rem' }}>
                  REF: {lead.id.slice(0, 10).toUpperCase()}
                </span>
              </div>

              <h2 className="lab-c-lead-headline">
                <Link href={leadDest.href}>{lead.title}</Link>
              </h2>

              {/* Wire Excerpt Format */}
              <div className="lab-c-wire-quote">
                <div className="lab-c-wire-quote-tag">// WIRE COPY // QUOTE TRANSCRIPTION:</div>
                "{leadDek.text}"
              </div>
            </div>

            <div className="lab-c-ticket-footer">
              <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
                <span>[CORROBORATION: {leadSources} DOMAINS]</span>
                <WireConfirmed />
              </div>
              <Link href={leadDest.href} className="lab-c-action-btn">
                [TRANSMISSION DETAILS] →
              </Link>
            </div>
          </article>

          {/* Wire Teleprinter Radar & Pulse */}
          <aside className="lab-c-wire-box">
            <div className="lab-c-wire-box-header">
              <h3>// TELEPRINTER PULSE //</h3>
              <span style={{ color: 'var(--wire-signal)', fontWeight: 700 }}>24H METER</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {pulse.items.slice(0, 6).map((item: any, idx: number) => {
                const isPos = item.velocity >= 0;
                const meterBlocks = isPos ? '████░░░░' : '░░░░████';
                return (
                  <div key={item.entityId} className="lab-c-pulse-row">
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span style={{ color: 'var(--wire-faded)', fontSize: '0.72rem' }}>[{String(idx + 1).padStart(2, '0')}]</span>
                      <Link href={topicPath({ name: item.name })}>
                        {item.name.toUpperCase()}
                      </Link>
                    </div>
                    <span className="lab-c-bar-meter">
                      {meterBlocks} {isPos ? `+${item.velocity}%` : `${item.velocity}%`}
                    </span>
                  </div>
                );
              })}
            </div>

            <div style={{ marginTop: '1.25rem', paddingTop: '0.75rem', borderTop: '1px dashed var(--wire-perforation)', fontSize: '0.72rem', color: 'var(--wire-faded)' }}>
              <div>[RADAR STATUS: {radar.totalTracked} ENTITIES / {radar.eligibleCount} VERIFIED ACTIVE]</div>
            </div>
          </aside>
        </div>

        {/* Section Perforation Divider */}
        <div className="lab-c-section-cut">
          <h2>INCOMING WIRE FEED</h2>
          <span style={{ fontSize: '0.78rem', color: 'var(--wire-faded)' }}>// SECTION 02: SECONDARY TRANSCRIPTS //</span>
        </div>

        {/* Wire Grid */}
        <div className="lab-c-wire-grid">
          {rest.slice(0, 8).map((story: any, i: number) => {
            const docs = story.documents.map((m: any) => m.raw_document);
            const ev = docs.find((d: any) => d.og_description) ?? docs[0];
            const dest = storyDestination(story.id, docs);
            const dek = storyDek(ev, 190);
            const count = countIndependentSources(docs);

            return (
              <article key={story.id} className="lab-c-wire-card">
                <div>
                  <div className="lab-c-wire-card-tag">
                    [DISPATCH-{String(i + 1).padStart(2, '0')}] // {story.entities[0]?.entity.name.toUpperCase() || 'WIRE'}
                  </div>

                  <h3 className="lab-c-wire-card-title">
                    <Link href={dest.href}>{story.title}</Link>
                  </h3>

                  {/* Designed Typewriter Excerpt */}
                  <div className="lab-c-wire-card-excerpt">
                    "{dek.text}"
                  </div>
                </div>

                <div className="lab-c-wire-card-footer">
                  <span>[SOURCES: {count}]</span>
                  <Link href={dest.href} style={{ color: 'var(--wire-carbon)', fontWeight: 700, textDecoration: 'none' }}>
                    [EXPAND] →
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
