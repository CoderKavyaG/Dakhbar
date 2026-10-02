import Link from 'next/link';
import { ExternalLink, Sparkles, ShieldCheck, Layers, Terminal, Mail, CheckCircle2, ArrowRight } from 'lucide-react';
import { BrandMark } from '@/components/brand-mark';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'Partner with Dअख़बार · Developer Ecosystem Sponsorships',
  description: 'Reach software architects, engineering leads, and technical founders through high-trust, evidence-led developer intelligence.',
};

export default function PartnerPage() {
  return (
    <main className="paper-shell partner-page">
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link href="/">Today</Link>
        <span>/</span>
        <span>Partner with Dअख़बार</span>
      </nav>

      {/* Hero Header */}
      <header className="partner-hero">
        <div className="partner-hero-content">
          <Badge className="badge-partner-kicker">Developer Ecosystem Partnerships</Badge>
          <h1 className="partner-title">Reach engineers where evidence matters.</h1>
          <p className="partner-lead">
            Dअख़बार indexes, cross-corroborates, and synthesizes technical reporting for software architects,
            frontier AI developers, and technical founders. Our sponsorship placements offer high-trust native
            visibility without invasive tracking or banner blindness.
          </p>
          <div className="partner-cta-row">
            <Button asChild className="partner-primary-btn">
              <a href="mailto:partnerships@dakhbar.com?subject=Dakhbar%20Partnership%20Inquiry">
                <Mail size={16} className="inline-icon" /> Inquire for Sponsorship
              </a>
            </Button>
            <Button asChild variant="outline">
              <Link href="/pricing">View Reader Memberships</Link>
            </Button>
          </div>
        </div>
        <div className="partner-brand-panel" aria-hidden="true">
          <BrandMark size={220} priority />
          <span className="partner-edition-label">Ecosystem Dispatch</span>
        </div>
      </header>

      {/* Trust & Audience Stats Strip */}
      <section className="partner-stats-strip" aria-label="Audience Profile">
        <div className="partner-stat-box">
          <span className="stat-number">100%</span>
          <span className="stat-name">Technical Readership</span>
          <span className="stat-sub">Architects, Staff+ Engineers, Technical Founders</span>
        </div>
        <div className="partner-stat-box">
          <span className="stat-number">0</span>
          <span className="stat-name">Third-Party Trackers</span>
          <span className="stat-sub">Strict privacy compliance; zero surveillance scripts</span>
        </div>
        <div className="partner-stat-box">
          <span className="stat-number">1 Click</span>
          <span className="stat-name">Primary Evidence Link</span>
          <span className="stat-sub">Direct access to your docs, repos, and benchmarks</span>
        </div>
      </section>

      {/* Sponsorship Formats Grid */}
      <section className="partner-formats-section" aria-labelledby="formats-heading">
        <header className="section-heading">
          <div>
            <span className="section-note">Sponsorship Formats</span>
            <h2 id="formats-heading">Native, respected placements.</h2>
          </div>
          <p>Every partner placement is clearly labeled as Sponsored and styled in Dअख़बार’s clean editorial language.</p>
        </header>

        <div className="partner-formats-grid">
          {/* Format 1: Partner Dispatch Card */}
          <article className="format-card">
            <div className="format-icon-wrap">
              <Sparkles size={22} className="text-data" />
            </div>
            <span className="format-type">Native Rail Placement</span>
            <h3>Partner Dispatch</h3>
            <p>
              Integrated alongside corroborated story timelines, reader feeds, and search dossier views.
              Framed as an editorial dispatch with headline, concise description, and direct external link.
            </p>
            <ul className="format-features">
              <li><CheckCircle2 size={15} className="text-data" /> High visual prominence in 340px sticky rails</li>
              <li><CheckCircle2 size={15} className="text-data" /> Contextual keyword & topic targeting</li>
              <li><CheckCircle2 size={15} className="text-data" /> Clean Google AdSense / Direct Iframe slot</li>
            </ul>
          </article>

          {/* Format 2: Sector Dominance */}
          <article className="format-card featured-format">
            <div className="format-badge-banner">Most Impactful</div>
            <div className="format-icon-wrap">
              <Layers size={22} className="text-data" />
            </div>
            <span className="format-type">Vertical Sponsorship</span>
            <h3>Sector Category Lead</h3>
            <p>
              Exclusive category alignment across one of Dअख़बार’s three major verticals: AI & Foundation Models,
              Cloud & Distributed Systems, or Modern Languages & Tooling.
            </p>
            <ul className="format-features">
              <li><CheckCircle2 size={15} className="text-data" /> Masthead branding across the sector index</li>
              <li><CheckCircle2 size={15} className="text-data" /> Telemetry attribution on sector mover cards</li>
              <li><CheckCircle2 size={15} className="text-data" /> Includes 4 monthly native story sponsorships</li>
            </ul>
          </article>

          {/* Format 3: Daily Email Brief */}
          <article className="format-card">
            <div className="format-icon-wrap">
              <Mail size={22} className="text-data" />
            </div>
            <span className="format-type">Inbox Delivery</span>
            <h3>Morning Brief Sponsor</h3>
            <p>
              Direct sponsor attribution in the daily 08:00 AM source-linked Brief email delivered to all
              paying Desk members and subscribers.
            </p>
            <ul className="format-features">
              <li><CheckCircle2 size={15} className="text-data" /> Single exclusive sponsor note per edition</li>
              <li><CheckCircle2 size={15} className="text-data" /> 52%+ verified open rate among engineering leads</li>
              <li><CheckCircle2 size={15} className="text-data" /> Markdown & plaintext format fidelity</li>
            </ul>
          </article>
        </div>
      </section>

      {/* Editorial Standards & Integrity */}
      <section className="partner-standards-card">
        <div className="standards-icon">
          <ShieldCheck size={28} className="text-data" />
        </div>
        <div className="standards-copy">
          <h3>Editorial Integrity & Transparency</h3>
          <p>
            Dअख़बार maintains a strict separation between journalism and sponsorship. Paid placements are always
            transparently marked as <em>Sponsored</em> or <em>Partner Dispatch</em>. Sponsorship does not influence
            indexing, clustering thresholds, or factual synthesis rankings.
          </p>
          <div className="standards-contact">
            <span>Ready to reach modern developers?</span>
            <a href="mailto:partnerships@dakhbar.com" className="standards-email-link">
              partnerships@dakhbar.com <ArrowRight size={14} className="inline-icon" />
            </a>
          </div>
        </div>
      </section>
    </main>
  );
}
