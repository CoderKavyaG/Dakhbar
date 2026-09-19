import Link from 'next/link';
import { Wordmark } from '@/components/wordmark';

export default function MethodologyPage() {
  return <main className="paper-shell methodology-page">
    <header className="compact-header"><Wordmark /><nav><Link href="/">Today</Link><Link href="/search">Search</Link></nav></header>
    <article className="methodology-copy">
      <h1>How stories earn a place.</h1>
      <p>Dअख़बार ingests source documents through official APIs and keeps a link to the original evidence.</p>
      <h2>What reaches the Front Page</h2>
      <p>A story must name at least one known developer technology, company, product, or project. Stories without a matched entity remain searchable in the archive but are not promoted or labeled as developer news.</p>
      <h2>How stories are grouped</h2>
      <p>Literal entity overlap is required before documents can join a story. A deterministic text-similarity check then identifies close matches. Ambiguous matches remain separate for administrator review.</p>
      <h2>How stories are ordered</h2>
      <p>Recent reporting, corroboration from independent linked domains, and the number of source documents determine ordering. The Front Page selects a small edition from the larger searchable archive.</p>
      <h2>What is not generated</h2>
      <p>This phase does not use an LLM to write summaries or claims. Self-post excerpts come directly from the source text; link posts show the linked domain.</p>
    </article>
  </main>;
}
