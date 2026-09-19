import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { SourceTimeline } from '@/components/source-timeline';
import { StoryImage } from '@/components/story-image';
import { Wordmark } from '@/components/wordmark';
import { countIndependentSources, publisherDomain } from '@/lib/story-evidence';

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
  const rawDocuments = story.documents.map(member => member.raw_document);
  if (countIndependentSources(rawDocuments) < 2 && rawDocuments[0]) redirect(rawDocuments[0].url);

  const corroboration = story.documents.map(member => ({
    url: member.raw_document.url,
    sourceName: member.raw_document.source.name,
    publishedAt: member.raw_document.published_at,
  }));

  return <main className="paper-shell story-page">
    <header className="compact-header"><Wordmark /><nav><Link href="/">Today</Link><Link href="/search">Search</Link></nav></header>
    <article className="story-detail">
      <header className="story-detail-header">
        <div className="story-context">{story.entities.map(item => <Link key={item.entity_id} href={'/search?q=' + encodeURIComponent(item.entity.name)}>{item.entity.name}</Link>)}</div>
        <h1>{story.title}</h1>
        <StoryImage src={rawDocuments.find(document => document.og_image_url)?.og_image_url} alt="" className="story-detail-image" />
      </header>

      <SourceTimeline documents={corroboration} />

      <section className="source-section">
        <div className="source-section-heading">
          <h2>Original reporting</h2>
          <p>{countIndependentSources(rawDocuments)} independent sources</p>
        </div>
        <div className="source-card-list">{story.documents.map(member => {
          const domain = publisherDomain(member.raw_document.url) || member.raw_document.source.name;
          return <article className="source-card" key={member.raw_document_id}>
            <StoryImage src={member.raw_document.og_image_url} alt="" className="source-card-image" />
            <div className="source-card-content">
              <div className="source-card-meta">
                <span>{domain}</span>
                <time className="data-type" dateTime={member.raw_document.published_at.toISOString()}>{member.raw_document.published_at.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' })}</time>
              </div>
              <h3>{member.raw_document.title}</h3>
              {member.raw_document.og_description && <p>{member.raw_document.og_description}</p>}
              <div className="source-card-action"><a href={member.raw_document.url} target="_blank" rel="noopener noreferrer">Read original reporting ↗</a></div>
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
