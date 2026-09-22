import Link from 'next/link';
import { topicPath } from '@/lib/topic-slug';
import type { PulseSidebarItem } from '@/lib/pulse';

function percent(value: number) {
  return (value > 0 ? '+' : '') + value.toFixed(1) + '%';
}

export function DeveloperPulse({ snapshotAt, items }: { snapshotAt: Date | null; items: PulseSidebarItem[] }) {
  if (!snapshotAt || !items.length) return null;
  return <aside className="developer-pulse" aria-labelledby="developer-pulse-title">
    <div className="pulse-heading"><span className="section-note">Developer Pulse</span><h2 id="developer-pulse-title">Moving today</h2></div>
    <p className="pulse-method">Mention change versus the prior completed UTC day. Built from indexed reporting only.</p>
    <ol>{items.map(item => <li key={item.entityId}>
      <Link href={topicPath({ name: item.name })}><span>{item.name}</span><strong>{percent(item.velocity)}</strong></Link>
      <small>{item.mentionCount} mention{item.mentionCount === 1 ? '' : 's'} · {item.uniqueSourceCount} source{item.uniqueSourceCount === 1 ? '' : 's'}</small>
    </li>)}</ol>
    <time dateTime={snapshotAt.toISOString()}>Measured {snapshotAt.toISOString().slice(0, 10)}</time>
  </aside>;
}
