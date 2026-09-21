import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { appUrl, requireEnvironment, stripeClient } from '@/lib/billing/config';
import { checkoutSessionParameters } from '@/lib/billing/checkout';

export async function POST(request: NextRequest) {
  if (request.headers.get('origin') !== new URL(appUrl()).origin) return NextResponse.json({ error: 'Invalid request origin.' }, { status: 403 });
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'Sign in before starting checkout.' }, { status: 401 });
  const identity = await currentUser();
  const address = identity?.primaryEmailAddress ?? identity?.emailAddresses[0];
  if (!address || address.verification?.status !== 'verified') return NextResponse.json({ error: 'A verified email address is required.' }, { status: 400 });
  const stripe = stripeClient();
  const user = await db.user.upsert({ where: { id: userId }, update: {}, create: { id: userId } });
  if (user.subscription_status === 'active') return NextResponse.redirect(`${appUrl()}/pricing?already=active`, 303);
  let customerId = user.stripe_customer_id;
  if (!customerId) {
    const customer = await stripe.customers.create({ email: address.emailAddress, metadata: { clerkUserId: userId } });
    customerId = customer.id;
    await db.user.update({ where: { id: userId }, data: { stripe_customer_id: customerId } });
  }
  const session = await stripe.checkout.sessions.create(checkoutSessionParameters({ customerId, userId, priceId: requireEnvironment('STRIPE_PRICE_ID'), appUrl: appUrl(), brandLogoFileId: process.env.STRIPE_BRAND_LOGO_FILE_ID }));
  if (!session.url) return NextResponse.json({ error: 'Stripe Checkout did not return a URL.' }, { status: 502 });
  return NextResponse.redirect(session.url, 303);
}
