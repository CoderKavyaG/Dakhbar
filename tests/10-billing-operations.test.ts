// Consolidated Test Suite: 10-billing-operations.test.ts
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { adminRouteStatus, decideAdminAccess, isAdmin } from '../src/lib/admin-access';
import { checkoutSessionParameters } from '../src/lib/billing/checkout';
import { handleStripeEvent, normalizeSubscriptionStatus, type BillingMutation, type StripeEventStore } from '../src/lib/billing/events';
import { checkoutBelongsToUser } from '../src/lib/billing/reconcile';
import { STALE_AFTER_MS, ingestionHealth } from '../src/lib/ingestion-health';
import Stripe from 'stripe';

// --- Section: billing.test.ts ---
{
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
}

// --- Section: admin.test.ts ---
{
const user = { id: 'user_1', emailAddresses: [{ emailAddress: 'codecraftkavya@gmail.com', verification: { status: 'verified' } }] };

test('admin authorization fails closed and only accepts the allowlisted verified email', () => {
  assert.equal(isAdmin(null, { email: 'codecraftkavya@gmail.com' }), false);
  assert.equal(isAdmin(user, {}), false);
  assert.equal(isAdmin(user, { email: 'CODECRAFTKAVYA@gmail.com' }), true);
  assert.equal(isAdmin(user, { email: 'someone@example.com' }), false);
  assert.equal(isAdmin({ ...user, emailAddresses: [{ emailAddress: 'codecraftkavya@gmail.com', verification: { status: 'unverified' } }] }, { email: 'codecraftkavya@gmail.com' }), false);
});

test('a configured user ID takes precedence, preventing a second allowlisted identity', () => {
  assert.equal(isAdmin(user, { userId: 'user_1' }), true);
  assert.equal(isAdmin(user, { userId: 'user_2', email: 'codecraftkavya@gmail.com' }), false);
});

test('admin route returns 200 only for the allowlisted identity and redirects everyone else', () => {
  const allowlist = { email: 'codecraftkavya@gmail.com' };
  assert.equal(adminRouteStatus(decideAdminAccess(user.id, user, allowlist)), 200);
  assert.equal(adminRouteStatus(decideAdminAccess(null, null, allowlist)), 307);
  assert.equal(adminRouteStatus(decideAdminAccess('user_2', { id: 'user_2', emailAddresses: [{ emailAddress: 'other@example.com', verification: { status: 'verified' } }] }, allowlist)), 307);
});
}

// --- Section: cron.test.ts ---
{
test('Cron endpoints, vercel.json, and GitHub Actions scheduled ingestion are properly configured', async () => {
  const { readFile } = await import('node:fs/promises');

  // 1. Verify vercel.json contains ONLY once-per-day crons (Vercel Hobby tier compatible)
  const vercelJsonRaw = await readFile('vercel.json', 'utf8');
  const vercelJson = JSON.parse(vercelJsonRaw);
  assert.ok(Array.isArray(vercelJson.crons));
  assert.equal(vercelJson.crons.length, 2, 'vercel.json must only contain once-per-day crons for Vercel Hobby tier');

  const paths = (vercelJson.crons as Array<{ path: string; schedule: string }>).map(c => c.path);
  assert.ok(paths.includes('/api/cron/pulse'), 'Pulse snapshot must be scheduled daily in vercel.json');
  assert.ok(paths.includes('/api/cron/brief'), 'Daily brief email must be scheduled daily in vercel.json');
  assert.ok(!paths.includes('/api/cron/ingest?source=hn'), 'Sub-daily HN cron must be removed from vercel.json');
  assert.ok(!paths.includes('/api/cron/ingest?source=feeds'), 'Sub-daily feeds cron must be removed from vercel.json');

  // 2. Verify GitHub Actions scheduled ingestion workflow handles sub-daily ingestion
  const workflowRaw = await readFile('.github/workflows/scheduled-ingestion.yml', 'utf8');
  assert.ok(workflowRaw.includes('*/15 * * * *'), 'Workflow must schedule HN ingestion every 15 minutes');
  assert.ok(workflowRaw.includes('api/cron/ingest?source=hn'), 'Workflow must call HN endpoint');
  assert.ok(workflowRaw.includes('api/cron/ingest?source=$SOURCE_PARAM'), 'Workflow must call feeds endpoint');
  assert.ok(workflowRaw.includes('${{ secrets.CRON_SECRET }}'), 'Workflow must use CRON_SECRET');
  assert.ok(workflowRaw.includes('${{ secrets.APP_URL }}'), 'Workflow must use APP_URL');

  // 3. Verify cron route handlers exist and export GET/POST with maxDuration = 60
  const ingestRoute = await readFile('src/app/api/cron/ingest/route.ts', 'utf8');
  assert.match(ingestRoute, /export const maxDuration = 60/);
  assert.match(ingestRoute, /export async function GET/);
  assert.match(ingestRoute, /export async function POST/);
  assert.match(ingestRoute, /ingestHn/);
  assert.match(ingestRoute, /ingestAdditionalSource/);
  assert.match(ingestRoute, /processUnclustered/);

  const pulseRoute = await readFile('src/app/api/cron/pulse/route.ts', 'utf8');
  assert.match(pulseRoute, /export const maxDuration = 60/);
  assert.match(pulseRoute, /computeLatestEntityMetricSnapshots/);

  const briefRoute = await readFile('src/app/api/cron/brief/route.ts', 'utf8');
  assert.match(briefRoute, /export const maxDuration = 60/);
  assert.match(briefRoute, /sendDailyBriefEmails/);
});
}

// --- Section: operational-health.test.ts ---
{
test('successful zero-item runs stay healthy and a missed run alerts at 35 minutes',()=>{const now=Date.parse('2026-09-21T10:00:00Z');assert.equal(ingestionHealth(new Date(now-15*60000).toISOString(),true,false,now).alert,false);assert.equal(ingestionHealth(new Date(now-STALE_AFTER_MS).toISOString(),true,false,now).stale,true);});
test('dead worker or paused queue alerts immediately even with recent ingestion',()=>{const now=Date.now();assert.equal(ingestionHealth(new Date(now).toISOString(),false,false,now).alert,true);assert.equal(ingestionHealth(new Date(now).toISOString(),true,true,now).alert,true);assert.equal(ingestionHealth(null,true,false,now).alert,true);});
}
