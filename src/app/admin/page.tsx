import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminData } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdmin();
  const data = await getAdminData();
  return <main className="admin-shell">
    <header className="admin-header"><div><h1>Ingestion dashboard</h1></div><nav><Link href="/admin/clusters">Review clusters</Link><Link href="/">Front Page</Link></nav></header>
    <dl className="admin-stats"><div><dt>Total documents</dt><dd>{data.total}</dd></div><div><dt>Last hour</dt><dd>{data.lastHour}</dd></div><div><dt>Last 24 hours</dt><dd>{data.last24Hours}</dd></div></dl>
    <section className="admin-quota"><header><div><span className="data-type">UTC daily usage</span><h2>LLM quota</h2></div><time className="data-type" dateTime={data.dayStart.toISOString()}>{data.dayStart.toISOString().slice(0,10)}</time></header><div>{data.llmQuota.map(row => <article key={`${row.provider}:${row.model}`}><strong>{row.model}</strong><span>{row.provider}</span><p><b>{row.calls}</b> / {row.limit ?? 'unconfigured'} calls</p><small>{row.inputTokens} input · {row.outputTokens} output tokens</small><meter min="0" max={row.limit ?? Math.max(1,row.calls)} value={row.calls}>{row.calls}</meter></article>)}</div></section>
    <div className="admin-table-wrap"><table className="admin-table"><caption>Last 20 ingested documents <span className="data-type">UTC</span></caption><thead><tr><th>Title</th><th>Source</th><th>Ingested at</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id}><td><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></td><td>{item.source.name}</td><td><time dateTime={item.ingested_at.toISOString()}>{item.ingested_at.toISOString()}</time></td></tr>)}</tbody></table>{!data.items.length && <p>No documents ingested yet.</p>}</div>
  </main>;
}
