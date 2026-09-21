import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Check } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { JoinUsButton } from '@/components/join-us-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { DESK_PRICE_USD } from '@/lib/billing/config';
import { reconcileCompletedCheckout } from '@/lib/billing/reconcile';

export const dynamic = 'force-dynamic';

type PricingParams = {
  checkout?: string;
  portal?: string;
  already?: string;
  session_id?: string;
};

export default async function PricingPage({ searchParams }: { searchParams: Promise<PricingParams> }) {
  const { userId } = await auth();
  const params = await searchParams;

  if (userId) {
    await db.user.upsert({ where: { id: userId }, update: {}, create: { id: userId } });
    if (params.checkout === 'success' && params.session_id) {
      await reconcileCompletedCheckout(userId, params.session_id);
    }
  }

  const user = userId ? await db.user.findUnique({ where: { id: userId } }) : null;
  const active = user?.subscription_status === 'active';

  return <main className="paper-shell pricing-page">
    <header className="pricing-hero pricing-hero-layout">
      <div><p className="section-note">Stripe test mode · a paid capability you can use today</p><h1>Follow without limits. Wake up to your Brief.</h1><p>Desk adds unlimited topic Following and delivers the same deterministic, source-linked Brief to your inbox every morning. No AI summaries, trend dashboards, or research tools are being sold before they exist.</p></div>
      <div className="pricing-brand-panel" aria-hidden="true"><BrandMark size={260} priority/><span className="data-type">THE DESK EDITION</span></div>
    </header>

    {params.checkout === 'success' && active && <div className="billing-notice"><strong>Desk is active.</strong> Your follow limit is removed and the morning email Brief is enabled.</div>}
    {params.checkout === 'success' && !active && <div className="billing-notice"><strong>Checkout completed.</strong> Stripe is still confirming the test subscription. Refresh shortly if this message remains.</div>}
    {params.checkout === 'canceled' && <div className="billing-notice">Checkout was canceled. Nothing was charged.</div>}
    {params.already === 'active' && <div className="billing-notice">This account already has an active Desk subscription.</div>}
    {params.portal === 'unavailable' && <div className="billing-notice">No Stripe customer record exists for this account yet.</div>}

    <section className="pricing-grid" aria-label="Plans">
      <article className="price-card"><div><p className="section-note">Free</p><h2>$0</h2><p>The complete public edition and a personal in-app habit.</p></div><ul><li><Check size={16}/>Front Page, Search, Topics</li><li><Check size={16}/>Follow up to 5 entities</li><li><Check size={16}/>In-app deterministic Brief</li></ul>{!userId && <JoinUsButton/>}</article>
      <article className="price-card price-card-paid"><div><Badge>{active ? 'Active' : 'Desk'}</Badge><h2>${DESK_PRICE_USD}<span>/month</span></h2><p>For readers whose morning Brief should arrive before they open the site.</p></div><ul><li><Check size={16}/>Unlimited Following</li><li><Check size={16}/>Morning Brief by email</li><li><Check size={16}/>Stripe-hosted billing management</li></ul>
        {!userId ? <JoinUsButton/> : active || user?.subscription_status === 'past_due'
          ? <form method="post" action="/api/billing/portal"><Button type="submit">Manage subscription</Button></form>
          : <form method="post" action="/api/billing/checkout"><Button type="submit">Upgrade with Stripe</Button></form>}
      </article>
    </section>

    <div className="pricing-assurance"><p><strong>What happens at checkout?</strong> Stripe hosts the payment form and stores payment-method details. Dअख़बार receives a customer ID and subscription status, never a full card number.</p><p><strong>Current environment:</strong> sandbox only. Test cards create test subscriptions and no real transaction is processed.</p></div>
    <p className="pricing-terms">USD, billed monthly only after a future live launch. Review the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link> before checkout.</p>
  </main>;
}
