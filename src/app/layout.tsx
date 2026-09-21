import type { Metadata } from 'next';
import { ClerkProvider } from '@clerk/nextjs';
import { auth } from '@clerk/nextjs/server';
import { IBM_Plex_Mono, IBM_Plex_Sans, Martel, Newsreader } from 'next/font/google';
import './globals.css';
import { FollowingProvider } from '@/components/following-provider';
import { SiteHeader } from '@/components/site-header';
import { SiteFooter } from '@/components/site-footer';
import { getFollowingEntityIds } from '@/lib/reader-data';

const display = Newsreader({ subsets: ['latin'], variable: '--font-newsreader', display: 'swap' });
const body = IBM_Plex_Sans({ subsets: ['latin'], variable: '--font-plex-sans', display: 'swap' });
const data = IBM_Plex_Mono({ subsets: ['latin'], weight: ['400', '500', '600'], variable: '--font-plex-mono', display: 'swap' });
const devanagari = Martel({ subsets: ['devanagari'], weight: ['600', '700'], variable: '--font-martel', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Dअख़बार', template: '%s · Dअख़बार' },
  description: 'Evidence-led developer intelligence',
  icons: {
    icon: '/brand/dakhbar-reporter.png',
    apple: '/brand/dakhbar-reporter.png',
  },
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fonts = [display.variable, body.variable, data.variable, devanagari.variable].join(' ');
  const { userId } = await auth();
  const followedEntityIds = userId ? await getFollowingEntityIds(userId) : [];
  return <ClerkProvider><html lang="en" className={fonts}><body><FollowingProvider initialEntityIds={followedEntityIds}><SiteHeader/>{children}<SiteFooter/></FollowingProvider></body></html></ClerkProvider>;
}
