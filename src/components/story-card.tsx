import Link from 'next/link';
import { countIndependentSources, storyDek } from '@/lib/story-evidence';

type StoryCardData = {
  id: string;
  title: string;
  updated_at: Date;
  entities: { entity_id: string; entity: { name: string } }[];
  documents: { raw_document: { url: string; content: string | null } }[];
};

function relativeAge(date: Date) {
  const hours = Math.max(0, Math.floor((Date.now() - date.getTime()) / 3600000));
  if (hours < 1) return 'just now';
  if (hours < 24) return hours + 'h ago';
  return Math.floor(hours / 24) + 'd ago';
}

export function StoryCard({ story, featured = false }: { story: StoryCardData; featured?: boolean }) {
  const dek = storyDek(story.documents[0].raw_document);
  const sources = countIndependentSources(story.documents.map(item => item.raw_document));
  return <article className={featured ? 'story-card story-card-featured' : 'story-card'}>
    <div className="story-card-meta">
      {story.entities[0] && <Link href={'/search?q=' + encodeURIComponent(story.entities[0].entity.name)}>{story.entities[0].entity.name}</Link>}
      <time className="data-type" dateTime={story.updated_at.toISOString()}>{relativeAge(story.updated_at)}</time>
    </div>
    <h3><Link href={'/stories/' + story.id}>{story.title}</Link></h3>
    <p className={dek.kind === 'domain' ? 'domain-dek' : 'story-dek'}>{dek.kind === 'domain' ? 'via ' : ''}{dek.text}</p>
    <div className="story-card-footer">
      <div className="story-tags">{story.entities.slice(1, 3).map(item => <Link key={item.entity_id} href={'/search?q=' + encodeURIComponent(item.entity.name)}>{item.entity.name}</Link>)}</div>
      {sources >= 2 && <span className="source-count data-type">{sources} sources</span>}
    </div>
  </article>;
}
