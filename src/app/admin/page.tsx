import Link from 'next/link';
import { requireAdmin } from '@/lib/admin-auth';
import { getAdminData } from '@/lib/admin-data';

export const dynamic = 'force-dynamic';

export default async function AdminPage() {
  await requireAdmin();
  const data = await getAdminData();
  return <main className="admin-shell">
    <header className="admin-header"><div><p className="kicker">Dअख़बार operations</p><h1>Ingestion dashboard</h1></div><nav><Link href="/admin/clusters">Review clusters</Link><Link href="/">Front Page</Link></nav></header>
    <dl className="admin-stats"><div><dt>Total documents</dt><dd>{data.total}</dd></div><div><dt>Last hour</dt><dd>{data.lastHour}</dd></div><div><dt>Last 24 hours</dt><dd>{data.last24Hours}</dd></div></dl>
    <div className="admin-table-wrap"><table className="admin-table"><caption>Last 20 ingested documents · UTC</caption><thead><tr><th>Title</th><th>Source</th><th>Ingested at</th></tr></thead><tbody>{data.items.map(item => <tr key={item.id}><td><a href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></td><td>{item.source.name}</td><td><time dateTime={item.ingested_at.toISOString()}>{item.ingested_at.toISOString()}</time></td></tr>)}</tbody></table>{!data.items.length && <p>No documents ingested yet.</p>}</div>
  </main>;
}
