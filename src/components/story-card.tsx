import Link from 'next/link';
import { Badge } from './ui/badge';
import { StoryImage } from '@/components/story-image';
import { publisherDomain, countIndependentSources, storyDek, storyDestination } from '@/lib/story-evidence';

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

export function StoryCard({ story, featured = false }: { story: StoryCardData; featured?: boolean }) {
  const primary = story.documents[0].raw_document;
  const documents = story.documents.map(item => item.raw_document);
  const evidence = documents.find(document => document.og_description) ?? primary;
  const image = documents.find(document => document.og_image_url)?.og_image_url;
  const dek = storyDek(evidence);
  const sources = countIndependentSources(documents);
  const destination = storyDestination(story.id, documents);
  const titleLink = destination.external
    ? <a href={destination.href} target="_blank" rel="noopener noreferrer">{story.title}<span className="sr-only"> (opens original source)</span></a>
    : <Link href={destination.href}>{story.title}</Link>;
  return <article className={featured ? 'story-card story-card-featured' : 'story-card'}>
    <StoryImage src={image} alt="" className="story-card-image" />
    <div className="story-card-body">
      <div className="story-card-meta">
        {story.entities[0] && <Link href={'/search?q=' + encodeURIComponent(story.entities[0].entity.name)}>{story.entities[0].entity.name}</Link>}
        <time className="data-type" dateTime={story.updated_at.toISOString()}>{relativeAge(story.updated_at)}</time>
      </div>
      <h3>{titleLink}</h3>
      <p className={dek.kind === 'domain' ? 'domain-dek' : 'story-dek'}>{dek.kind === 'domain' ? 'via ' : ''}{dek.text}</p>
      {dek.kind!=='domain'&&<p className="card-source">From {publisherDomain(evidence.url)}</p>}
      <div className="story-card-footer">
        <div className="story-tags">{story.entities.slice(1, 3).map(item => <Link key={item.entity_id} href={'/search?q=' + encodeURIComponent(item.entity.name)}>{item.entity.name}</Link>)}</div>
        {sources >= 2 && <Badge>{sources} sources</Badge>}
      </div>
    </div>
  </article>;
}
