import Link from 'next/link';
import { CorroborationBar } from '@/components/corroboration-bar';
import { SearchShortcut } from '@/components/search-shortcut';
import { StoryCard } from '@/components/story-card';
import { Wordmark } from '@/components/wordmark';
import { getFrontPageStories } from '@/lib/front-page';
import { storyDek } from '@/lib/story-evidence';

export const dynamic = 'force-dynamic';

function relativeAge(date: Date) {
  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000));
  return hours < 1 ? 'just now' : hours < 24 ? hours + 'h ago' : Math.floor(hours / 24) + 'd ago';
}

export default async function FrontPage() {
  const stories = await getFrontPageStories();
  const [lead, ...rest] = stories;
  const date = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

  return <main className="paper-shell">
    <header className="masthead">
      <div className="brand-row">
        <Wordmark />
        <nav aria-label="Primary"><Link href="/methodology">Methodology</Link><Link href="/search">Archive</Link><Link href="/admin">Admin</Link></nav>
      </div>
      <form action="/search" className="masthead-search">
        <label htmlFor="q">Search the developer news archive</label>
        <div><input id="q" name="q" placeholder="React, PostgreSQL, infrastructure…" /><SearchShortcut/><button>Search</button></div>
      </form>
    </header>

    {!lead ? <section className="empty-edition"><h1>No selected stories yet.</h1><p>Relevant stories appear here after entity matching and clustering.</p></section> :
    <>
      <section className="edition-intro">
        <p>{date}</p>
        <span className="data-type">{stories.length} selected stories</span>
      </section>

      <article className="lead-story">
        <div className="lead-meta">
          <div>{lead.entities.map(item => <Link key={item.entity_id} href={'/search?q=' + encodeURIComponent(item.entity.name)}>{item.entity.name}</Link>)}</div>
          <time className="data-type" dateTime={lead.updated_at.toISOString()}>{relativeAge(lead.updated_at)}</time>
        </div>
        <h1><Link href={'/stories/' + lead.id}>{lead.title}</Link></h1>
        {(() => {
          const dek = storyDek(lead.documents[0].raw_document);
          return <p className={dek.kind === 'domain' ? 'lead-domain' : 'lead-dek'}>{dek.kind === 'domain' ? 'Reporting from ' : ''}{dek.text}</p>;
        })()}
        <CorroborationBar documents={lead.documents.map(member => ({
          url: member.raw_document.url,
          sourceName: member.raw_document.source.name,
          publishedAt: member.raw_document.published_at,
          similarity: member.similarity_score,
        }))} />
      </article>

      <div className="methodology-strip">
        <p>Selected from the wider archive using entity relevance, recency, and independent reporting.</p>
        <Link href="/methodology">How ranking works →</Link>
      </div>

      <section className="story-section">
        <header className="section-heading"><h2>More from today</h2><p>Quieter signals, searchable in full.</p></header>
        <div className="story-grid">{rest.map((story, index) => <StoryCard story={story} featured={index === 0} key={story.id} />)}</div>
      </section>
    </>}

    <footer className="paper-footer"><span>Dअख़बार</span><span>Official sources</span><span>Deterministic clustering</span><span>Evidence linked</span></footer>
  </main>;
}
