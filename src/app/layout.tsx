import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { IBM_Plex_Mono, IBM_Plex_Sans, Martel, Newsreader } from 'next/font/google';
import './globals.css';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';

const display = Newsreader({
  subsets: ['latin'],
  variable: '--font-newsreader',
  display: 'swap',
});

const body = IBM_Plex_Sans({
  subsets: ['latin'],
  variable: '--font-plex-sans',
  display: 'swap',
});

const data = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-plex-mono',
  display: 'swap',
});

const devanagari = Martel({
  subsets: ['devanagari'],
  weight: ['600', '700'],
  variable: '--font-martel',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Dअख़बार',
  description: 'Evidence-led developer intelligence',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fonts = [display.variable, body.variable, data.variable, devanagari.variable].join(' ');
  return <ClerkProvider><html lang="en" className={fonts}><body><SiteHeader/>{children}<SiteFooter/></body></html></ClerkProvider>;
}
