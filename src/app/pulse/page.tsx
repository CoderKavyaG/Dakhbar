import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Compass, Lock, ArrowRight, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { db } from '@/lib/db';
import { getPulseRadarData } from '@/lib/radar';
import { PulseRadarChart } from '@/components/pulse-radar-chart';

export const dynamic = 'force-dynamic';

export default async function PulseRadarPage() {
  const { userId } = await auth();
  const reader = userId
    ? await db.user.findUnique({
        where: { id: userId },
        select: { subscription_status: true },
      })
    : null;

  const isSubscriber = reader?.subscription_status === 'active';
  const dataset = await getPulseRadarData();

  return (
    <main className="paper-shell pulse-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span>/</span>
        <Link href="/topics">All topics</Link>
        <span>/</span>
        <span>Developer Pulse Radar</span>
      </nav>

      <header className="pulse-header">
        <div className="pulse-title-wrap">
          <div className="pulse-badge-row">
            <span className="section-note">Developer Pulse · Tier 2 Intelligence</span>
            <Badge className="badge-radar">
              <Compass size={12} className="inline-icon" /> Quadrant Telemetry
            </Badge>
          </div>
          <h1>Developer Pulse Radar</h1>
          <p className="pulse-subtitle">
            Deterministic momentum and adoption mapping across the developer landscape. Quadrants classify
            emerging breakouts, surging momentum, foundational workhorses, and steady technologies.
          </p>
        </div>

        {/* Honest Eligibility & History Count Strip */}
        <div className="pulse-history-strip">
          <div className="history-count-item">
            <Activity size={16} className="inline-icon text-data" />
            <span>
              <strong>
                {dataset.eligibleCount} of {dataset.totalTracked}
              </strong>{' '}
              tracked entities currently have enough history to appear on the Radar
            </span>
          </div>
          <div className="history-badge-item">
            <small>Requires &ge; 7 daily snapshot checkpoints · No fabricated positions</small>
          </div>
        </div>
      </header>

      {/* Main Content: Interactive SVG Chart for Subscribers, Upgrade Gate for Free Readers */}
      {isSubscriber ? (
        <section className="pulse-chart-section" aria-labelledby="radar-chart-title">
          <h2 id="radar-chart-title" className="sr-only">
            Interactive Pulse Radar Quadrant Map
          </h2>
          <PulseRadarChart dataset={dataset} />

          {/* Excluded Entities Honest Disclosure (if any) */}
          {dataset.excludedEntities.length > 0 && (
            <div className="radar-excluded-disclosure">
              <h3>Excluded Topics (Insufficient History)</h3>
              <p>
                Per project honesty rules, entities without at least 7 consecutive daily snapshots are
                excluded from the quadrant map rather than plotted with fabricated or interpolated data:
              </p>
              <ul>
                {dataset.excludedEntities.map(e => (
                  <li key={e.id}>
                    <strong>{e.name}</strong>: {e.reason}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      ) : (
        <div className="pulse-upgrade-card">
          <div className="upgrade-icon-wrap">
            <Lock size={28} className="text-data" />
          </div>
          <h2>Developer Pulse Radar is exclusive to Desk members</h2>
          <p>
            Desk subscribers access real-time quadrant momentum telemetry mapping emerging breakouts,
            surging leaders, and core infrastructure across 49 tracked technologies.
          </p>

          <div className="upgrade-stats-preview">
            <div className="preview-stat">
              <strong>{dataset.eligibleCount}</strong>
              <small>active technologies</small>
            </div>
            <div className="preview-stat">
              <strong>4</strong>
              <small>momentum quadrants</small>
            </div>
            <div className="preview-stat">
              <strong>7d</strong>
              <small>velocity baseline</small>
            </div>
          </div>

          <Button asChild variant="default" className="upgrade-cta-btn">
            <Link href="/pricing">
              Upgrade to Desk for $12/month <ArrowRight size={16} className="inline-icon" />
            </Link>
          </Button>
          <small className="upgrade-footnote">Cancel anytime. Free 14-day trial included.</small>
        </div>
      )}
    </main>
  );
}
