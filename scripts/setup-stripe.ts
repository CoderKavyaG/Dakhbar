import { DESK_PRICE_USD, DESK_PRODUCT_NAME, stripeClient } from '../src/lib/billing/config';

async function main() {
  const stripe = stripeClient();
  const existing = await stripe.products.search({
    query: "active:'true' AND metadata['dakhbar_plan']:'desk'",
    limit: 1,
  });
  const product = existing.data[0] ?? await stripe.products.create({
    name: DESK_PRODUCT_NAME,
    description: 'Unlimited Following and a deterministic morning Brief delivered by email.',
    metadata: { dakhbar_plan: 'desk' },
  });
  const prices = await stripe.prices.list({ product: product.id, active: true, type: 'recurring', limit: 100 });
  const price = prices.data.find(item => item.currency === 'usd' && item.unit_amount === DESK_PRICE_USD * 100 && item.recurring?.interval === 'month')
    ?? await stripe.prices.create({ product: product.id, currency: 'usd', unit_amount: DESK_PRICE_USD * 100, recurring: { interval: 'month' }, lookup_key: 'dakhbar_desk_monthly' });
  console.log(JSON.stringify({ productId: product.id, priceId: price.id, amount: '$' + DESK_PRICE_USD + '/month', mode: product.livemode ? 'live' : 'test' }));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
