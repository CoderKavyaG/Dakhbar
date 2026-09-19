import Link from 'next/link';
import { notFound } from 'next/navigation';
import { db } from '@/lib/db';
import { Wordmark } from '@/components/wordmark';
import { publisherDomain } from '@/lib/story-evidence';

export const dynamic = 'force-dynamic';

export default async function StoryPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const story = await db.story.findUnique({
    where: { id },
    include: { entities: { include: { entity: true } }, documents: { orderBy: [{ is_primary: 'desc' }, { created_at: 'asc' }], include: { raw_document: { include: { source: true } } } } },
  });
  if (!story) notFound();
  return <main className="paper-shell story-page">
    <header className="compact-header"><Wordmark /><Link href="/search">Search</Link></header>
    <article className="story-detail"><p className="kicker">Source evidence</p><h1>{story.title}</h1>
      <div className="entity-row">{story.entities.map(item => <Link key={item.entity_id} href={'/search?q=' + encodeURIComponent(item.entity.name)}>{item.entity.name}</Link>)}</div>
      <p className="standfirst">The original reporting and discussion behind this story cluster. Generated summaries and claims are not used in this phase.</p>
      <h2>Source documents</h2>
      <ol className="evidence-list">{story.documents.map(member => {
        const domain = publisherDomain(member.raw_document.url);
        return <li key={member.raw_document_id}><a href={member.raw_document.url} target="_blank" rel="noopener noreferrer">{member.raw_document.title}</a><span>{domain ? 'via ' + domain : member.raw_document.source.name} · Published {member.raw_document.published_at.toLocaleString('en-IN')}</span></li>;
      })}</ol>
    </article>
  </main>;
}
