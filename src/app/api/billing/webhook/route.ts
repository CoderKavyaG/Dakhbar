import { NextRequest, NextResponse } from 'next/server';
import { handleStripeEvent, prismaStripeEventStore } from '@/lib/billing/events';
import { requireEnvironment, stripeClient } from '@/lib/billing/config';

export async function POST(request: NextRequest) {
  const signature = request.headers.get('stripe-signature');
  if (!signature) return NextResponse.json({ error: 'Missing Stripe signature.' }, { status: 400 });
  const body = await request.text();
  let event;
  try {
    event = stripeClient().webhooks.constructEvent(body, signature, requireEnvironment('STRIPE_WEBHOOK_SECRET'));
  } catch {
    return NextResponse.json({ error: 'Invalid Stripe signature.' }, { status: 400 });
  }
  const result = await handleStripeEvent(event, prismaStripeEventStore);
  return NextResponse.json({ received: true, ...result });
}
