import React from 'react';
import Link from 'next/link';
import { SaveStory } from './save-story';
import { EntityFollowControl } from './entity-follow-control';
import { Badge } from './ui/badge';
import { StoryImage } from '@/components/story-image';
import { publisherDomain, countIndependentSources, storyDek, storyDestination } from '@/lib/story-evidence';
import { topicPath } from '@/lib/topic-slug';
import { ShieldCheck, CheckCircle2, FileText, Sparkles } from 'lucide-react';

type StoryCardData = {
  id: string;
  title: string;
  updated_at: Date;
  entities: { entity_id: string; entity: { name: string } }[];
  documents: { raw_document: { url: string; content: string | null; og_description: string | null; og_image_url: string | null } }[];
};

function relativeAge(date: Date) {
  const diffMs = Date.now() - date.getTime();
  const minutes = Math.max(1, Math.floor(diffMs / 60000));
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

export function StoryCard({
  story,
  featured = false,
  dekOverride,
  isNewSinceVisit = false,
}: {
  story: StoryCardData;
  featured?: boolean;
  dekOverride?: string;
  isNewSinceVisit?: boolean;
}) {
  const primary = story.documents[0].raw_document;
  const documents = story.documents.map(item => item.raw_document);
  const evidence = documents.find(document => document.og_description) ?? primary;
  const image = documents.find(document => document.og_image_url)?.og_image_url;
  const dek = dekOverride ? { kind: 'excerpt' as const, text: dekOverride } : storyDek(evidence, 260);
  const sources = countIndependentSources(documents);
  const reportsCount = new Set(documents.map(document => document.url)).size;
  const destination = storyDestination(story.id, documents);
  const isMultiSource = sources >= 2 || reportsCount >= 2;
  const isHighImpact = sources >= 3 || reportsCount >= 3;

  const cardClasses = [
    featured
      ? 'story-card story-card-featured'
      : isHighImpact
      ? 'story-card story-card-high-impact'
      : isMultiSource
      ? 'story-card story-card-corroborated'
      : 'story-card story-card-standard',
    !image ? 'story-card-text-only' : '',
    isNewSinceVisit ? 'story-card-new-arrival' : '',
  ].filter(Boolean).join(' ');

  const titleLink = destination.external
    ? <a href={destination.href} target="_blank" rel="noopener noreferrer">{story.title}<span className="sr-only"> (opens original source)</span></a>
    : <Link href={destination.href}>{story.title}</Link>;

  return (
    <article className={cardClasses}>
      {image && (
        <StoryImage
          src={image}
          alt=""
          className="story-card-image"
        />
      )}
      <div className="story-card-body">
        <div className="story-card-meta">
          <div className="story-card-meta-left">
            {story.entities[0] && (
              <EntityFollowControl
                entity={{ id: story.entities[0].entity_id, name: story.entities[0].entity.name }}
                returnTo={topicPath(story.entities[0].entity)}
              />
            )}
            <time className="data-type" dateTime={story.updated_at.toISOString()}>
              {Date.now() - story.updated_at.getTime() < 7200000 && (
                <span className="card-live-dot" aria-label="Recent update" />
              )}
              {relativeAge(story.updated_at)}
            </time>
          </div>
          <div className="story-card-meta-right">
            {isNewSinceVisit && (
              <span className="card-new-arrival-tag" title="New reporting ingested since your last visit">
                <Sparkles size={11} className="inline-icon" /> New
              </span>
            )}
            <span
              className={`card-evidence-pill ${isMultiSource ? 'corroborated' : 'primary'}`}
              title={isMultiSource ? `${sources} independent sources cross-verified on this story` : 'Single primary source report'}
            >
              <ShieldCheck size={11} className="inline-icon" />
              <span>{isMultiSource ? `${sources} sources verified` : 'Primary report'}</span>
            </span>
          </div>
        </div>

        <h3 className="story-card-title">{titleLink}</h3>

        {!image ? (
          <blockquote className="story-card-pullquote">
            <span className="pullquote-mark" aria-hidden="true">“</span>
            <p className="pullquote-text">{dek.text}</p>
            <footer className="pullquote-attribution">
              <cite>Reporting via {publisherDomain(evidence.url)}</cite>
            </footer>
          </blockquote>
        ) : (
          <>
            <p className={dekOverride ? 'story-dek generated-dek' : dek.kind === 'domain' ? 'story-dek domain-dek' : 'story-dek'}>
              {dek.kind === 'domain' ? 'via ' : ''}{dek.text}
            </p>
            {dek.kind !== 'domain' && <p className="card-source">From {publisherDomain(evidence.url)}</p>}
          </>
        )}

        <div className="story-card-footer">
          <div className="story-tags">
            {story.entities.slice(1).map(item => (
              <EntityFollowControl
                key={item.entity_id}
                entity={{ id: item.entity_id, name: item.entity.name }}
                returnTo={topicPath(item.entity)}
              />
            ))}
          </div>
          <Badge className={`badge-sources-count ${isMultiSource ? 'badge-corroborated' : 'badge-primary'}`}>
            {isMultiSource ? (
              <>
                <CheckCircle2 size={11} className="inline-icon" />
                <span>{sources >= 2 ? `${sources} verified sources` : `${reportsCount} reports`}</span>
              </>
            ) : (
              <>
                <FileText size={11} className="inline-icon" />
                <span>1 indexed source</span>
              </>
            )}
          </Badge>
        </div>
        <SaveStory id={story.id} />
      </div>
    </article>
  );
}

