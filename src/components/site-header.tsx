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
      <div className="account-nav">{reader?.subscription_status==='active'&&<Link href="/brief" className="desk-member-badge">Desk member</Link>}{userId ? <UserButton/> : <JoinUsButton/>}</div>
    </div>
    <div className="nav-edition"><span>Independent signals. Developer perspective.</span><Link href="/search?q=OpenAI">AI & companies</Link><Link href="/search?q=PostgreSQL">Infrastructure</Link><Link href="/search?q=Rust">Languages & tools</Link></div>
  </header>;
}
