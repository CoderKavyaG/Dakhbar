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
      <div><p className="section-note">Desk membership — sandbox preview</p><h1>Less catching up. More understanding.</h1><p>Keep your whole stack in view. Desk removes the five-topic limit, adds grounded editorial copy to your in-app Brief, and delivers a source-linked digest by email each morning. Every story keeps its original reporting one click away.</p></div>
      <div className="pricing-brand-panel" aria-hidden="true"><BrandMark size={260} priority/><span className="data-type">The Desk edition</span></div>
    </header>

    {params.checkout === 'success' && active && <div className="billing-notice"><strong>Desk is active.</strong> Your follow limit is removed and the morning email Brief is enabled.</div>}
    {params.checkout === 'success' && !active && <div className="billing-notice"><strong>Checkout completed.</strong> Stripe is still confirming the test subscription. Refresh shortly if this message remains.</div>}
    {params.checkout === 'canceled' && <div className="billing-notice">Checkout was canceled. Nothing was charged.</div>}
    {params.already === 'active' && <div className="billing-notice">This account already has an active Desk subscription.</div>}
    {params.portal === 'unavailable' && <div className="billing-notice">No Stripe customer record exists for this account yet.</div>}

    <section className="desk-reasons" aria-label="Why Desk"><article><span>01</span><h2>Your whole working world.</h2><p>Follow every framework, database and company you rely on. No choosing which five make the cut.</p></article><article><span>02</span><h2>A shorter route to the story.</h2><p>Grounded in-app writeups use the reporting already selected for you. Original excerpts take over if generation cannot be verified.</p></article><article><span>03</span><h2>Make mornings yours.</h2><p>The source-linked morning digest arrives by email. Read it with your coffee, and open the evidence when you want more.</p></article></section><section className="pricing-grid" aria-label="Plans">
      <article className="price-card"><div><p className="section-note">Free</p><h2>$0</h2><p>The complete public edition and a personal in-app habit.</p></div><ul><li><Check size={16}/>Front Page, Search, Topics</li><li><Check size={16}/>Follow up to 5 entities</li><li><Check size={16}/>In-app deterministic Brief</li></ul>{!userId ? <JoinUsButton/> : <Button asChild variant="outline"><Link href="/">Read the public edition</Link></Button>}</article>
      <article className="price-card price-card-paid"><div><Badge>{active ? 'Active' : 'Desk'}</Badge><h2>${DESK_PRICE_USD}<span>/month</span></h2><p>For readers following more than five topics, or building a daily reading habit.</p></div><ul><li><Check size={16}/>Unlimited Following</li><li><Check size={16}/>Grounded editorial in-app Brief</li><li><Check size={16}/>Morning source-linked email digest</li><li><Check size={16}/>Stripe-hosted billing management</li></ul>
        {!userId ? <JoinUsButton/> : active || user?.subscription_status === 'past_due'
          ? <form method="post" action="/api/billing/portal"><Button type="submit">Manage subscription</Button></form>
          : <form method="post" action="/api/billing/checkout"><Button type="submit">Upgrade with Stripe</Button></form>}
      </article>
    </section>

    <p className="pricing-sandbox"><strong>Test mode only.</strong> The $5 monthly plan is a sandbox subscription. No real money is charged.</p><div className="pricing-assurance"><p><strong>What happens at checkout?</strong> Stripe hosts the payment form and stores payment-method details. Dअख़बार receives a customer ID and subscription status, never a full card number.</p><p><strong>Current environment:</strong> sandbox only. Test cards create test subscriptions and no real transaction is processed.</p></div>
    <p className="pricing-terms">USD, billed monthly only after a future live launch. Review the <Link href="/terms">Terms</Link> and <Link href="/privacy">Privacy Policy</Link> before checkout.</p>
  </main>;
}
