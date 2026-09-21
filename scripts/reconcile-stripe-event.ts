import { handleStripeEvent, prismaStripeEventStore } from '../src/lib/billing/events';
import { stripeClient } from '../src/lib/billing/config';

async function main() {
  const eventId = process.argv[2];
  if (!/^evt_[A-Za-z0-9]+$/.test(eventId ?? '')) throw new Error('Pass a Stripe event ID.');
  const event = await stripeClient().events.retrieve(eventId);
  const result = await handleStripeEvent(event, prismaStripeEventStore);
  console.log(JSON.stringify({ eventId: event.id, type: event.type, ...result }));
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
