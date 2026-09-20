import Link from 'next/link';
import { UserButton } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { Newspaper, Search } from 'lucide-react';
import { getBriefNotificationCount } from '@/lib/reader-data';
import { BriefNavLink } from './brief-nav-link';
import { JoinUsButton } from './join-us-button';
import { Wordmark } from './wordmark';
import { Button } from './ui/button';

export async function SiteHeader() {
  const { userId } = await auth();
  const briefCount = userId ? await getBriefNotificationCount(userId) : 0;
  return <header className="site-header">
    <div className="site-nav">
      <div className="nav-brand"><Newspaper size={24} aria-hidden="true"/><Wordmark/></div>
      <nav aria-label="Primary">
        <Link href="/">Today</Link>
        <Link href="/search">Archive</Link>
        {userId && <Link href="/for-you">Following</Link>}
        {userId && <BriefNavLink count={briefCount}/>}
        <Link href="/methodology">Methodology</Link>
      </nav>
      <form action="/search" role="search" className="nav-search">
        <Search size={18} aria-hidden="true"/>
        <label className="sr-only" htmlFor="nav-query">Search the archive</label>
        <input id="nav-query" name="q" placeholder="Search the archive…"/>
        <Button size="icon" variant="ghost" aria-label="Search"><span aria-hidden="true">→</span></Button>
      </form>
      <div className="account-nav">{userId ? <UserButton/> : <JoinUsButton/>}</div>
    </div>
    <div className="nav-edition"><span>Independent signals. Developer perspective.</span><Link href="/search?q=OpenAI">AI & companies</Link><Link href="/search?q=PostgreSQL">Infrastructure</Link><Link href="/search?q=Rust">Languages & tools</Link></div>
  </header>;
}
