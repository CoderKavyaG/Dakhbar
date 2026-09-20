'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function BriefNavLink({ count }: { count: number }) {
  const pathname = usePathname();
  const showCount = pathname !== '/brief' && count > 0;
  return <Link href="/brief" className="brief-nav-link">
    Brief
    {showCount && <span className="brief-badge" aria-label={`${count} unread Brief ${count === 1 ? 'story' : 'stories'}`}>{count}</span>}
  </Link>;
}
