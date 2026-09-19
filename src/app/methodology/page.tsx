import Link from 'next/link';
import { MethodologyTimeline } from '@/components/methodology-timeline';
import { Wordmark } from '@/components/wordmark';

export default function MethodologyPage() {
  return <main className="paper-shell methodology-page">
    <header className="compact-header"><Wordmark /><nav><Link href="/">Today</Link><Link href="/search">Search</Link></nav></header>
    <article className="methodology-copy">
      <div className="methodology-intro">
        <h1>How stories earn a place.</h1>
        <p>Dअख़बार ingests source documents through official APIs and keeps a link to the original evidence.</p>
      </div>
      <MethodologyTimeline />
    </article>
  </main>;
}
