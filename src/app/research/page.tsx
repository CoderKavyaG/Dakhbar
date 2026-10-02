import Link from 'next/link';
import { notFound } from 'next/navigation';
import { auth } from '@clerk/nextjs/server';
import {
  FileText,
  Clock,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Lock,
  ArrowRight,
  Database,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import {
  generateResearchReport,
  assembleResearchEvidence,
  type ResearchReport,
} from '@/lib/research';
import { DESK_PRICE_USD } from '@/lib/billing/config';

export const dynamic = 'force-dynamic';

export default async function ResearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const topic = (q ?? '').trim();

  if (!topic) {
    return (
      <main className="paper-shell research-page">
        <header className="research-hero">
          <div>
            <span className="section-note">Desk Feature</span>
            <h1>Research Mode</h1>
            <p>
              Generate multi-story dossiers with real source-grounded synthesis, chronological
              timelines, and verified key takeaways across the full corpus.
            </p>
          </div>
          <form action="/research" className="search-form">
            <label htmlFor="research-q">Research topic or technology</label>
            <div>
              <input
                id="research-q"
                name="q"
                placeholder="e.g. How is Anthropic competing with OpenAI?"
              />
              <Button aria-label="Start research">
                <FileText size={18} /> Research
              </Button>
            </div>
          </form>
        </header>
      </main>
    );
  }

  const { userId } = await auth();
  const reader = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { subscription_status: true },
      })
    : null;

  const isSubscriber = reader?.subscription_status === 'active';

  // If reader is NOT an active subscriber, show research preview and upgrade card
  if (!isSubscriber) {
    const previewAssembly = await assembleResearchEvidence(topic);

    return (
      <main className="paper-shell research-page">
        <nav className="breadcrumbs" aria-label="Breadcrumb">
          <Link href="/">Today</Link>
          <span>/</span>
          <Link href={`/search?q=${encodeURIComponent(topic)}`}>Search</Link>
          <span>/</span>
          <span>Research Dossier</span>
        </nav>

        <header className="research-header">
          <div className="research-title-wrap">
            <span className="section-note">Research Dossier Preview</span>
            <h1>{topic}</h1>
            <p>
              Multi-story investigation across {previewAssembly.stories.length} indexed story
              clusters and {previewAssembly.evidence.length} corroborated sources.
            </p>
          </div>
        </header>

        <div className="research-upgrade-card">
          <div className="upgrade-icon-wrap">
            <Lock size={28} className="text-data" />
          </div>
          <h2>Research Mode is exclusive to Desk members</h2>
          <p>
            Desk subscribers receive complete source-grounded executive briefs, deterministic
            chronological timelines, and verified key takeaways synthesized across the entire
            developer corpus.
          </p>
          <div className="upgrade-stats-preview">
            <div className="preview-stat">
              <strong>{previewAssembly.stories.length}</strong>
              <small>indexed stories</small>
            </div>
            <div className="preview-stat">
              <strong>{previewAssembly.evidence.length}</strong>
              <small>corroborated sources</small>
            </div>
            <div className="preview-stat">
              <strong>24h</strong>
              <small>shared cache window</small>
            </div>
          </div>
          <Button asChild variant="default" className="upgrade-cta-btn">
            <Link href="/pricing">
              Upgrade to Desk for ${DESK_PRICE_USD}/month <ArrowRight size={16} className="inline-icon" />
            </Link>
          </Button>
          <small className="upgrade-footnote">Cancel anytime. Free 14-day trial included.</small>
        </div>

        {previewAssembly.timeline.length > 0 && (
          <section className="research-section preview-blur">
            <header className="section-heading">
              <div>
                <span className="section-note">Chronological Scope</span>
                <h2>Assembled Reporting Timeline</h2>
              </div>
            </header>
            <div className="research-timeline">
              {previewAssembly.timeline.slice(0, 3).map(item => (
                <div key={item.date} className="timeline-item">
                  <div className="timeline-date">{item.formattedDate}</div>
                  <div className="timeline-content">
                    <h3>{item.storyTitle}</h3>
                    <div className="timeline-sources">
                      {item.sources.map(s => (
                        <Badge key={s.url}>{s.domain}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>
    );
  }

  // Active Subscriber: Generate or fetch cached research report
  const result = await generateResearchReport({
    topic,
    userId: userId!,
  });

  const report: ResearchReport | null = result.report;
  if (!report) {
    if (result.error?.includes('limit reached') || result.error?.includes('capacity is fully utilized')) {
      const isGlobal = result.error?.includes('capacity is fully utilized');
      return (
        <main className="paper-shell research-page">
          <header className="research-header">
            <span className="section-note">Daily Capacity Notice</span>
            <h1>{isGlobal ? 'System Research Capacity Reached' : 'Daily Research Limit Reached'}</h1>
            <p>{result.error}</p>
          </header>
          <div className="quota-notice-card">
            <p>
              {isGlobal
                ? 'To protect free-tier LLM tokens per day (TPD) ceilings across all subscribers, new research dossier generation is paused until quota resets at 00:00 UTC. Existing cached topics remain fully readable.'
                : 'To maintain verified research quality, accounts are allotted 5 newly generated dossiers per day. Your allotment resets at 00:00 UTC.'}
            </p>
            <Button asChild variant="outline">
              <Link href={`/search?q=${encodeURIComponent(topic)}`}>
                Return to Search Results
              </Link>
            </Button>
          </div>
        </main>
      );
    }
    notFound();
  }

  return (
    <main className="paper-shell research-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span>/</span>
        <Link href={`/search?q=${encodeURIComponent(topic)}`}>Search</Link>
        <span>/</span>
        <span>Research Dossier</span>
      </nav>

      <header className="research-header">
        <div className="research-title-wrap">
          <div className="research-badge-row">
            <span className="section-note">Desk Research Dossier</span>
            {report.richnessTier === 'preliminary' ? (
              <Badge className="badge-preliminary">
                <AlertCircle size={11} className="inline-icon" /> Preliminary Coverage ({report.storyCount} stories)
              </Badge>
            ) : report.richnessTier === 'comprehensive' ? (
              <Badge className="badge-comprehensive">
                <Sparkles size={11} className="inline-icon" /> Comprehensive Synthesis ({report.storyCount} stories)
              </Badge>
            ) : (
              <Badge className="badge-standard">
                <Sparkles size={11} className="inline-icon" /> Standard Synthesis ({report.storyCount} stories)
              </Badge>
            )}
            {report.cached ? (
              <Badge className="badge-cached">Shared Topic Cache (24h)</Badge>
            ) : (
              <Badge className="badge-live">Live Verified Generation</Badge>
            )}
          </div>
          <h1>{report.topic}</h1>
          <p className="research-subtitle">
            Synthesized from {report.storyCount} story clusters and {report.evidenceCount}{' '}
            independent reporting sources across the developer corpus.
          </p>
        </div>

        <div className="research-meta-strip">
          <div className="research-meta-item">
            <Database size={15} className="inline-icon text-data" />
            <span>
              <strong>{report.storyCount}</strong> stories analyzed
            </span>
          </div>
          <div className="research-meta-item">
            <ShieldCheck size={15} className="inline-icon text-data" />
            <span>
              <strong>{report.evidenceCount}</strong> verified citations
            </span>
          </div>
          <div className="research-meta-item">
            <Clock size={15} className="inline-icon text-data" />
            <span>Generated {new Date(report.generatedAt).toISOString().slice(0, 10)}</span>
          </div>
        </div>
      </header>

      {/* Preliminary Coverage Disclaimer Banner */}
      {report.richnessTier === 'preliminary' && (
        <div className="research-preliminary-banner">
          <AlertCircle size={20} className="text-data inline-icon flex-shrink-0" />
          <div>
            <strong>Limited source coverage — fewer independent reports than most topics</strong>
            <p>
              This dossier is synthesized from {report.storyCount} stories and {report.evidenceCount} corroborated sources near the minimum evidence gate. While all facts and citations are strictly verified, analytical breadth is narrower than well-corroborated topics.
            </p>
          </div>
        </div>
      )}

      {/* Section 1: Executive Brief */}
      <section className="research-section" aria-labelledby="exec-brief-title">
        <header className="section-heading">
          <div>
            <span className="section-note">Section 1</span>
            <h2 id="exec-brief-title">Executive Brief</h2>
          </div>
          {report.executiveBrief.verified && (
            <Badge className="badge-verified">
              <ShieldCheck size={13} className="inline-icon" /> Source-Grounding Verified
            </Badge>
          )}
        </header>

        <div className="executive-brief-card">
          <p className="executive-brief-text">{report.executiveBrief.text}</p>
        </div>
      </section>

      {/* Section 2: Chronological Timeline */}
      <section className="research-section" aria-labelledby="timeline-title">
        <header className="section-heading">
          <div>
            <span className="section-note">Section 2 · Deterministic</span>
            <h2 id="timeline-title">Chronological Timeline</h2>
          </div>
          <span className="timeline-note">Built from authentic document publication records</span>
        </header>

        <div className="research-timeline">
          {report.timeline.map((item, idx) => (
            <div key={item.date + '-' + idx} className="timeline-item">
              <span className="timeline-dot" />
              <div className="timeline-content">
                <time className="timeline-date-label">{item.formattedDate}</time>
                <h3 className="timeline-story-title">
                  <Link href={`/stories/${item.storyId}`}>{item.storyTitle}</Link>
                </h3>
                <div className="timeline-sources-list">
                  {item.sources.map(src => (
                    <a
                      key={src.url}
                      href={`#source-${src.citation}`}
                      className="timeline-source-pill"
                    >
                      [{src.citation}] {src.domain}
                    </a>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 3: Key Points */}
      <section className="research-section" aria-labelledby="keypoints-title">
        <header className="section-heading">
          <div>
            <span className="section-note">Section 3</span>
            <h2 id="keypoints-title">Key Points & Takeaways</h2>
          </div>
          {report.keyPoints.verified && (
            <Badge className="badge-verified">
              <ShieldCheck size={13} className="inline-icon" /> Fact Citations Confirmed
            </Badge>
          )}
        </header>

        <div className="key-points-card">
          <ul className="key-points-list">
            {report.keyPoints.points.map((point, index) => (
              <li key={index} className="key-point-item">
                <span className="point-bullet">▪</span>
                <span className="point-text">{point}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Section 4: Source Material */}
      <section className="research-section" aria-labelledby="sources-title">
        <header className="section-heading">
          <div>
            <span className="section-note">Section 4 · Provenance</span>
            <h2 id="sources-title">Source Material & References</h2>
          </div>
          <span className="sources-count">{report.sources.length} indexed documents</span>
        </header>

        <div className="research-sources-grid">
          {report.sources.map(source => (
            <article
              key={source.citation + '-' + source.documentId}
              id={`source-${source.citation}`}
              className="research-source-card"
            >
              <div className="source-card-header">
                <span className="source-citation-badge">[{source.citation}]</span>
                <Badge>{source.domain}</Badge>
                <time className="source-time">{source.reportedAt}</time>
              </div>

              <h3 className="source-title">
                <a href={source.url} target="_blank" rel="noopener noreferrer">
                  {source.title} <ExternalLink size={13} className="inline-icon" />
                </a>
              </h3>

              <p className="source-excerpt">{source.excerpt}</p>

              <div className="source-card-footer">
                <Link href={`/stories/${source.storyId}`} className="source-story-link">
                  View story cluster →
                </Link>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* Editorial Methodology Footnote */}
      <footer className="research-footer">
        <div className="research-footer-content">
          <Sparkles size={16} className="inline-icon text-data" />
          <p>
            Dअख़बार Research Dossiers synthesize cross-verified developer reporting into structured intelligence,
            citing primary evidence with sentence-level provenance across indexed sources.
          </p>
        </div>
      </footer>
    </main>
  );
}
