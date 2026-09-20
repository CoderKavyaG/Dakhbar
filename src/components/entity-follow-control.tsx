import Link from 'next/link';
import { topicPath } from '@/lib/topic-slug';
import { FollowToggle } from './follow-toggle';

type Entity = { id: string; name: string };

export function EntityFollowControl({ entity, returnTo }: { entity: Entity; returnTo: string }) {
  return <span className="entity-follow-control">
    <Link href={topicPath(entity)}>{entity.name}</Link>
    <FollowToggle entityIds={[entity.id]} entityName={entity.name} returnTo={returnTo} compact/>
  </span>;
}
