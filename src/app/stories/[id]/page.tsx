import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { CorroborationBar } from '@/components/corroboration-bar';
import { Wordmark } from '@/components/wordmark';
import { confidencePercent } from '@/lib/corroboration';
import { publisherDomain } from '@/lib/story-evidence';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await db.story.findUnique({
    where: { id },
    include: {
      entities: { include: { entity: true } },
      documents: {
        orderBy: [{ raw_document: { published_at: 'asc' } }],
        include: { raw_document: { include: { source: true } } },
      },
    },
  });
  if (!story) notFound();

  const corroboration = story.documents.map(member => ({
    url: member.raw_document.url,
    sourceName: member.raw_document.source.name,
    publishedAt: member.raw_document.published_at,
    similarity: member.similarity_score,
  }));

  return <main className="paper-shell story-page">
    <header className="compact-header"><Wordmark /><nav><Link href="/">Today</Link><Link href="/search">Search</Link></nav></header>
    <article className="story-detail">
      <header className="story-detail-header">
        <div className="story-context">
          {story.entities.map(item => <Link key={item.entity_id} href={'/search?q=' + encodeURIComponent(item.entity.name)}>{item.entity.name}</Link>)}
        </div>
        <h1>{story.title}</h1>
      </header>

      <CorroborationBar documents={corroboration} />

      <section className="source-section">
        <div className="source-section-heading">
          <h2>Original reporting</h2>
          <p>{story.documents.length} {story.documents.length === 1 ? 'report' : 'reports'} indexed</p>
        </div>
        <div className="source-card-list">{story.documents.map(member => {
          const domain = publisherDomain(member.raw_document.url) || member.raw_document.source.name;
          const confidence = confidencePercent(member.similarity_score);
          return <article className="source-card" key={member.raw_document_id}>
            <div className="source-card-meta">
              <span>{domain}</span>
              <time className="data-type" dateTime={member.raw_document.published_at.toISOString()}>
                {member.raw_document.published_at.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}
              </time>
            </div>
            <h3>{member.raw_document.title}</h3>
            <div className="source-card-action">
              <span className="confidence-badge data-type">{confidence}% match</span>
              <a href={member.raw_document.url} target="_blank" rel="noopener noreferrer">Read original reporting ↗</a>
            </div>
          </article>;
        })}</div>
      </section>

      <aside className="source-disclaimer">
        <p>TheDailyDev indexes and links to original reporting. We don’t host or claim ownership of this content — click through to read the full piece.</p>
        <Link href="/methodology">Learn how we source and rank →</Link>
      </aside>
    </article>
  </main>;
}
