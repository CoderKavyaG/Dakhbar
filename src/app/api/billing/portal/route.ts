import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appUrl, stripeClient } from '@/lib/billing/config';

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.redirect(`${appUrl()}/sign-in?redirect_url=${encodeURIComponent('/pricing')}`, 303);
  }
  const user = await db.user.findUnique({ where: { id: userId }, select: { stripe_customer_id: true } });
  if (!user?.stripe_customer_id) {
    return NextResponse.redirect(`${appUrl()}/pricing?portal=unavailable`, 303);
  }
  try {
    const session = await stripeClient().billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${appUrl()}/pricing`,
    });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error('Failed to create customer portal session:', error);
    return NextResponse.redirect(`${appUrl()}/pricing?portal=error`, 303);
  }
}

export async function POST(request: NextRequest) {
  const origin = request.headers.get('origin');
  const validOrigins = [new URL(appUrl()).origin, 'http://localhost:3000', 'http://127.0.0.1:3000'];
  if (origin && !validOrigins.includes(origin)) {
    return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  }
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'Sign in to manage billing.' }, { status: 401 });
  }
  const user = await db.user.findUnique({ where: { id: userId }, select: { stripe_customer_id: true } });
  if (!user?.stripe_customer_id) {
    return NextResponse.redirect(`${appUrl()}/pricing?portal=unavailable`, 303);
  }
  try {
    const session = await stripeClient().billingPortal.sessions.create({
      customer: user.stripe_customer_id,
      return_url: `${appUrl()}/pricing`,
    });
    return NextResponse.redirect(session.url, 303);
  } catch (error) {
    console.error('Failed to create customer portal session:', error);
    return NextResponse.redirect(`${appUrl()}/pricing?portal=error`, 303);
  }
}
