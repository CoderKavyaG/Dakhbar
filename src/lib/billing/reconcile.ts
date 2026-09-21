import type Stripe from 'stripe';
import { db } from '@/lib/db';
import { normalizeSubscriptionStatus } from './events';
import { stripeClient } from './config';

export function checkoutBelongsToUser(session: Stripe.Checkout.Session, userId: string) {
  return session.mode === 'subscription'
    && session.status === 'complete'
    && (session.client_reference_id === userId || session.metadata?.userId === userId)
    && Boolean(session.customer)
    && Boolean(session.subscription);
}

export async function reconcileCompletedCheckout(userId: string, sessionId: string) {
  if (!/^cs_(?:test|live)_[A-Za-z0-9]+$/.test(sessionId)) return false;
  try {
    const stripe = stripeClient();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (!checkoutBelongsToUser(session, userId)) return false;
    const subscriptionId = typeof session.subscription === 'string' ? session.subscription : session.subscription?.id;
    if (!subscriptionId) return false;
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    const status = normalizeSubscriptionStatus(subscription.status);
    const customerId = typeof session.customer === 'string' ? session.customer : session.customer?.id;
    await db.user.update({
      where: { id: userId },
      data: {
        subscription_status: status,
        ...(customerId ? { stripe_customer_id: customerId } : {}),
      },
    });
    return status === 'active';
  } catch {
    return false;
  }
}
