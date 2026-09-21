import Link from 'next/link';
import type { ReactNode } from 'react';
import { BrandMark } from './brand-mark';

export function LegalDocument({
  title,
  intro,
  effective,
  children,
}: {
  title: string;
  intro: string;
  effective: string;
  children: ReactNode;
}) {
  return <main className="paper-shell legal-page">
    <aside className="legal-sidebar">
      <BrandMark size={112}/>
      <p className="section-note">Reader policies</p>
      <nav aria-label="Legal documents">
        <Link href="/legal">Legal overview</Link>
        <Link href="/terms">Terms of Service</Link>
        <Link href="/privacy">Privacy Policy</Link>
        <Link href="/methodology">Methodology</Link>
      </nav>
      <p>Questions or source concerns:<br/><a href="mailto:codecraftkavya@gmail.com">codecraftkavya@gmail.com</a></p>
    </aside>
    <article className="legal-copy">
      <p className="section-note">Effective {effective}</p>
      <h1>{title}</h1>
      <p className="legal-intro">{intro}</p>
      {children}
    </article>
  </main>;
}
