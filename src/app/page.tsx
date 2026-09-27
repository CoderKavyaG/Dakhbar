import { ArticleGrid } from '@/components/article-grid';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { EditionWelcome } from '@/components/edition-welcome';
import { FreshEdition } from '@/components/fresh-edition';
import { EntityFollowControl } from '@/components/entity-follow-control';
import { FollowToggle } from '@/components/follow-toggle';
import { StoryCard } from '@/components/story-card';
import { TodayEdition } from '@/components/today-edition';
import { DeveloperPulse } from '@/components/developer-pulse';
import { FollowingEmpty } from '@/components/following-empty';
import { BriefReadReceipt } from '@/components/brief-read-receipt';
import { getDeveloperPulse } from '@/lib/pulse';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getFrontPageStories } from '@/lib/front-page';
import { countIndependentSources, storyDek, storyDestination } from '@/lib/story-evidence';
import { topicPath } from '@/lib/topic-slug';
import { briefSummary } from '@/lib/brief';
import { generateBriefEdition } from '@/lib/brief-edition';
import { db } from '@/lib/db';
import { getBrief, getForYouStories, getPopularEntities, getBriefNotificationCount } from '@/lib/reader-data';

export const dynamic = 'force-dynamic';

export default async function FrontPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { tab } = (await searchParams) ?? {};
  const { userId } = await auth();
  const isFollowingTab = Boolean(userId && tab === 'following');

  // --- Following Tab for Signed-In Users ---
  if (userId && isFollowingTab) {
    const [brief, forYou, popular, subscription, briefCount] = await Promise.all([
      getBrief(userId),
      getForYouStories(userId),
      getPopularEntities(),
      db.user.findUnique({ where: { id: userId }, select: { subscription_status: true } }),
      getBriefNotificationCount(userId),
    ]);

    const generated = new Map<string, string>();
    if (subscription?.subscription_status === 'active' && brief.stories.length > 0) {
      const edition = await generateBriefEdition(brief.stories, userId);
      for (const [id, copy] of Object.entries(edition.copies)) {
        if (copy.generated) generated.set(id, copy.text);
      }
    }

    const summary = generated.size
      ? `An editorial Brief synthesized from ${brief.stories.length} verified development${brief.stories.length === 1 ? '' : 's'}.`
      : briefSummary(brief.stories.length);

    if (!brief.entityIds.length && !forYou.entityIds.length) {
      return (
        <main className="paper-shell reader-page">
          <div className="front-tabs-container">
            <nav className="front-tabs" aria-label="Edition view">
              <Link href="/?tab=today" className="front-tab">Today</Link>
              <Link href="/?tab=following" className="front-tab active" aria-current="page">Following</Link>
            </nav>
          </div>
          <header className="reader-hero">
            <p className="section-note">Personalized edition</p>
            <h1>Your developer world.</h1>
            <p>Stories from topics you choose, ordered by the same evidence-led ranking as Today.</p>
          </header>
          <FollowingEmpty entities={popular} />
        </main>
      );
    }

    const storiesToRender = brief.stories.length > 0 ? brief.stories : forYou.stories;

    return (
      <main className="paper-shell reader-page">
        <BriefReadReceipt at={brief.visitedAt.toISOString()} />
        <div className="front-tabs-container">
          <nav className="front-tabs" aria-label="Edition view">
            <Link href="/?tab=today" className="front-tab">Today</Link>
            <Link href="/?tab=following" className="front-tab active" aria-current="page">
              Following
              {briefCount > 0 && <span className="front-tab-badge">{briefCount}</span>}
            </Link>
          </nav>
        </div>

        <header className="reader-hero paper-hero">
          <div>
            <p className="section-note">Personalized edition</p>
            <h1>Your developer world.</h1>
            <p>
              {brief.revisited
                ? 'You are caught up. Your last Brief is kept here to finish reading.'
                : brief.stories.length > 0
                ? summary
                : 'You are caught up on new reporting. Here is the topic archive from everything you follow.'}
            </p>
            {generated.size > 0 && (
              <span className="synthesis-note">Grounded synthesis — every claim constrained to indexed reporting</span>
            )}
          </div>
          <div className="brief-window">
            <span>Since</span>
            <time dateTime={brief.since.toISOString()}>
              {brief.since.toLocaleString('en-IN', {
                timeZone: 'Asia/Kolkata',
                day: 'numeric',
                month: 'short',
                hour: 'numeric',
                minute: '2-digit',
              })}
            </time>
          </div>
        </header>

        <section>
          <header className="section-heading">
            <div>
              <span className="section-note">Topic telemetry</span>
              <h2>
                {brief.revisited
                  ? 'Your latest edition'
                  : brief.stories.length > 0
                  ? 'Updates from followed topics'
                  : 'Followed topics archive'}
              </h2>
            </div>
            <Badge>
              {brief.entityIds.length} {brief.entityIds.length === 1 ? 'topic' : 'topics'} followed
            </Badge>
          </header>

          {storiesToRender.length > 0 ? (
            <ArticleGrid className="article-grid-results">
              {storiesToRender.map((story, index) => (
                <StoryCard
                  key={story.id}
                  story={story}
                  featured={generated.has(story.id) && index === 0}
                  dekOverride={generated.get(story.id)}
                />
              ))}
            </ArticleGrid>
          ) : (
            <div className="brief-caught-up">
              <h3>No stories recorded yet for followed topics.</h3>
              <p>Explore all topics to add frameworks, databases, and companies to your feed.</p>
              <Link href="/topics">Browse all topics →</Link>
            </div>
          )}
        </section>
      </main>
    );
  }

  // --- "Today" Front Page (Default & Anonymous) ---
  const [stories, pulse, briefCount] = await Promise.all([
    getFrontPageStories(),
    getDeveloperPulse(),
    userId ? getBriefNotificationCount(userId) : Promise.resolve(0),
  ]);

  const [lead, ...rest] = stories;
  const date = new Intl.DateTimeFormat('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Kolkata',
  }).format(new Date());

  if (!lead) {
    return (
      <main className="paper-shell">
        <section className="empty-edition">
          <h1>The next edition is taking shape.</h1>
          <p>Browse the archive while new stories arrive.</p>
          <Link href="/search">Read the archive →</Link>
        </section>
      </main>
    );
  }

  const documents = lead.documents.map(m => m.raw_document);
  const destination = storyDestination(lead.id, documents);
  const evidence = documents.find(d => d.og_description) ?? documents[0];
  const dek = storyDek(evidence, 360);
  const count = countIndependentSources(documents);

  return (
    <main className="paper-shell">
      {userId && (
        <div className="front-tabs-container">
          <nav className="front-tabs" aria-label="Edition view">
            <Link href="/?tab=today" className="front-tab active" aria-current="page">Today</Link>
            <Link href="/?tab=following" className="front-tab">
              Following
              {briefCount > 0 && <span className="front-tab-badge">{briefCount}</span>}
            </Link>
          </nav>
        </div>
      )}
      <EditionWelcome />
      <FreshEdition />
      <div className="edition-intro">
        <p>{date}</p>
        <Badge>{stories.length} selected stories</Badge>
      </div>
      <section className="lead-stage">
        <article className="lead-copy">
          <div className="lead-meta">
            {lead.entities.slice(0, 3).map(e => (
              <EntityFollowControl
                key={e.entity_id}
                entity={{ id: e.entity_id, name: e.entity.name }}
                returnTo={topicPath(e.entity)}
              />
            ))}
          </div>
          <h1>
            <a href={destination.href}>{lead.title}</a>
          </h1>
          <p className="lead-dek">{dek.kind === 'domain' ? 'Reporting from ' : ''}{dek.text}</p>
          <div className="lead-actions">
            <FollowToggle
              entityIds={lead.entities.map(e => e.entity_id)}
              returnTo="/"
              followLabel="Follow the story"
              followingLabel="Following this story"
            />
            <Button asChild variant="outline">
              <a href={destination.href}>{destination.external ? 'Read original' : 'Read coverage'} ↗</a>
            </Button>
            {count > 1 && <span>{count} reporting sources</span>}
          </div>
        </article>
        <TodayEdition
          stories={stories.slice(0, 3).map(story => {
            const docs = story.documents.map(item => item.raw_document);
            return {
              id: story.id,
              title: story.title,
              ...storyDestination(story.id, docs),
              image: docs.find(doc => doc.og_image_url)?.og_image_url,
            };
          })}
          date={date}
        />
      </section>

      <div className="front-page-body">
        <div>
          <section className="top-stories">
            <header className="section-heading">
              <div>
                <span className="section-note">The main edition</span>
                <h2>Worth your attention</h2>
              </div>
              <span>Four stories to start with</span>
            </header>
            <ArticleGrid className="article-grid-top">
              {rest.slice(0, 4).map((story, i) => (
                <StoryCard story={story} featured={i === 0} key={story.id} />
              ))}
            </ArticleGrid>
          </section>

          <section className="story-section">
            <header className="section-heading">
              <div>
                <span className="section-note">Across the developer world</span>
                <h2>More from today</h2>
              </div>
              <Link href="/search">Explore the archive →</Link>
            </header>
            <ArticleGrid>
              {rest.slice(4).map(story => (
                <StoryCard story={story} key={story.id} />
              ))}
            </ArticleGrid>
          </section>
        </div>
        <DeveloperPulse snapshotAt={pulse.snapshotAt} items={pulse.items} />
      </div>
    </main>
  );
}
