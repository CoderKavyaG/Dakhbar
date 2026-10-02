import Link from 'next/link';
import { db } from '@/lib/db';
import { auth } from '@clerk/nextjs/server';
import { getBriefNotificationCount } from '@/lib/reader-data';
import { getTrendingTopics } from '@/lib/search-suggestions';
import { BrandMark } from './brand-mark';
import { PrimaryNav } from './primary-nav';
import { ExpandableSearch } from './expandable-search';
import { AccountMenu } from './account-menu';
import { Wordmark } from './wordmark';

export async function SiteHeader() {
  const { userId } = await auth();
  const [briefCount, reader, initialTrending, savedCount] = await Promise.all([
    userId ? getBriefNotificationCount(userId) : Promise.resolve(0),
    userId
      ? db.user.upsert({
          where: { id: userId },
          update: {},
          create: { id: userId, subscription_status: 'free' },
          select: { subscription_status: true },
        })
      : Promise.resolve(null),
    getTrendingTopics(6),
    userId ? db.savedStory.count({ where: { user_id: userId } }) : Promise.resolve(0),
  ]);

  return (
    <header className="site-header">
      <div className="site-nav">
        <div className="nav-brand">
          <Link href="/" aria-label="D Akhbar front page">
            <BrandMark size={36} priority />
          </Link>
          <Wordmark />
        </div>
        <PrimaryNav signedIn={Boolean(userId)} briefCount={briefCount} />
        <ExpandableSearch initialTrending={initialTrending} />
        <div className="account-nav">
          <AccountMenu
            signedIn={Boolean(userId)}
            subscriptionStatus={reader?.subscription_status}
            savedCount={savedCount}
          />
        </div>
      </div>
    </header>
  );
}

