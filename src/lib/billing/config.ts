import Stripe from 'stripe';

export const DESK_PRICE_USD = 5;
export const DESK_PRODUCT_NAME = 'Dअख़बार Desk';

export function appUrl() {
  const envUrl = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl.trim()) {
    const trimmed = envUrl.trim().replace(/\/$/, '');
    return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
  }
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) {
    return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.replace(/\/$/, '')}`;
  }
  if (process.env.VERCEL_URL) {
    return `https://${process.env.VERCEL_URL.replace(/\/$/, '')}`;
  }
  return process.env.NODE_ENV === 'production' ? 'https://dakhbar.vercel.app' : 'http://localhost:3000';
}

export function requireEnvironment(name: string) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

export function stripeClient() {
  return new Stripe(requireEnvironment('STRIPE_SECRET_KEY'));
}
