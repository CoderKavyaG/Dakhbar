import Link from 'next/link';
import { db } from '@/lib/db';
import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { Search } from 'lucide-react';
import { getBriefNotificationCount } from '@/lib/reader-data';
import { BrandMark } from './brand-mark';
import { PrimaryNav } from './primary-nav';
import { JoinUsButton } from './join-us-button';
import { Wordmark } from './wordmark';
import { Button } from './ui/button';

export async function SiteHeader() {
  const { userId } = await auth();
  const briefCount = userId ? await getBriefNotificationCount(userId) : 0;
  const reader = userId ? await db.user.findUnique({where:{id:userId},select:{subscription_status:true}}) : null;
  return <header className="site-header">
    <div className="site-nav">
      <div className="nav-brand"><Link href="/" aria-label="D Akhbar front page"><BrandMark size={44} priority/></Link><Wordmark/></div>
      <PrimaryNav signedIn={Boolean(userId)} briefCount={briefCount}/>
      <form action="/search" role="search" className="nav-search">
        <Search size={18} aria-hidden="true"/>
        <label className="sr-only" htmlFor="nav-query">Search the archive</label>
        <input id="nav-query" name="q" placeholder="Search the archive…"/>
        <Button size="icon" variant="ghost" aria-label="Search"><span aria-hidden="true">→</span></Button>
      </form>
      <div className="account-nav">{reader?.subscription_status==='active'&&<Link href="/?tab=following" className="desk-member-badge">Desk member</Link>}{userId ? <UserButton/> : <JoinUsButton/>}</div>
    </div>
    <div className="nav-edition">
      <div className="edition-tagline">
        <span className="tagline-dot" aria-hidden="true" />
        <span>Independent signals. Developer perspective.</span>
      </div>
      <nav className="edition-sectors" aria-label="Sectors and telemetry">
        <Link href="/category/ai-companies" className="sector-nav-link">AI & companies</Link>
        <Link href="/category/infrastructure" className="sector-nav-link">Infrastructure</Link>
        <Link href="/category/languages-tools" className="sector-nav-link">Languages & tools</Link>
        <Link href="/pulse" className="sector-nav-link pulse-nav-link"><span className="pulse-dot" aria-hidden="true" />Pulse Radar</Link>
        <Link href="/topics" className="topics-link">All topics →</Link>
      </nav>
    </div>
  </header>;
}

