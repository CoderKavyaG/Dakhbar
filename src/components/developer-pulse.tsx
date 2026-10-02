import Link from 'next/link';
import { topicPath } from '@/lib/topic-slug';
import type { PulseSidebarItem } from '@/lib/pulse';

function percent(value: number) {
  return (value > 0 ? '+' : '') + value.toFixed(1) + '%';
}

export function DeveloperPulse({ snapshotAt, items }: { snapshotAt: Date | null; items: PulseSidebarItem[] }) {
  if (!snapshotAt || !items.length) return null;
  return (
    <aside className="developer-pulse" aria-labelledby="developer-pulse-title">
      <div className="pulse-header-group">
        <div className="pulse-heading">
          <span className="section-note">Developer Pulse</span>
          <h2 id="developer-pulse-title">Moving today</h2>
        </div>
        <div className="pulse-live-badge">
          <span className="live-pulsing-dot" aria-hidden="true" />
          <span>Moving Today</span>
        </div>
      </div>
      <p className="pulse-method">
        24-hour mention change versus prior completed UTC day across indexed sources.
      </p>
      <ol className="pulse-list">
        {items.map((item, index) => {
          const isPositive = item.velocity >= 0;
          return (
            <li key={item.entityId} className="pulse-item">
              <span className="pulse-rank">{String(index + 1).padStart(2, '0')}</span>
              <div className="pulse-info">
                <Link href={topicPath({ name: item.name })} className="pulse-topic-link">
                  {item.name}
                </Link>
                <div className="pulse-metrics">
                  <span>{item.mentionCount} mention{item.mentionCount === 1 ? '' : 's'}</span>
                  <span aria-hidden="true">/</span>
                  <span>{item.uniqueSourceCount} source{item.uniqueSourceCount === 1 ? '' : 's'}</span>
                </div>
              </div>
              <span className={`pulse-velocity-badge ${isPositive ? 'pulse-velocity-pos' : 'pulse-velocity-neg'}`}>
                {percent(item.velocity)}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="pulse-footer-meta">
        <time dateTime={snapshotAt.toISOString()}>Snapshot {snapshotAt.toISOString().slice(0, 10)}</time>
        <Link href="/topics">Explore topics →</Link>
      </div>
    </aside>
  );
}
