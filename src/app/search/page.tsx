import Link from 'next/link';
import { StoryCard } from '@/components/story-card';
import { Wordmark } from '@/components/wordmark';
import { searchStories } from '@/lib/search-data';
import { storyCountLabel } from '@/lib/story-count';

export const dynamic = 'force-dynamic';

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const query = (await searchParams).q ?? '';
  const results = await searchStories(query);
  const entity = results.intent === 'navigational' ? results.entityMatches[0] : undefined;

  return <main className="paper-shell search-page">
    <header className="compact-header"><Wordmark /><nav><Link href="/">Today</Link><span>Search</span></nav></header>
    <section className="search-hero">
      <h1>Search the developer news archive.</h1>
      <p>Find a technology, company, or development across every indexed source.</p>
      <form action="/search" className="search-form">
        <label htmlFor="search-q">Search</label>
        <div><input id="search-q" name="q" defaultValue={query} placeholder="React, PostgreSQL, database performance…" autoFocus/><button>Search</button></div>
      </form>
    </section>

    {query && <div className="search-results">
      {entity && <section className="topic-result">
        <div className="result-section-title"><span>Topic</span><span className="data-type">matched entity</span></div>
        <article>
          <div><h2>{entity.name}</h2><p>{entity.type}</p></div>
          <strong className="data-type">{storyCountLabel(results.stories.length)}</strong>
        </article>
      </section>}

      <section className="search-story-results">
        <div className="result-section-title"><span>Stories</span><span className="data-type">{storyCountLabel(results.stories.length)}</span></div>
        <div className="search-story-grid">{results.stories.map(story => <StoryCard story={story} key={story.id} />)}</div>
        {!results.stories.length && <p className="empty-results">No matching stories. Try a broader technology name or keyword.</p>}
      </section>
    </div>}
  </main>;
}
