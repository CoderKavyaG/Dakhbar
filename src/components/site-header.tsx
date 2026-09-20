import Link from 'next/link';
import { Show, UserButton } from '@clerk/nextjs';
import { Newspaper, Search } from 'lucide-react';
import { Wordmark } from './wordmark';
import { Button } from './ui/button';
export function SiteHeader(){return <header className="site-header">
  <div className="site-nav">
    <div className="nav-brand"><Newspaper size={24} aria-hidden="true"/><Wordmark/></div>
    <nav aria-label="Primary"><Link href="/">Today</Link><Link href="/search">Archive</Link><Link href="/for-you">Following</Link><Link href="/brief">Brief</Link><Link href="/methodology">Methodology</Link></nav>
    <form action="/search" role="search" className="nav-search"><Search size={18} aria-hidden="true"/><label className="sr-only" htmlFor="nav-query">Search the archive</label><input id="nav-query" name="q" placeholder="Search the archive…"/><Button size="icon" variant="ghost" aria-label="Search"><span aria-hidden="true">→</span></Button></form>
    <div className="account-nav"><Show when="signed-out"><Link href="/sign-in">Sign in</Link></Show><Show when="signed-in"><UserButton/></Show></div>
  </div>
  <div className="nav-edition"><span>Independent signals. Developer perspective.</span><Link href="/search?q=OpenAI">AI & companies</Link><Link href="/search?q=PostgreSQL">Infrastructure</Link><Link href="/search?q=Rust">Languages & tools</Link></div>
</header>;}
