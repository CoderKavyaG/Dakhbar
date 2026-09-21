import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { appUrl, requireEnvironment } from '@/lib/billing/config';
import { verifyUnsubscribeToken } from '@/lib/email/unsubscribe';

export async function POST(request: NextRequest) {
  const token = request.nextUrl.searchParams.get('token') ?? '';
  const userId = verifyUnsubscribeToken(token, requireEnvironment('EMAIL_UNSUBSCRIBE_SECRET'));
  if (!userId) return NextResponse.json({ error: 'Invalid unsubscribe link.' }, { status: 400 });
  await db.user.updateMany({ where: { id: userId }, data: { email_brief_enabled: false } });
  const form = await request.formData().catch(() => null);
  if (form?.get('redirect') === '1') return NextResponse.redirect(`${appUrl()}/unsubscribe?status=done`, 303);
  return NextResponse.json({ unsubscribed: true });
}
