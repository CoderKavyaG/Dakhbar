import Link from 'next/link';
import { FollowingEmpty } from '@/components/following-empty';
import { StoryCard } from '@/components/story-card';
import { Badge } from '@/components/ui/badge';
import { briefSummary } from '@/lib/brief';
import { getBrief, getPopularEntities } from '@/lib/reader-data';
import { requireReader } from '@/lib/reader-auth';

export const dynamic = 'force-dynamic';

export default async function BriefPage() {
  const userId = await requireReader();
  const brief = await getBrief(userId);
  if (!brief.entityIds.length) {
    const popular = await getPopularEntities();
    return <main className="paper-shell reader-page brief-page"><header className="reader-hero"><p className="section-note">Catch me up</p><h1>Your Brief.</h1><p>A concise edition of what changed across the topics you follow.</p></header><FollowingEmpty entities={popular}/></main>;
  }
  const summary = briefSummary(brief.stories.length);
  return <main className="paper-shell reader-page brief-page">
    <header className="reader-hero"><div><p className="section-note">Catch me up</p><h1>Your Brief.</h1><p>{summary}</p></div><div className="brief-window"><span>Since</span><time dateTime={brief.since.toISOString()}>{brief.since.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</time></div></header>
    <section><header className="section-heading"><h2>{brief.stories.length ? 'What changed' : 'You are caught up'}</h2><Badge>{briefSummary(brief.stories.length)}</Badge></header>
      {brief.stories.length ? <div className="search-story-grid">{brief.stories.map(story => <StoryCard key={story.id} story={story}/>)}</div> : <div className="brief-caught-up"><h3>No new signals yet.</h3><p>Your next Brief will include stories published after this visit.</p><Link href="/for-you">Browse everything you follow →</Link></div>}
    </section>
  </main>;
}
