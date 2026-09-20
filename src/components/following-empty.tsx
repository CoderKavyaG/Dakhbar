import Link from 'next/link';
import { Compass } from 'lucide-react';
import { EntityFollowControl } from './entity-follow-control';
import { Button } from './ui/button';

type PopularEntity = { id: string; name: string; type: string; _count: { stories: number } };

export function FollowingEmpty({ entities }: { entities: PopularEntity[] }) {
  return <section className="following-empty">
    <div className="empty-icon"><Compass size={28}/></div>
    <p className="section-note">Your edition starts with a signal</p>
    <h2>Follow your first topic.</h2>
    <p>Choose the companies, tools, and technologies you want to keep close. Your Front Page will remain the same for everyone.</p>
    <div className="popular-topics">
      {entities.map(entity => <div key={entity.id} className="popular-topic-row">
        <EntityFollowControl entity={entity} returnTo="/for-you"/><small>{entity._count.stories} {entity._count.stories === 1 ? 'story' : 'stories'}</small>
      </div>)}
    </div>
    <Button asChild variant="outline"><Link href="/search">Find another topic →</Link></Button>
  </section>;
}
