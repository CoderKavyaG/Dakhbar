import Link from 'next/link';
import { FollowingEmpty } from '@/components/following-empty';
import { StoryCard } from '@/components/story-card';
import { Badge } from '@/components/ui/badge';
import { getForYouStories, getPopularEntities } from '@/lib/reader-data';
import { requireReader } from '@/lib/reader-auth';

export const dynamic = 'force-dynamic';

export default async function ForYouPage() {
  const userId = await requireReader();
  const feed = await getForYouStories(userId);
  if (!feed.entityIds.length) {
    const popular = await getPopularEntities();
    return <main className="paper-shell reader-page"><header className="reader-hero"><p className="section-note">Following</p><h1>Your developer world.</h1><p>Stories from topics you choose, ordered by the same evidence-led ranking as Today.</p></header><FollowingEmpty entities={popular}/></main>;
  }
  return <main className="paper-shell reader-page">
    <header className="reader-hero"><div><p className="section-note">Following</p><h1>Your developer world.</h1><p>Stories mentioning the topics you follow. Today remains ecosystem-wide and unchanged.</p></div><Badge>{feed.entityIds.length} {feed.entityIds.length === 1 ? 'topic' : 'topics'} followed</Badge></header>
    <section><header className="section-heading"><h2>For you</h2><Link href="/search">Follow more topics →</Link></header><div className="search-story-grid">{feed.stories.map(story => <StoryCard key={story.id} story={story}/>)}</div></section>
  </main>;
}
