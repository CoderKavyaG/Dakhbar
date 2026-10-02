import React from 'react';
import Link from 'next/link';
import { TabloidArrowUpRight, TabloidSparkles } from './pop-tabloid-icons';

interface AdPlacementProps {
  slot?: 'sidebar' | 'inline' | 'story-sidebar' | 'footer';
  className?: string;
  adClient?: string; // e.g. ca-pub-XXXXXXXXXXXXXXXX
  adSlotId?: string;
}

export function AdPlacement({
  slot = 'sidebar',
  className = '',
  adClient = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || 'ca-pub-dakhbar-demo',
  adSlotId = '1234567890',
}: AdPlacementProps) {
  return (
    <aside
      className={`ad-placement-card ad-slot-${slot} ${className}`}
      aria-label="Sponsored Partner Dispatch"
      data-ad-slot-container={slot}
    >
      <div className="ad-placement-header">
        <span className="ad-label">Partner Dispatch</span>
        <span className="ad-pill">Sponsored</span>
      </div>

      {/* Google AdSense / Sponsor Injection Container */}
      <div
        className="ad-content-box"
        data-ad-client={adClient}
        data-ad-slot={adSlotId}
        data-ad-format="auto"
        data-full-width-responsive="true"
      >
        <div className="ad-editorial-fallback">
          <div className="ad-icon-wrap">
            <TabloidSparkles size={16} className="text-data" />
          </div>
          <div className="ad-text-body">
            <h4>Modern Developer Infrastructure</h4>
            <p>High-throughput telemetry, deterministic pipelines, and verified developer reporting.</p>
          </div>
          <div className="ad-action-row">
            <Link href="/partner" className="ad-cta-link">
              Partner with Dअख़बार <TabloidArrowUpRight size={12} className="inline-icon" />
            </Link>
          </div>
        </div>
      </div>
    </aside>
  );
}
