import Link from 'next/link';
import { getFrontPageStories, issueNumber } from '@/lib/front-page';
import { SearchShortcut } from '@/components/search-shortcut';
import { Wordmark } from '@/components/wordmark';
import { countIndependentSources, storyDek } from '@/lib/story-evidence';

export const dynamic = 'force-dynamic';

function age(date: Date) {
  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000));
  return hours < 1 ? 'Fresh' : hours < 24 ? hours + 'h ago' : Math.floor(hours / 24) + 'd ago';
}

function isFresh(date: Date) {
  return Date.now() - date.getTime() < 2 * 3600000;
}

export default async function FrontPage() {
  const stories = await getFrontPageStories();
  const [lead, ...rest] = stories;
  const date = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date());
  return <main className="paper-shell">
    <header className="masthead">
      <div className="edition-line"><span>Vol. II · No. {issueNumber()}</span><span>{date}</span><span>Developer Intelligence</span></div>
      <div className="brand-row">
        <Wordmark />
        <form action="/search" className="masthead-search"><label htmlFor="q" className="sr-only">Search stories and entities</label><input id="q" name="q" placeholder="Search React, PostgreSQL, infrastructure…" /><SearchShortcut/><button>Search</button></form>
      </div>
      <nav className="section-nav" aria-label="Primary"><span>Today’s Edition</span><Link href="/search">Search the archive</Link><Link href="/admin">Admin</Link></nav>
    </header>
    {!lead ? <section className="empty-edition"><p className="kicker">The presses are ready</p><h1>No selected stories yet.</h1><p>Relevant stories appear here after entity matching and clustering.</p></section> :
    <>
      <section className="lead-story">
        <p className="kicker kicker-accent">Lead Story · {age(lead.updated_at)}</p>
        <h1><Link href={'/stories/' + lead.id}>{lead.title}</Link></h1>
        {(() => {
          const dek = storyDek(lead.documents[0].raw_document);
          const sources = countIndependentSources(lead.documents.map(item => item.raw_document));
          return <div className="lead-support">
            <p className={dek.kind === 'domain' ? 'domain-dek' : 'standfirst'}>{dek.kind === 'domain' ? 'via ' : ''}{dek.text}</p>
            {sources >= 2 && <p className="corroboration">Reported by {sources} sources</p>}
          </div>;
        })()}
        <div className="entity-row">{lead.entities.map(item => <Link key={item.entity_id} href={'/search?q=' + encodeURIComponent(item.entity.name)}>{item.entity.name}</Link>)}</div>
        <p className="margin-note">Updated {age(lead.updated_at)}</p>
      </section>
      <aside className="methodology-strip"><span>Ranked by evidence, not opinion</span><Link href="/methodology">how this works →</Link></aside>
      <section className="story-section">
        <div className="section-heading"><h2>Today’s Stories</h2><span>{stories.length} selected developments from the last 48 hours</span></div>
        <div className="story-grid">{rest.map((story, index) => {
          const dek = storyDek(story.documents[0].raw_document);
          const sources = countIndependentSources(story.documents.map(item => item.raw_document));
          return <article className={index === 0 ? 'story-card story-card-major' : 'story-card'} key={story.id}>
            <p className={isFresh(story.updated_at) ? 'kicker kicker-accent' : 'kicker'}>{story.entities[0].entity.name} · {age(story.updated_at)}</p>
            <h3><Link href={'/stories/' + story.id}>{story.title}</Link></h3>
            <p className={dek.kind === 'domain' ? 'domain-dek' : 'story-dek'}>{dek.kind === 'domain' ? 'via ' : ''}{dek.text}</p>
            {sources >= 2 && <p className="corroboration">Reported by {sources} sources</p>}
            <div className="entity-row">{story.entities.slice(0, 3).map(item => <Link key={item.entity_id} href={'/search?q=' + encodeURIComponent(item.entity.name)}>{item.entity.name}</Link>)}</div>
          </article>;
        })}</div>
      </section>
    </>}
    <footer className="paper-footer"><span>Dअख़बार · Phase 2.5</span><span>Official APIs · Deterministic clustering · Source-linked evidence</span></footer>
  </main>;
}
