import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { getClusterReviewData } from '@/lib/cluster-review';
import { confirmMergeAction, keepSeparateAction, unmergeDocumentAction } from './actions';

export const dynamic = 'force-dynamic';

export default async function ClusterReviewPage() {
  await requireAdmin();
  const data = await getClusterReviewData();
  return <main className="admin-shell">
    <header className="admin-header"><div><h1>Cluster review</h1></div><nav><Link href="/admin">Ingestion</Link><Link href="/">Front Page</Link></nav></header>
    <dl className="admin-stats"><div><dt>Stories</dt><dd>{data.totals.stories}</dd></div><div><dt>Memberships</dt><dd>{data.totals.memberships}</dd></div><div><dt>Needs review</dt><dd>{data.totals.reviewNeeded}</dd></div></dl>
    <p className="admin-explainer">Entity overlap is required before similarity can join documents. Ambiguous candidates remain separate until reviewed here.</p>

    <section className="bulk-review" aria-labelledby="bulk-review-title">
      <div className="bulk-review-heading"><div><p className="admin-data-line">Human review queue</p><h2 id="bulk-review-title">Pending relationships</h2></div><strong className="data-type">{data.pendingRelationships.length} open</strong></div>
      {data.pendingRelationships.length === 0
        ? <p className="admin-explainer">The relationship queue is clear.</p>
        : <div className="bulk-review-list">{data.pendingRelationships.map(item => <article className="relationship-card" key={item.storyId}>
            <div className="relationship-pair">
              <section><span className="data-type">Current story</span><h3>{item.storyTitle}</h3></section>
              <span className="relationship-marker" aria-hidden="true">↔</span>
              <section><span className="data-type">Possible match</span><h3>{item.candidateTitle}</h3></section>
            </div>
            <div className="relationship-evidence"><span>Shared: {item.sharedEntities.join(', ') || 'no named entity'}</span><span className="data-type">similarity {item.similarity.toFixed(3)}</span></div>
            <div className="review-actions"><form action={confirmMergeAction}><input type="hidden" name="storyId" value={item.storyId}/><button>Confirm merge</button></form><form action={keepSeparateAction}><input type="hidden" name="storyId" value={item.storyId}/><button className="secondary">Keep separate</button></form></div>
          </article>)}</div>}
    </section>

    <div className="cluster-list">{data.stories.filter(story => story.status !== 'review_needed').map(story => <article className="cluster-card" key={story.id}>
      <header><div><p className="admin-data-line"><span>{story.status.replace('_', ' ')}</span><span>score {story.significance_score.toFixed(3)}</span></p><h2>{story.title}</h2></div><div className="entity-row">{story.entities.map(item => <span key={item.entity_id}>{item.entity.name}</span>)}</div></header>
      <ol className="cluster-members">{story.documents.map(member => <li key={member.raw_document_id}><div><a href={member.raw_document.url} target="_blank" rel="noopener noreferrer">{member.raw_document.title}</a><span>{member.raw_document.source.name} / similarity {member.similarity_score.toFixed(3)}{member.is_primary ? ' / primary' : ''}</span></div>{story.documents.length > 1 && <form action={unmergeDocumentAction}><input type="hidden" name="storyId" value={story.id}/><input type="hidden" name="documentId" value={member.raw_document_id}/><button className="secondary">Unmerge</button></form>}</li>)}</ol>
    </article>)}</div>
  </main>;
}
