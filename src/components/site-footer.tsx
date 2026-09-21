import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { ArrowUpRight } from 'lucide-react';
import { BrandMark } from './brand-mark';
import { Wordmark } from './wordmark';

export async function SiteFooter() {
  const { userId } = await auth();
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-brand"><BrandMark size={88}/><div><Wordmark/><p>A considered edition of the developer world.<br/>Follow the story. Read the original.</p></div></div>
      <nav aria-label="Explore"><h2>The edition</h2><Link href="/">Front Page</Link><Link href="/search">Search & archive</Link>{userId&&<Link href="/for-you">Following</Link>}{userId&&<Link href="/brief">Your Brief</Link>}<Link href="/methodology">How we work</Link><Link href="/pricing">Pricing</Link></nav>
      <nav aria-label="Topics"><h2>Browse a sector</h2><Link href="/search?q=OpenAI">AI & companies</Link><Link href="/search?q=PostgreSQL">Infrastructure</Link><Link href="/search?q=Rust">Languages & tools</Link></nav>
      <div className="footer-note"><h2>Keep the source in sight.</h2><p>Every story leads back to the reporting behind it.</p><Link href="/methodology">Explore our methodology <ArrowUpRight size={16}/></Link></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} Dअख़बार</span><span>Built for curious developers</span><span><Link href="/legal">Legal</Link> · <Link href="/terms">Terms</Link> · <Link href="/privacy">Privacy</Link> · <Link href="/admin">Editorial desk</Link></span></div>
  </footer>;
}
