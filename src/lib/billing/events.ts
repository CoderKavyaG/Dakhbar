import type Stripe from 'stripe';
import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';

type BillingStatus = 'free' | 'active' | 'canceled' | 'past_due';

export type BillingMutation = {
  userId?: string;
  customerId?: string;
  status: BillingStatus;
};

export interface StripeEventStore {
  applyOnce(eventId: string, mutation: BillingMutation): Promise<boolean>;
}

export function normalizeSubscriptionStatus(status: Stripe.Subscription.Status): BillingStatus {
  if (status === 'active' || status === 'trialing') return 'active';
  if (status === 'canceled') return 'canceled';
  return 'past_due';
}

function customerId(value: string | Stripe.Customer | Stripe.DeletedCustomer | null): string | undefined {
  if (!value) return undefined;
  return typeof value === 'string' ? value : value.id;
}

export function billingMutationFromEvent(event: Stripe.Event): BillingMutation | null {
  if (event.type === 'checkout.session.completed') {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id ?? session.metadata?.userId;
    if (!userId) throw new Error('Checkout session is missing its Clerk user ID');
    return { userId, customerId: customerId(session.customer), status: 'active' };
  }
  if (event.type === 'customer.subscription.updated') {
    const subscription = event.data.object as Stripe.Subscription;
    const id = customerId(subscription.customer);
    if (!id) throw new Error('Subscription event is missing its customer');
    return { customerId: id, status: normalizeSubscriptionStatus(subscription.status) };
  }
  if (event.type === 'customer.subscription.deleted') {
    const subscription = event.data.object as Stripe.Subscription;
    const id = customerId(subscription.customer);
    if (!id) throw new Error('Subscription event is missing its customer');
    return { customerId: id, status: 'canceled' };
  }
  return null;
}

export async function handleStripeEvent(event: Stripe.Event, store: StripeEventStore) {
  const mutation = billingMutationFromEvent(event);
  if (!mutation) return { handled: false, duplicate: false };
  const applied = await store.applyOnce(event.id, mutation);
  return { handled: true, duplicate: !applied };
}

function retryableTransactionError(error: unknown) {
  return error instanceof Prisma.PrismaClientKnownRequestError && ['P2028', 'P2034'].includes(error.code);
}

export const prismaStripeEventStore: StripeEventStore = {
  async applyOnce(eventId, mutation) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        await db.$transaction(async tx => {
          await tx.webhookEvent.create({ data: { stripe_event_id: eventId } });
          const where = mutation.userId ? { id: mutation.userId } : { stripe_customer_id: mutation.customerId };
          const result = await tx.user.updateMany({
            where,
            data: {
              subscription_status: mutation.status,
              ...(mutation.customerId ? { stripe_customer_id: mutation.customerId } : {}),
            },
          });
          if (result.count !== 1) throw new Error(`Stripe event ${eventId} did not match exactly one user`);
        }, { maxWait: 10_000, timeout: 15_000 });
        return true;
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return false;
        if (!retryableTransactionError(error) || attempt === 2) throw error;
        await new Promise(resolve => setTimeout(resolve, 150 * (attempt + 1)));
      }
    }
    return false;
  },
};
