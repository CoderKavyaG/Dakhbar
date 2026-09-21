import Link from 'next/link';
import { EntityFollowControl } from './entity-follow-control';
import { Badge } from './ui/badge';
import { StoryImage } from '@/components/story-image';
import { publisherDomain, countIndependentSources, storyDek, storyDestination } from '@/lib/story-evidence';
import { topicPath } from '@/lib/topic-slug';

type StoryCardData = {
  id: string;
  title: string;
  updated_at: Date;
  entities: { entity_id: string; entity: { name: string } }[];
  documents: { raw_document: { url: string; content: string | null; og_description: string | null; og_image_url: string | null } }[];
};

function relativeAge(date: Date) {
  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000));
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

export function StoryCard({ story, featured = false, dekOverride }: { story: StoryCardData; featured?: boolean; dekOverride?: string }) {
  const primary = story.documents[0].raw_document;
  const documents = story.documents.map(item => item.raw_document);
  const evidence = documents.find(document => document.og_description) ?? primary;
  const image = documents.find(document => document.og_image_url)?.og_image_url;
  const dek = dekOverride ? { kind: 'excerpt' as const, text: dekOverride } : storyDek(evidence);
  const sources = countIndependentSources(documents);
  const destination = storyDestination(story.id, documents);
  const titleLink = destination.external
    ? <a href={destination.href} target="_blank" rel="noopener noreferrer">{story.title}<span className="sr-only"> (opens original source)</span></a>
    : <Link href={destination.href}>{story.title}</Link>;
  return <article className={featured ? 'story-card story-card-featured' : 'story-card'}>
    <StoryImage src={image} alt="" className="story-card-image" />
    <div className="story-card-body">
      <div className="story-card-meta">
        {story.entities[0] && <EntityFollowControl entity={{id:story.entities[0].entity_id,name:story.entities[0].entity.name}} returnTo={topicPath(story.entities[0].entity)}/>}
        <time className="data-type" dateTime={story.updated_at.toISOString()}>{relativeAge(story.updated_at)}</time>
      </div>
      <h3>{titleLink}</h3>
      <p className={dekOverride ? 'story-dek generated-dek' : dek.kind === 'domain' ? 'domain-dek' : 'story-dek'}>{dek.kind === 'domain' ? 'via ' : ''}{dek.text}</p>
      {dek.kind!=='domain'&&<p className="card-source">From {publisherDomain(evidence.url)}</p>}
      <div className="story-card-footer">
        <div className="story-tags">{story.entities.slice(1).map(item => <EntityFollowControl key={item.entity_id} entity={{id:item.entity_id,name:item.entity.name}} returnTo={topicPath(item.entity)}/>)}</div>
        {sources >= 2 && <Badge>{sources} sources</Badge>}
      </div>
    </div>
  </article>;
}
