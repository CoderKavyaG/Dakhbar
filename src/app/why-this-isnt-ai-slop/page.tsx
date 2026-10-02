import type { Metadata } from 'next';
import Link from 'next/link';
import { ShieldCheck, Database, Layers, CheckCircle2, ArrowRight, GitBranch, Cpu, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export const metadata: Metadata = {
  title: 'Why This Isn’t AI Slop: Our Citation-Verification Architecture',
  description:
    'A direct, technical explanation for skeptical engineers: how sentence-level citation verification, fail-closed validation, and deterministic clustering prevent hallucinations.',
  openGraph: {
    title: 'Why This Isn’t AI Slop: Our Citation-Verification Architecture',
    description:
      'How Dअख़बार verifies every claim with sentence-level source provenance, fail-closed verification, and deterministic clustering.',
    type: 'article',
    url: '/why-this-isnt-ai-slop',
  },
  twitter: {
    card: 'summary',
    title: 'Why This Isn’t AI Slop: Our Citation-Verification Architecture',
    description:
      'A technical breakdown of citation verification, fail-closed parsing, and deterministic clustering.',
  },
};

export default function WhyNotSlopPage() {
  return (
    <main className="paper-shell anti-slop-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span>/</span>
        <Link href="/methodology">Methodology</Link>
        <span>/</span>
        <span>Architecture & Trust</span>
      </nav>

      <header className="anti-slop-hero">
        <span className="section-note">Engineering Architecture</span>
        <h1>Why this isn’t AI slop.</h1>
        <p className="anti-slop-lead">
          A direct, technical breakdown for engineers who are tired of LLM hallucination factories,
          unverified summaries, and scraper wrappers.
        </p>
      </header>

      <div className="anti-slop-grid">
        <section className="anti-slop-section">
          <div className="section-icon-header">
            <Cpu size={22} className="text-data" />
            <h2>1. Deterministic clustering before any LLM is called</h2>
          </div>
          <p>
            Most &ldquo;AI news&rdquo; apps shove raw RSS dumps directly into an LLM context window and ask it to
            guess what happened. This produces vague, hallucinated summaries with no stable truth foundation.
          </p>
          <p>
            In Dअख़बार, story grouping is completely deterministic and runs on local algorithms:
          </p>
          <ul className="anti-slop-list">
            <li>
              <strong>Hard Entity Overlap Gate:</strong> Two articles can never merge into a shared story unless they share verified named entities (languages, frameworks, libraries, protocols).
            </li>
            <li>
              <strong>Deterministic 384D Embeddings:</strong> We use local feature hashing and vector cosine similarity. No paid embedding models or external LLMs touch the clustering pipeline.
            </li>
            <li>
              <strong>72-Hour Temporal Window:</strong> Ingestion bounds story merging to active development windows, preventing false merges across distinct release cycles.
            </li>
          </ul>
        </section>

        <section className="anti-slop-section">
          <div className="section-icon-header">
            <ShieldCheck size={22} className="text-data" />
            <h2>2. Sentence-level citation enforcement: [1], [2]</h2>
          </div>
          <p>
            When an LLM is invoked (such as in Ask My Story or Research Dossiers), it operates under strict citation constraints:
          </p>
          <ul className="anti-slop-list">
            <li>
              <strong>Mandatory Source Footnotes:</strong> Every declarative sentence must cite a primary source index in square brackets. Uncited sentences are illegal.
            </li>
            <li>
              <strong>Zero Extrapolation:</strong> Prompts explicitly forbid background speculation. If the source material does not report a metric or quote, the model cannot invent it.
            </li>
            <li>
              <strong>Transparent Provenance:</strong> Footnote indices map 1:1 to indexed publisher URLs, canonical timestamps, and author domains.
            </li>
          </ul>
        </section>

        <section className="anti-slop-section">
          <div className="section-icon-header">
            <Lock size={22} className="text-data" />
            <h2>3. Fail-closed verification engine</h2>
          </div>
          <p>
            What happens when an LLM hallucinates anyway? In typical products, the hallucination reaches the user.
            In Dअख़बार, our verification engine runs post-generation validation:
          </p>
          <div className="anti-slop-code-block">
            <code>
              {`// Verification Gate: Fail-Closed Pipeline
if (!verifyResearchSection(report.executiveBrief, evidence)) {
  // If claims lack citation or introduce ungrounded entities:
  // Discard the output immediately.
  // Fall back to deterministic raw evidence.
}`}
            </code>
          </div>
          <p>
            If a generated output fails bracket parsing, quotes an unindexed source, or introduces an invented number,
            the entire model response is discarded and the reader is presented with the raw, verified primary evidence instead.
          </p>
        </section>

        <section className="anti-slop-section">
          <div className="section-icon-header">
            <GitBranch size={22} className="text-data" />
            <h2>4. No scraping, no paywall bypass, 100% provenance</h2>
          </div>
          <p>
            We believe developer journalism requires respect for the reporters, maintainers, and publications doing the real work:
          </p>
          <ul className="anti-slop-list">
            <li>
              <strong>Official Ingestion APIs:</strong> We ingest via public Hacker News Firebase APIs, official GitHub GraphQL, Dev.to REST, and legitimate Atom/RSS publisher feeds.
            </li>
            <li>
              <strong>Canonical URLs Retained:</strong> We never disguise sources or strip attribution. Every card and evidence timeline displays the actual reporting domain.
            </li>
            <li>
              <strong>Independent Corroboration:</strong> We count unique domain names, not repeated syndication feeds. Two reposts from the same source count as one source.
            </li>
          </ul>
        </section>

        <section className="anti-slop-section">
          <div className="section-icon-header">
            <Database size={22} className="text-data" />
            <h2>5. Empirical telemetry, not LLM &ldquo;vibes&rdquo;</h2>
          </div>
          <p>
            Developer Pulse (&ldquo;Moving Today&rdquo;) does not ask an AI what is trending.
            It calculates exact 24-hour UTC window deltas against historical snapshot records stored in PostgreSQL:
          </p>
          <p className="text-mono-sub">
            <code>Velocity = ((Today Mentions - Prior Day Mentions) / Prior Day Mentions) * 100%</code>
          </p>
          <p>
            Anti-noise gates enforce a minimum sample size before any topic can rank. If a technology had 1 mention yesterday and 2 today, it is filtered out rather than claiming &ldquo;+100% growth&rdquo;.
          </p>
        </section>
      </div>

      <footer className="anti-slop-footer">
        <div className="anti-slop-footer-card">
          <h3>Inspect the reporting for yourself</h3>
          <p>Explore today’s edition or review the complete methodology timeline.</p>
          <div className="anti-slop-actions">
            <Button asChild variant="default">
              <Link href="/">
                Browse Front Page <ArrowRight size={15} className="inline-icon" />
              </Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/methodology">Read Full Methodology</Link>
            </Button>
          </div>
        </div>
      </footer>
    </main>
  );
}
