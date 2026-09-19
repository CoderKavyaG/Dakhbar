import Link from 'next/link';
import { searchStories } from '@/lib/search-data';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q ?? '';
  const results = await searchStories(query);
  return <main className="paper-shell search-page">
    <header className="compact-header"><Link href="/" className="wordmark">Dअख़बार</Link><span>Search / Explore</span></header>
    <section className="search-hero"><p className="kicker">The archive</p><h1>Find a technology or understand a development.</h1>
      <form action="/search" className="search-form"><label htmlFor="search-q">Search</label><div><input id="search-q" name="q" defaultValue={query} placeholder="Try React, PostgreSQL, database performance…" autoFocus/><button>Search</button></div></form>
    </section>
    {query && <section className="search-results">
      <div className="section-heading"><h2>Results for “{query}”</h2><span>{results.intent === 'navigational' ? 'Entity match' : 'Full-text search'} · {results.stories.length} stories</span></div>
      {results.intent === 'navigational' && results.entityMatches[0] && <div className="entity-match"><p className="kicker">Likely destination</p><h3>{results.entityMatches[0].name}</h3><p>{results.entityMatches[0].type} · {Math.round(results.entityMatches[0].score * 100)}% name confidence</p></div>}
      <div className="result-list">{results.stories.map(result => <article key={result.id}><p className="kicker">Updated {result.updated_at.toLocaleString('en-IN')} · relevance {result.score.toFixed(2)}</p><h3><Link href={'/stories/' + result.id}>{result.title}</Link></h3></article>)}</div>
      {!results.stories.length && <p className="empty-results">No matching stories. Try a broader entity name or keyword.</p>}
    </section>}
  </main>;
}
