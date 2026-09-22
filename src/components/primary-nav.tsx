'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { navigationItems } from '@/lib/navigation';
import { Newspaper, Search, Heart, BookOpen, Bookmark, Compass, Gem } from 'lucide-react';
export function PrimaryNav({ signedIn, briefCount }: { signedIn: boolean; briefCount: number }) {
  const pathname = usePathname();
  const items = navigationItems(signedIn);
  const icons = {newspaper:Newspaper,search:Search,heart:Heart,book:BookOpen,bookmark:Bookmark,compass:Compass,gem:Gem};
  return <nav aria-label="Primary" className="icon-nav">{items.map(({href,label,icon}) => { const Icon=icons[icon]; return <Link key={href} href={href} prefetch={href === '/brief' ? false : undefined} className={pathname === href ? 'nav-tab selected' : 'nav-tab'} aria-label={label} aria-current={pathname === href ? 'page' : undefined}><Icon size={19} aria-hidden="true"/><span className="nav-tab-label">{label}</span>{href === '/brief' && pathname !== href && briefCount > 0 && <span className="brief-badge" aria-label={`${briefCount} unread stories`}>{briefCount}</span>}</Link>;})}</nav>;
}
