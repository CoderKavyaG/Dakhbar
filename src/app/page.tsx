import { ArticleGrid } from '@/components/article-grid';
import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { FreshEdition } from '@/components/fresh-edition';
import { EntityFollowControl } from '@/components/entity-follow-control';
import { FollowToggle } from '@/components/follow-toggle';
import { StoryCard } from '@/components/story-card';
import { TodayEdition } from '@/components/today-edition';
import { DeveloperPulse } from '@/components/developer-pulse';
import { FollowingEmpty } from '@/components/following-empty';
import { FollowingSidebar } from '@/components/following-sidebar';
import { AdPlacement } from '@/components/ad-placement';
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
import { getBrief, getForYouStories, getPopularEntities, getBriefNotificationCount, getFollowingEntityIds } from '@/lib/reader-data';
import { FollowingNotification } from '@/components/following-notification';
import { WelcomeOnboardingModal } from '@/components/welcome-onboarding-modal';
import { TabloidDispatchBanner } from '@/components/tabloid-dispatch-banner';
import { Sparkles } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function FrontPage({
  searchParams,
}: {
  searchParams?: Promise<{ tab?: string }>;
}) {
  const { tab } = (await searchParams) ?? {};
  const { userId } = await auth();
  const isFollowingTab = userId ? (tab !== 'today') : tab === 'following';

  // --- Anonymous Reader Following Tab ---
  if (isFollowingTab && !userId) {
    const popular = await getPopularEntities();
    return (
      <main className="paper-shell reader-page">
        <TabloidDispatchBanner
          label="FOLLOWING DISPATCH"
          subtext="CURATED WIRE • FOR YOUR TECH STACK"
          tag="PERSONAL WIRE"
        />
        <div className="front-tabs-container">
          <nav className="front-tabs" aria-label="Edition view">
            <Link href="/?tab=today" className="front-tab">Today</Link>
            <Link href="/?tab=following" className="front-tab active" aria-current="page">Following</Link>
          </nav>
        </div>
        <FollowingNotification hasFollowedTopics={false} />
        <FollowingEmpty entities={popular} />
      </main>
    );
  }

  // --- Following Tab for Signed-In Users ---
  if (userId && isFollowingTab) {
    const [brief, forYou, popular, subscription, briefCount, frontPageStories, pulse] = await Promise.all([
      getBrief(userId),
      getForYouStories(userId),
      getPopularEntities(),
      db.user.findUnique({ where: { id: userId }, select: { subscription_status: true } }),
      getBriefNotificationCount(userId),
      getFrontPageStories(48),
      getDeveloperPulse(6),
    ]);

    const generated = new Map<string, string>();
    if (subscription?.subscription_status === 'active' && brief.stories.length > 0) {
      const edition = await generateBriefEdition(brief.stories, userId);
      for (const [id, copy] of Object.entries(edition.copies)) {
        if (copy.generated) generated.set(id, copy.text);
      }
    }

    // If reader has zero followed entities, show the rich onboarding view with notification tip
    if (!brief.entityIds.length && !forYou.entityIds.length) {
      return (
        <main className="paper-shell reader-page">
          <TabloidDispatchBanner
            label="FOLLOWING DISPATCH"
            subtext="CURATED WIRE • FOR YOUR TECH STACK"
            tag="PERSONAL WIRE"
          />
          <div className="front-tabs-container">
            <nav className="front-tabs" aria-label="Edition view">
              <Link href="/?tab=today" className="front-tab">Today</Link>
              <Link href="/?tab=following" className="front-tab active" aria-current="page">Following</Link>
            </nav>
          </div>
          <FollowingNotification hasFollowedTopics={false} />
          <FollowingEmpty entities={popular} />
          <WelcomeOnboardingModal
            userId={userId}
            initialFollowedIds={brief.entityIds}
            popularEntities={popular}
          />
        </main>
      );
    }

    const storiesToRender = brief.stories.length > 0 ? brief.stories : forYou.stories;
    const [followedLead, ...followedRest] = storiesToRender;

    if (!followedLead) {
      const topLead = frontPageStories[0];
      const otherStories = frontPageStories.slice(1);
      return (
        <main className="paper-shell reader-page">
          <TabloidDispatchBanner
            label="FOLLOWING DISPATCH"
            subtext="CURATED WIRE • FOR YOUR TECH STACK"
            tag="PERSONAL WIRE"
          />
          <div className="front-tabs-container">
            <nav className="front-tabs" aria-label="Edition view">
              <Link href="/?tab=today" className="front-tab">Today</Link>
              <Link href="/?tab=following" className="front-tab active" aria-current="page">Following</Link>
            </nav>
          </div>

          <FollowingNotification
            hasFollowedTopics={true}
            topicCount={brief.entityIds.length || forYou.entityIds.length}
          />

          <div className="following-edition-grid">
            <div className="following-main-col">
              <div className="following-section-heading">
                <span className="section-note">Today&apos;s Dispatches</span>
                <h2>Wider Wire Coverage</h2>
                <p className="following-section-sub">
                  Your followed topics are all caught up. Here is what&apos;s leading tech news across the wire today.
                </p>
              </div>

              {topLead && (
                <div style={{ marginBottom: '2rem' }}>
                  <StoryCard
                    story={topLead}
                    featured={true}
                  />
                </div>
              )}

              <div className="following-feed">
                {otherStories.slice(0, 8).map(story => (
                  <StoryCard
                    key={story.id}
                    story={story}
                  />
                ))}
              </div>
            </div>

            <aside className="following-side-col">
              <FollowingSidebar
                leadStory={topLead ? { id: topLead.id, title: topLead.title, dek: storyDek(topLead.documents[0]?.raw_document, 160).text } : null}
                suggestedEntities={popular.filter(e => !new Set(brief.entityIds).has(e.id))}
                trendingTopics={(pulse.items || []).map(p => ({ entityId: p.entityId, name: p.name, mentionCount: p.mentionCount, velocity: p.velocity }))}
              />
            </aside>
          </div>

          <WelcomeOnboardingModal
            userId={userId}
            initialFollowedIds={brief.entityIds}
            popularEntities={popular}
          />
        </main>
      );
    }

    const date = new Intl.DateTimeFormat('en-IN', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'Asia/Kolkata',
    }).format(new Date());

    const topFrontLead = frontPageStories[0]
      ? {
          id: frontPageStories[0].id,
          title: frontPageStories[0].title,
          dek: storyDek(frontPageStories[0].documents[0]?.raw_document, 160).text,
        }
      : null;

    const followedSet = new Set([...brief.entityIds, ...forYou.entityIds]);
    const suggestedEntities = popular.filter(e => !followedSet.has(e.id));

    const leadDocs = followedLead.documents.map(m => m.raw_document);
    const destination = storyDestination(followedLead.id, leadDocs);
    const evidence = leadDocs.find(d => d.og_description) ?? leadDocs[0];
    const dek = generated.has(followedLead.id)
      ? { kind: 'self' as const, text: generated.get(followedLead.id)! }
      : storyDek(evidence, 360);
    const count = countIndependentSources(leadDocs);

    return (
      <main className="paper-shell">
        <BriefReadReceipt at={brief.visitedAt.toISOString()} />
        <WelcomeOnboardingModal
          userId={userId}
          initialFollowedIds={brief.entityIds}
          popularEntities={popular}
        />
        <TabloidDispatchBanner
          label="FOLLOWING DISPATCH"
          subtext="CURATED WIRE • FOR YOUR TECH STACK"
          tag="PERSONAL WIRE"
        />
        <div className="front-tabs-container">
          <nav className="front-tabs" aria-label="Edition view">
            <Link href="/?tab=today" className="front-tab">Today</Link>
            <Link href="/?tab=following" className="front-tab active" aria-current="page">
              Following
              {briefCount > 0 && <span className="front-tab-badge">{briefCount}</span>}
            </Link>
          </nav>
        </div>

        <FreshEdition />
        <div className="edition-intro">
          <div className="edition-intro-left">
            <span className="live-pulsing-dot" aria-hidden="true" />
            <div>
              <p>{date} — Followed Edition</p>
              <span className="edition-brief-summary">{briefSummary(brief.stories.length)}</span>
            </div>
          </div>
          <div className="edition-intro-badges">
            <Badge>{storiesToRender.length} followed {storiesToRender.length === 1 ? 'story' : 'stories'}</Badge>
            {brief.stories.length > 0 && (
              <Badge className="badge-new-arrivals">{brief.stories.length} new arrivals</Badge>
            )}
          </div>
        </div>

        <section className="lead-stage">
          <article className="lead-copy">
            <div className="lead-meta">
              {followedLead.entities.slice(0, 3).map(e => (
                <EntityFollowControl
                  key={e.entity_id}
                  entity={{ id: e.entity_id, name: e.entity.name }}
                  returnTo={topicPath(e.entity)}
                />
              ))}
              {brief.stories.some(s => s.id === followedLead.id) && (
                <span className="card-new-arrival-tag" title="New development since your last visit">
                  <Sparkles size={11} className="inline-icon" /> New since last visit
                </span>
              )}
            </div>
            <h1>
              <a href={destination.href}>{followedLead.title}</a>
            </h1>
            <p className="lead-dek">{dek.kind === 'domain' ? 'Reporting from ' : ''}{dek.text}</p>
            <div className="lead-actions">
              <FollowToggle
                entityIds={followedLead.entities.map(e => e.entity_id)}
                returnTo="/?tab=following"
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
            stories={storiesToRender.slice(0, 3).map(story => {
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
                  <span className="section-note">Personalized Stack</span>
                  <h2>Worth your attention</h2>
                </div>
                <span>{followedRest.slice(0, 4).length} stories to start with</span>
              </header>
              <ArticleGrid className="article-grid-top">
                {followedRest.slice(0, 4).map((story, i) => (
                  <StoryCard
                    key={story.id}
                    story={story}
                    featured={i === 0}
                    dekOverride={generated.get(story.id)}
                    isNewSinceVisit={brief.stories.some(s => s.id === story.id)}
                  />
                ))}
              </ArticleGrid>
            </section>

            {followedRest.length > 4 && (
              <section className="story-section">
                <header className="section-heading">
                  <div>
                    <span className="section-note">Across your followed topics</span>
                    <h2>More from your stack</h2>
                  </div>
                  <Link href="/topics">Explore all topics →</Link>
                </header>
                <ArticleGrid>
                  {followedRest.slice(4).map(story => (
                    <StoryCard
                      key={story.id}
                      story={story}
                      dekOverride={generated.get(story.id)}
                      isNewSinceVisit={brief.stories.some(s => s.id === story.id)}
                    />
                  ))}
                </ArticleGrid>
              </section>
            )}
          </div>

          <div className="front-sidebar-stack">
            <FollowingSidebar
              leadStory={topFrontLead}
              suggestedEntities={suggestedEntities}
              trendingTopics={pulse.items}
            />
          </div>
        </div>
      </main>
    );
  }

  // --- "Today" Front Page (Default & Anonymous) ---
  const [stories, pulse, briefCount, userFollowed, popular] = await Promise.all([
    getFrontPageStories(),
    getDeveloperPulse(),
    userId ? getBriefNotificationCount(userId) : Promise.resolve(0),
    userId ? getFollowingEntityIds(userId) : Promise.resolve([]),
    userId ? getPopularEntities() : Promise.resolve([]),
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
        <WelcomeOnboardingModal
          userId={userId}
          initialFollowedIds={userFollowed}
          popularEntities={popular}
        />
      )}
      <TabloidDispatchBanner
        label="FRONT PAGE DISPATCH"
        subtext="LIVE WIRE • 24H TECH INTELLIGENCE"
        tag="TODAY'S EDITION"
      />
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
      <FreshEdition />
      <div className="edition-intro">
        <div className="edition-intro-left">
          <span className="live-pulsing-dot" aria-hidden="true" />
          <p>{date}</p>
        </div>
        <div className="edition-intro-badges">
          <Badge>{stories.length} indexed stories</Badge>
          <Badge className="edition-live-badge">Live Edition</Badge>
        </div>
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

        <div className="front-sidebar-stack">
          <DeveloperPulse snapshotAt={pulse.snapshotAt} items={pulse.items} />
          <AdPlacement slot="sidebar" />
        </div>
      </div>
    </main>
  );
}
