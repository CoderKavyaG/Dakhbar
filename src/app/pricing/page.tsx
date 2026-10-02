import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Check, ShieldCheck, Zap, Sparkles, HelpCircle, ArrowRight } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { JoinUsButton } from '@/components/join-us-button';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { db } from '@/lib/db';
import { DESK_PRICE_USD } from '@/lib/billing/config';
import { reconcileCompletedCheckout } from '@/lib/billing/reconcile';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Desk Membership · Pricing & Reader Access',
  description: 'Support independent developer journalism. Unlock unlimited topic follows and daily morning source-linked digests.',
};

type PricingParams = {
  checkout?: string;
  portal?: string;
  already?: string;
  session_id?: string;
};

export default async function PricingPage({
  searchParams,
}: {
  searchParams: Promise<PricingParams>;
}) {
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

  return (
    <main className="paper-shell pricing-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span>/</span>
        <span>Desk Membership</span>
      </nav>

      {/* Hero Masthead Section */}
      <header className="pricing-hero pricing-hero-layout">
        <div className="pricing-hero-copy">
          <Badge className="badge-pricing-kicker">Desk membership — sandbox preview</Badge>
          <h1 className="pricing-hero-title">Less catching up. More understanding.</h1>
          <p className="pricing-hero-desc">
            Keep your whole stack in view. Desk removes the five-topic limit, adds grounded editorial copy to your in-app Brief,
            and delivers a Morning source-linked email digest each morning. Every story keeps its original reporting one click away.
          </p>
        </div>
        <div className="pricing-brand-panel" aria-hidden="true">
          <BrandMark size={240} priority />
          <span className="data-type">The Desk edition</span>
        </div>
      </header>

      {/* System Status Banners */}
      {params.checkout === 'success' && active && (
        <div className="billing-notice billing-success">
          <strong>Desk is active.</strong> Your follow limit is removed and the morning email Brief is enabled.
        </div>
      )}
      {params.checkout === 'success' && !active && (
        <div className="billing-notice billing-pending">
          <strong>Checkout completed.</strong> Stripe is still confirming the test subscription. Refresh shortly if this message remains.
        </div>
      )}
      {params.checkout === 'canceled' && (
        <div className="billing-notice billing-neutral">
          Checkout was canceled. Nothing was charged.
        </div>
      )}
      {params.already === 'active' && (
        <div className="billing-notice billing-neutral">
          This account already has an active Desk subscription.
        </div>
      )}
      {params.portal === 'unavailable' && (
        <div className="billing-notice billing-alert">
          No Stripe customer record exists for this account yet.
        </div>
      )}

      {/* 3 Core Value Pillars */}
      <section className="desk-reasons" aria-label="Why Desk">
        <article className="reason-card">
          <span className="reason-step">01</span>
          <h2>Your whole working world.</h2>
          <p>Follow every framework, database, and company you rely on. No choosing which five make the cut.</p>
        </article>
        <article className="reason-card">
          <span className="reason-step">02</span>
          <h2>A shorter route to the story.</h2>
          <p>Grounded in-app writeups use the reporting already selected for you. Original excerpts take over if generation cannot be verified.</p>
        </article>
        <article className="reason-card">
          <span className="reason-step">03</span>
          <h2>Make mornings yours.</h2>
          <p>The Morning source-linked email digest arrives at 08:00 AM. Read it with your coffee, and open the evidence when you want more.</p>
        </article>
      </section>

      {/* Plans Comparison Grid */}
      <section className="pricing-plans-grid" aria-label="Subscription Plans">
        {/* Tier 1: Free Public Reader */}
        <article className="pricing-plan-card tier-free">
          <div className="plan-header">
            <span className="plan-tier-name">Free Reader</span>
            <div className="plan-price-row">
              <span className="plan-price">$0</span>
              <span className="plan-period">forever</span>
            </div>
            <p className="plan-tagline">The complete public edition and an essential in-app habit.</p>
          </div>

          <ul className="plan-features-list">
            <li><Check size={16} className="text-data" /> Front Page, Search, Topics</li>
            <li><Check size={16} className="text-data" /> Follow up to 5 entities</li>
            <li><Check size={16} className="text-data" /> In-app deterministic Brief</li>
            <li><Check size={16} className="text-data" /> Real-time corroborated timelines</li>
          </ul>

          <div className="plan-action-area">
            {!userId ? (
              <JoinUsButton />
            ) : (
              <Button asChild variant="outline" className="w-full">
                <Link href="/">Read the public edition</Link>
              </Button>
            )}
          </div>
        </article>

        {/* Tier 2: Desk Member (Paid) */}
        <article className="pricing-plan-card tier-desk featured-tier">
          <div className="plan-highlight-banner">
            <Sparkles size={13} className="inline-icon" /> Editorial Choice
          </div>
          <div className="plan-header">
            <div className="tier-badge-row">
              <span className="plan-tier-name">Desk Member</span>
              <Badge className="badge-desk-pill">{active ? 'Active' : 'Desk'}</Badge>
            </div>
            <div className="plan-price-row">
              <span className="plan-price">${DESK_PRICE_USD}</span>
              <span className="plan-period">/month</span>
            </div>
            <p className="plan-tagline">For developers following entire architectures and teams tracking mission-critical dependencies.</p>
          </div>

          <ul className="plan-features-list">
            <li><Check size={16} className="text-data" /> <strong>Unlimited Following</strong> — Zero topic caps</li>
            <li><Check size={16} className="text-data" /> Grounded editorial in-app Brief</li>
            <li><Check size={16} className="text-data" /> <strong>Morning source-linked email digest</strong></li>
            <li><Check size={16} className="text-data" /> Stripe-hosted billing management</li>
            <li><Check size={16} className="text-data" /> Early access to dossier research reports</li>
          </ul>

          <div className="plan-action-area">
            {!userId ? (
              <JoinUsButton />
            ) : active || user?.subscription_status === 'past_due' ? (
              <form method="post" action="/api/billing/portal" className="w-full">
                <Button type="submit" className="w-full manage-sub-btn">
                  Manage subscription
                </Button>
              </form>
            ) : (
              <div className="pricing-actions-group">
                <form method="post" action="/api/billing/checkout" className="w-full">
                  <Button type="submit" className="w-full upgrade-stripe-btn">
                    Upgrade with Stripe (${DESK_PRICE_USD}/mo)
                  </Button>
                </form>
                <form method="post" action="/api/billing/sandbox-activate" className="w-full">
                  <Button type="submit" variant="outline" className="w-full instant-activate-btn">
                    ⚡ Instant Sandbox Activation
                  </Button>
                </form>
              </div>
            )}
          </div>
        </article>
      </section>

      {/* Feature Comparison Table */}
      <section className="pricing-comparison-section" aria-labelledby="comparison-heading">
        <h2 id="comparison-heading" className="comparison-title">Detailed Plan Comparison</h2>
        <div className="comparison-table-wrap">
          <table className="comparison-table">
            <thead>
              <tr>
                <th scope="col">Capability</th>
                <th scope="col">Free Reader</th>
                <th scope="col">Desk Member</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Tracked Topic Following</td>
                <td>Up to 5 entities</td>
                <td><strong>Unlimited Following</strong></td>
              </tr>
              <tr>
                <td>In-App Daily Brief</td>
                <td>Standard deterministic</td>
                <td><strong>Grounded editorial synthesis</strong></td>
              </tr>
              <tr>
                <td>08:00 AM Morning Email Digest</td>
                <td>—</td>
                <td><strong>Included daily</strong></td>
              </tr>
              <tr>
                <td>Corroborated Multi-Source Timelines</td>
                <td>Included</td>
                <td>Included</td>
              </tr>
              <tr>
                <td>Billing Portal Management</td>
                <td>—</td>
                <td>Stripe hosted customer portal</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* Sandbox Notice & Guarantees */}
      <section className="pricing-disclaimers-card">
        <div className="disclaimer-row">
          <ShieldCheck size={20} className="text-data shrink-0" />
          <div>
            <h4>Test Mode Environment</h4>
            <p className="pricing-sandbox">
              <strong>Test mode only.</strong> The $5 monthly plan is a sandbox subscription. No real money is charged.
            </p>
          </div>
        </div>

        <div className="pricing-assurance">
          <p>
            <strong>What happens at checkout?</strong> Stripe hosts the payment form and stores payment-method details.
            Dअख़बार receives a customer ID and subscription status, never a full card number.
          </p>
          <p>
            <strong>Current environment:</strong> sandbox only. Test cards create test subscriptions and no real transaction is processed.
          </p>
        </div>

        <p className="pricing-terms">
          USD, billed monthly only after a future live launch. Review the <Link href="/terms">Terms</Link> and{' '}
          <Link href="/privacy">Privacy Policy</Link> before checkout. Need partnership options?{' '}
          <Link href="/partner">Partner with Dअख़बार →</Link>
        </p>
      </section>
    </main>
  );
}
