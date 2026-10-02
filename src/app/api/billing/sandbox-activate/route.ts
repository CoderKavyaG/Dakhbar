import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appUrl } from '@/lib/billing/config';

export async function POST(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in required before activating Desk membership.' }, { status: 401 });
  }

  await db.user.upsert({
    where: { id: userId },
    update: { subscription_status: 'active' },
    create: { id: userId, subscription_status: 'active' },
  });

  const referer = request.headers.get('referer');
  const redirectTarget = referer && referer.includes('/pricing') ? `${appUrl()}/pricing?checkout=success` : `${appUrl()}/?tab=following`;
  return NextResponse.redirect(redirectTarget, 303);
}
