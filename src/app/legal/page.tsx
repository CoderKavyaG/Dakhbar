import Link from 'next/link';
import { ArrowUpRight, FileText, ShieldCheck } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';

export default function LegalOverviewPage() {
  return <main className="paper-shell legal-overview">
    <header><div><p className="section-note">Clear policies for a source-linked product</p><h1>Legal, privacy, and reader trust.</h1><p>Dअख़बार indexes public reporting, stores only the reader data needed for accounts and Briefs, and uses Stripe test mode while payment plumbing is being verified.</p></div><BrandMark size={240} priority/></header>
    <section className="legal-card-grid">
      <Link href="/terms" className="legal-card"><FileText/><div><h2>Terms of Service</h2><p>How source material, accounts, subscriptions, and acceptable use work.</p><span>Read the Terms <ArrowUpRight size={16}/></span></div></Link>
      <Link href="/privacy" className="legal-card"><ShieldCheck/><div><h2>Privacy Policy</h2><p>What reader data is processed, why it is needed, and how to exercise your choices.</p><span>Read the Privacy Policy <ArrowUpRight size={16}/></span></div></Link>
    </section>
    <aside className="legal-status"><strong>Payment status</strong><p>All current checkout flows use Stripe test mode. No real transaction is processed and no live paid service is offered yet.</p></aside>
  </main>;
}
