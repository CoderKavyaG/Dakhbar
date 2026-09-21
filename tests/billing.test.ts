import { test } from 'node:test';
import assert from 'node:assert/strict';
import Stripe from 'stripe';
import { checkoutSessionParameters } from '../src/lib/billing/checkout';
import { handleStripeEvent, normalizeSubscriptionStatus, type BillingMutation, type StripeEventStore } from '../src/lib/billing/events';
import { checkoutBelongsToUser } from '../src/lib/billing/reconcile';

class MemoryStripeEventStore implements StripeEventStore {
  seen = new Set<string>();
  mutations: BillingMutation[] = [];
  async applyOnce(eventId: string, mutation: BillingMutation) {
    if (this.seen.has(eventId)) return false;
    this.seen.add(eventId);
    this.mutations.push(mutation);
    return true;
  }
}

function signedEvent(payload: object) {
  const body = JSON.stringify(payload);
  const secret = 'whsec_phase4_test';
  const signature = Stripe.webhooks.generateTestHeaderString({ payload: body, secret });
  const stripe = new Stripe('sk_test_phase4');
  return stripe.webhooks.constructEvent(body, signature, secret);
}

test('signed checkout webhook activates once and duplicate delivery is idempotent', async () => {
  const event = signedEvent({
    id: 'evt_checkout_1',
    object: 'event',
    type: 'checkout.session.completed',
    data: { object: { id: 'cs_test_1', object: 'checkout.session', client_reference_id: 'user_1', customer: 'cus_1', metadata: { userId: 'user_1' } } },
  });
  const store = new MemoryStripeEventStore();
  assert.deepEqual(await handleStripeEvent(event, store), { handled: true, duplicate: false });
  assert.deepEqual(await handleStripeEvent(event, store), { handled: true, duplicate: true });
  assert.deepEqual(store.mutations, [{ userId: 'user_1', customerId: 'cus_1', status: 'active' }]);
});

test('subscription status mapping preserves active, canceled, and past-due entitlement states', () => {
  assert.equal(normalizeSubscriptionStatus('trialing'), 'active');
  assert.equal(normalizeSubscriptionStatus('active'), 'active');
  assert.equal(normalizeSubscriptionStatus('canceled'), 'canceled');
  assert.equal(normalizeSubscriptionStatus('past_due'), 'past_due');
  assert.equal(normalizeSubscriptionStatus('unpaid'), 'past_due');
});

test('checkout is one recurring price with a trusted success reconciliation ID and policy copy', () => {
  assert.deepEqual(checkoutSessionParameters({ customerId: 'cus_1', userId: 'user_1', priceId: 'price_1', appUrl: 'http://localhost:3000', brandLogoFileId: 'file_brand_1' }), {
    mode: 'subscription',
    customer: 'cus_1',
    client_reference_id: 'user_1',
    line_items: [{ price: 'price_1', quantity: 1 }],
    allow_promotion_codes: true,
    success_url: 'http://localhost:3000/pricing?checkout=success&session_id={CHECKOUT_SESSION_ID}',
    cancel_url: 'http://localhost:3000/pricing?checkout=canceled',
    branding_settings: { background_color: '#F8F5EE', button_color: '#102B29', border_style: 'rounded', display_name: 'Dakhbar Desk', font_family: 'noto_serif', logo: { type: 'file', file: 'file_brand_1' } },
    custom_text: { submit: { message: 'Test mode only. No real charge is processed. Dakhbar Terms and Privacy Policy are available on the site before checkout.' } },
    metadata: { userId: 'user_1' },
    subscription_data: { metadata: { userId: 'user_1' } },
  });
});

test('success reconciliation rejects a completed session belonging to another reader', () => {
  const base = {
    mode: 'subscription',
    status: 'complete',
    client_reference_id: 'user_1',
    customer: 'cus_1',
    subscription: 'sub_1',
    metadata: { userId: 'user_1' },
  } as unknown as Stripe.Checkout.Session;
  assert.equal(checkoutBelongsToUser(base, 'user_1'), true);
  assert.equal(checkoutBelongsToUser(base, 'user_2'), false);
  assert.equal(checkoutBelongsToUser({ ...base, status: 'open' }, 'user_1'), false);
});
