import Link from 'next/link';
import { Button } from '@/components/ui/button';

export default async function UnsubscribePage({ searchParams }: { searchParams: Promise<{ token?: string; status?: string }> }) {
  const params = await searchParams;
  const done = params.status === 'done';
  return <main className="paper-shell legal-page"><article className="legal-copy">
    <p className="section-note">Email preferences</p>
    <h1>{done ? 'Email Briefs stopped.' : 'Stop morning email Briefs?'}</h1>
    <p>{done ? 'You will keep your account, follows, and in-app Brief. Only scheduled email delivery has been disabled.' : 'This keeps your account and in-app Brief unchanged. You can re-enable email delivery through account settings when that preference surface is added.'}</p>
    {done ? <Button asChild><Link href="/">Return to today’s edition</Link></Button> : <form method="post" action={`/api/email/unsubscribe?token=${encodeURIComponent(params.token ?? '')}`}><input type="hidden" name="redirect" value="1"/><Button type="submit">Unsubscribe from email Briefs</Button></form>}
  </article></main>;
}
