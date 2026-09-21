import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appUrl, stripeClient } from '@/lib/billing/config';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(appUrl()).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in to manage billing.' }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: userId }, select: { stripe_customer_id: true } });
  if (!user?.stripe_customer_id) return NextResponse.redirect(`${appUrl()}/pricing?portal=unavailable`, 303);
  const session = await stripeClient().billingPortal.sessions.create({ customer: user.stripe_customer_id, return_url: `${appUrl()}/pricing` });
  return NextResponse.redirect(session.url, 303);
}
