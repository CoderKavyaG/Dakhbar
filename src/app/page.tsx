import Link from 'next/link';
import { getFrontPageStories, issueNumber } from '@/lib/front-page';
import { SearchShortcut } from '@/components/search-shortcut';

export const dynamic = 'force-dynamic';

function age(date: Date) {
  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000));
  return hours < 1 ? 'Fresh' : hours < 24 ? hours + 'h ago' : Math.floor(hours / 24) + 'd ago';
}

export default async function FrontPage() {
  const stories = await getFrontPageStories();
  const [lead, ...rest] = stories;
  const date = new Intl.DateTimeFormat('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Kolkata' }).format(new Date());
  return <main className="paper-shell">
    <header className="masthead">
      <div className="edition-line"><span>Vol. II · No. {issueNumber()}</span><span>{date}</span><span>Developer Intelligence</span></div>
      <div className="brand-row">
        <Link href="/" className="wordmark">Dअख़बार</Link>
        <form action="/search" className="masthead-search"><label htmlFor="q" className="sr-only">Search stories and entities</label><input id="q" name="q" placeholder="Search React, PostgreSQL, infrastructure…" /><SearchShortcut/><button>Search</button></form>
      </div>
      <nav className="section-nav" aria-label="Primary"><span>Today’s Edition</span><Link href="/search">Search the archive</Link><Link href="/admin">Admin</Link></nav>
    </header>
    {!lead ? <section className="empty-edition"><p className="kicker">The presses are ready</p><h1>No clustered stories yet.</h1><p>Run the ingestion and clustering jobs to produce today’s edition.</p></section> :
    <>
      <section className="lead-grid">
        <article className="lead-story">
          <p className="kicker">Lead Story · {age(lead.updated_at)}</p>
          <h1><Link href={'/stories/' + lead.id}>{lead.title}</Link></h1>
          <p className="standfirst">Evidence from {lead.documents.length} document{lead.documents.length === 1 ? '' : 's'} across {new Set(lead.documents.map(item => item.raw_document.source_id)).size} source{new Set(lead.documents.map(item => item.raw_document.source_id)).size === 1 ? '' : 's'}.</p>
          <div className="entity-row">{lead.entities.map(item => <Link key={item.entity_id} href={'/search?q=' + encodeURIComponent(item.entity.name)}>{item.entity.name}</Link>)}</div>
          <p className="margin-note">Significance {lead.significance_score.toFixed(2)} · Updated {age(lead.updated_at)}</p>
        </article>
        <aside className="edition-note"><p className="kicker">How this page works</p><h2>Ranked by evidence, not opinion.</h2><p>Stories are grouped through literal entity matches and deterministic similarity. No generated summaries or model-written claims appear here.</p><Link href="/search">Explore the evidence →</Link></aside>
      </section>
      <section className="story-section">
        <div className="section-heading"><h2>Today’s Stories</h2><span>{stories.length} developments in the last 48 hours</span></div>
        <div className="story-grid">{rest.map((story, index) => <article className={index < 2 ? 'story-card story-card-major' : 'story-card'} key={story.id}>
          <p className="kicker">{story.entities[0]?.entity.name ?? 'Developer ecosystem'} · {age(story.updated_at)}</p>
          <h3><Link href={'/stories/' + story.id}>{story.title}</Link></h3>
          <p>{story.documents.length} source document{story.documents.length === 1 ? '' : 's'} · score {story.significance_score.toFixed(2)}</p>
          <div className="entity-row">{story.entities.slice(0, 3).map(item => <Link key={item.entity_id} href={'/search?q=' + encodeURIComponent(item.entity.name)}>{item.entity.name}</Link>)}</div>
        </article>)}</div>
      </section>
    </>}
    <footer className="paper-footer"><span>Dअख़बार · Phase 2</span><span>Official APIs · Deterministic clustering · Source-linked evidence</span></footer>
  </main>;
}
