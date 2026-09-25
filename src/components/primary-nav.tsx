'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { navigationItems, mobileNavigationItems, type NavItem } from '@/lib/navigation';
import { Newspaper, Layers, Search, Heart, BookOpen, Bookmark, Compass, Gem, Menu } from 'lucide-react';
export function PrimaryNav({ signedIn, briefCount }: { signedIn: boolean; briefCount: number }) {
 const pathname = usePathname();
 const disclosure = useRef<HTMLDetailsElement>(null);
 const mobile = mobileNavigationItems(signedIn);
 useEffect(() => { if(disclosure.current) disclosure.current.open=false; }, [pathname]);
 useEffect(() => {
  const dismiss=(event: PointerEvent)=>{ if(disclosure.current && !disclosure.current.contains(event.target as Node)) disclosure.current.open=false; };
  const escape=(event: KeyboardEvent)=>{ if(event.key==='Escape' && disclosure.current?.open){disclosure.current.open=false;disclosure.current.querySelector('summary')?.focus();} };
  document.addEventListener('pointerdown',dismiss);document.addEventListener('keydown',escape);
  return()=>{document.removeEventListener('pointerdown',dismiss);document.removeEventListener('keydown',escape);};
 },[]);
 const icons = {newspaper:Newspaper,layers:Layers,search:Search,heart:Heart,book:BookOpen,bookmark:Bookmark,compass:Compass,gem:Gem};

 const itemLink=({href,label,icon}:NavItem)=>{const Icon=icons[icon];return <Link key={href} href={href} prefetch={href === '/brief' ? false : undefined} onClick={()=>{if(disclosure.current)disclosure.current.open=false;}} className={pathname === href ? 'nav-tab selected' : 'nav-tab'} aria-label={label} aria-current={pathname === href ? 'page' : undefined}><Icon size={20} aria-hidden="true"/><span className="nav-tab-label">{label}</span>{href === '/brief' && pathname !== href && briefCount > 0 && <span className="brief-badge" aria-label={`${briefCount} unread stories`}>{briefCount}</span>}</Link>;};
 return <><nav aria-label="Primary" className="icon-nav desktop-navigation">{navigationItems(signedIn).map(itemLink)}</nav><nav aria-label="Mobile primary" className="mobile-dock">{mobile.primary.map(itemLink)}<details ref={disclosure} className="mobile-more"><summary aria-label="More destinations"><Menu size={20}/><span>More</span></summary><div className="mobile-more-sheet"><span className="section-note">Your newspaper</span>{mobile.more.map(itemLink)}</div></details></nav></>;
}
