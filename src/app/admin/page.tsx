import { auth, currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { isAdmin } from '@/lib/admin-access';
import { getAdminData } from '@/lib/admin-data';
export const dynamic = 'force-dynamic';
export default async function AdminPage() {
  const session = await auth();
  if (!session.userId) return session.redirectToSignIn();
  const user = await currentUser();
  if (!isAdmin(user, { email: process.env.ADMIN_EMAIL, userId: process.env.ADMIN_USER_ID })) notFound();
  // Authorization runs before any database access; counts are never public.
  const data = await getAdminData();
  return <main className="p-8 space-y-6">
    <h1 className="text-2xl font-semibold">Dअख़बार — Admin</h1>
    <dl className="space-y-2">
      <div><dt>Total documents</dt><dd>{data.total}</dd></div>
      <div><dt>Ingested in the last hour</dt><dd>{data.lastHour}</dd></div>
      <div><dt>Ingested in the last 24 hours</dt><dd>{data.last24Hours}</dd></div>
    </dl>
    <p>Refresh to see new ingestions. All timestamps are UTC.</p>
    <table className="w-full text-left">
      <caption className="text-left">Last 20 ingested documents</caption>
      <thead><tr><th>Title</th><th>Source</th><th>Ingested at (UTC)</th></tr></thead>
      <tbody>{data.items.map(item => <tr key={item.id}>
        <td className="py-2"><a className="underline" href={item.url} target="_blank" rel="noopener noreferrer">{item.title}</a></td>
        <td>{item.source.name}</td><td><time dateTime={item.ingested_at.toISOString()}>{item.ingested_at.toISOString()}</time></td>
      </tr>)}</tbody>
    </table>
    {!data.items.length && <p>No documents ingested yet.</p>}
  </main>;
}
