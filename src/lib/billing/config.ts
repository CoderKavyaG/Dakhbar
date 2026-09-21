import Stripe from 'stripe';

export const DESK_PRICE_USD = 5;
export const DESK_PRODUCT_NAME = 'Dअख़बार Desk';

export function appUrl() {
  return (process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000').replace(/\/$/, '');
}

export function requireEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function stripeClient() {
  return new Stripe(requireEnvironment('STRIPE_SECRET_KEY'));
}
