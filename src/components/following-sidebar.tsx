import React from 'react';
import Link from 'next/link';
import {
  TabloidRadio as Radio,
  TabloidFlame as Flame,
  TabloidSparkles as Sparkles,
  TabloidArrowRight as ArrowRight,
  TabloidTrendUp as TrendingUp,
} from '@/components/pop-tabloid-icons';
import { EntityFollowControl } from './entity-follow-control';
import { AdPlacement } from './ad-placement';
import { Badge } from './ui/badge';

interface FollowingSidebarProps {
  leadStory?: {
    id: string;
    title: string;
    dek?: string;
  } | null;
  suggestedEntities: Array<{
    id: string;
    name: string;
    type: string;
    _count?: { stories: number };
  }>;
  trendingTopics: Array<{
    entityId: string;
    name: string;
    mentionCount: number;
    velocity: number;
  }>;
}

export function FollowingSidebar({
  leadStory,
  suggestedEntities,
  trendingTopics,
}: FollowingSidebarProps) {
  return (
    <aside className="following-sidebar" aria-label="Personal feed intelligence and suggestions">
      {/* 1. Live Breaking Headline Alert from Today's Edition */}
      {leadStory && (
        <div className="sidebar-widget breaking-wire-widget">
          <div className="breaking-wire-header">
            <span className="live-pulsing-dot" aria-hidden="true" />
            <span className="live-wire-tag">Live in Today&apos;s Edition</span>
          </div>
          <h4 className="breaking-wire-title">
            <Link href={`/stories/${leadStory.id}`}>{leadStory.title}</Link>
          </h4>
          {leadStory.dek && <p className="breaking-wire-dek">{leadStory.dek}</p>}
          <div className="breaking-wire-action">
            <Link href="/" className="breaking-wire-link">
              Jump to Front Page <ArrowRight size={12} className="inline-icon" />
            </Link>
          </div>
        </div>
      )}

      {/* 2. Twitter-Style "Topics to Follow" */}
      {suggestedEntities.length > 0 && (
        <div className="sidebar-widget who-to-follow-widget">
          <div className="widget-header">
            <div className="widget-title-group">
              <Sparkles size={14} className="text-data inline-icon" />
              <h4>Topics to Follow</h4>
            </div>
            <Link href="/topics" className="widget-view-all">All</Link>
          </div>
          <p className="widget-subtitle">Expand your personalized coverage stack</p>

          <div className="who-to-follow-list">
            {suggestedEntities.slice(0, 5).map(entity => (
              <div key={entity.id} className="who-to-follow-row">
                <div className="entity-info-col">
                  <span className="entity-suggest-name">{entity.name}</span>
                  {entity._count && (
                    <span className="entity-suggest-meta">
                      {entity._count.stories} {entity._count.stories === 1 ? 'story' : 'stories'}
                    </span>
                  )}
                </div>
                <EntityFollowControl
                  entity={{ id: entity.id, name: entity.name }}
                  returnTo="/?tab=following"
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. Developer Pulse Trending Momentum */}
      {trendingTopics.length > 0 && (
        <div className="sidebar-widget trending-pulse-widget">
          <div className="widget-header">
            <div className="widget-title-group">
              <TrendingUp size={14} className="text-data inline-icon" />
              <h4>Trending Buzz</h4>
            </div>
            <Link href="/topics" className="widget-view-all">All topics ↗</Link>
          </div>

          <div className="trending-pulse-list">
            {trendingTopics.slice(0, 4).map(topic => (
              <Link
                key={topic.entityId}
                href={`/search?q=${encodeURIComponent(topic.name)}`}
                className="trending-pulse-row"
              >
                <div className="trending-topic-info">
                  <span className="trending-topic-name">{topic.name}</span>
                  <span className="trending-topic-count">{topic.mentionCount} mentions</span>
                </div>
                <Badge className={topic.velocity >= 0 ? 'badge-velocity-pos' : 'badge-velocity-neg'}>
                  {topic.velocity > 0 ? `+${topic.velocity}%` : `${topic.velocity}%`}
                </Badge>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 4. Google Ads / Sponsor Placement Slot */}
      <AdPlacement slot="sidebar" />
    </aside>
  );
}
