import Link from 'next/link';
import { FollowToggle } from './follow-toggle';
import { Badge } from './ui/badge';
import { topicPath } from '@/lib/topic-slug';

type Topic = { id: string; name: string; type: string };

export function TopicSummary({ entity, storyCount, returnTo }: { entity: Topic; storyCount: number; returnTo: string }) {
  const path = topicPath(entity);
  return <article className="topic-summary">
    <div>
      <Link href={path} className="topic-summary-name">{entity.name}</Link>
      <Badge>{entity.type}</Badge>
      <p>{storyCount} {storyCount === 1 ? 'story' : 'stories'} in this topic</p>
    </div>
    <FollowToggle entityIds={[entity.id]} returnTo={returnTo}/>
  </article>;
}
