import Link from 'next/link';
import { ShieldCheck, ArrowRight } from 'lucide-react';
import { MethodologyTimeline } from '@/components/methodology-timeline';

export default function MethodologyPage() {
  return <main className="paper-shell methodology-page">
    <article className="methodology-copy">
      <div className="methodology-intro">
        <h1>How stories earn a place.</h1>
        <p>Dअख़बार ingests source documents through official APIs and keeps a link to the original evidence.</p>
      </div>

      <div className="methodology-slop-callout">
        <div className="slop-callout-icon">
          <ShieldCheck size={20} className="text-data" />
        </div>
        <div className="slop-callout-body">
          <h3>Why this isn&rsquo;t AI slop</h3>
          <p>
            Learn about our sentence-level citation constraints, fail-closed verification engine,
            and deterministic clustering that prevents hallucinations before any LLM is invoked.
          </p>
          <Link href="/why-this-isnt-ai-slop" className="slop-callout-link">
            Read the architecture breakdown <ArrowRight size={14} className="inline-icon" />
          </Link>
        </div>
      </div>

      <MethodologyTimeline />
    </article>
  </main>;
}
