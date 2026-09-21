import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';

test('pricing sells only implemented Phase 4 capabilities', async () => {
  const pricing = await readFile('src/app/pricing/page.tsx', 'utf8');
  assert.match(pricing, /Unlimited Following/);
  assert.match(pricing, /Morning Brief by email/);
  assert.doesNotMatch(pricing, /Developer Pulse|Research Mode|personalized Edition/);
  assert.match(pricing, /Manage subscription/);
  assert.match(pricing, /sandbox only/);
  assert.match(pricing, /reconcileCompletedCheckout/);
});

test('legal pages accurately disclose aggregation, processors, sandbox billing, and reader choices', async () => {
  const [terms, privacy, legal] = await Promise.all([
    readFile('src/app/terms/page.tsx', 'utf8'),
    readFile('src/app/privacy/page.tsx', 'utf8'),
    readFile('src/app/legal/page.tsx', 'utf8'),
  ]);
  assert.match(terms, /does not host or claim ownership/);
  assert.match(terms, /no refund policy for the current service/);
  assert.doesNotMatch(terms, /seven calendar days|Renewal payments are non-refundable/);
  assert.match(privacy, /Clerk processes authentication data/);
  assert.match(privacy, /Stripe processes checkout/);
  assert.match(privacy, /Resend processes/);
  assert.match(privacy, /do not sell personal data/);
  assert.match(privacy, /advertising cookies/);
  assert.match(legal, /no real transaction is processed/i);
});

test('the supplied brand mark is optimized and used across owned billing surfaces', async () => {
  const [asset, header, upgrade, pricing] = await Promise.all([
    stat('public/brand/dakhbar-reporter.png'),
    readFile('src/components/site-header.tsx', 'utf8'),
    readFile('src/components/upgrade-dialog.tsx', 'utf8'),
    readFile('src/app/pricing/page.tsx', 'utf8'),
  ]);
  assert.ok(asset.size > 1_000 && asset.size < 300_000);
  assert.match(header, /BrandMark/);
  assert.match(upgrade, /BrandMark/);
  assert.match(pricing, /BrandMark/);
});
