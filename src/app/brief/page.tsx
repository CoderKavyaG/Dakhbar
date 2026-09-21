import Link from 'next/link';
import { FollowingEmpty } from '@/components/following-empty';
import { StoryCard } from '@/components/story-card';
import { Badge } from '@/components/ui/badge';
import { briefSummary } from '@/lib/brief';
import { generateBriefStoryCopy } from '@/lib/brief-generation';
import { db } from '@/lib/db';
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
  const subscription = await db.user.findUnique({ where: { id: userId }, select: { subscription_status: true } });
  const generated = new Map<string, string>();
  if (subscription?.subscription_status === 'active') {
    for (const [index, story] of brief.stories.entries()) {
      const copy = await generateBriefStoryCopy(story, userId, index === 0);
      if (copy.generated) generated.set(story.id, copy.text);
    }
  }
  const summary = generated.size ? `An editorial Brief synthesized from ${brief.stories.length} verified development${brief.stories.length === 1 ? '' : 's'}.` : briefSummary(brief.stories.length);
  return <main className="paper-shell reader-page brief-page">
    <header className="reader-hero paper-hero"><div><p className="section-note">Catch me up</p><h1>Your Brief.</h1><p>{summary}</p>{generated.size > 0 && <span className="synthesis-note">Grounded synthesis — every claim constrained to indexed reporting</span>}</div><div className="brief-window"><span>Since</span><time dateTime={brief.since.toISOString()}>{brief.since.toLocaleString('en-IN',{timeZone:'Asia/Kolkata',day:'numeric',month:'short',hour:'numeric',minute:'2-digit'})}</time></div></header>
    <section><header className="section-heading"><h2>{brief.stories.length ? 'What changed' : 'You are caught up'}</h2><Badge>{briefSummary(brief.stories.length)}</Badge></header>
      {brief.stories.length ? <div className="search-story-grid brief-story-grid">{brief.stories.map((story, index) => <StoryCard key={story.id} story={story} featured={generated.has(story.id) && index === 0} dekOverride={generated.get(story.id)}/>)}</div> : <div className="brief-caught-up"><h3>No new signals yet.</h3><p>Your next Brief will include stories published after this visit.</p><Link href="/for-you">Browse everything you follow →</Link></div>}
    </section>
  </main>;
}
