import Link from 'next/link';
import { auth } from '@clerk/nextjs/server';
import { Check, Plus } from 'lucide-react';
import { toggleFollowingAction } from '@/app/actions/follow';
import { db } from '@/lib/db';
import { followsAll } from '@/lib/follow-service';
import { Button } from './ui/button';

type Props = {
  entityIds: string[];
  returnTo: string;
  followLabel?: string;
  followingLabel?: string;
  variant?: 'default' | 'outline';
};

export async function FollowToggle({
  entityIds,
  returnTo,
  followLabel,
  followingLabel,
  variant = 'default',
}: Props) {
  if (!entityIds.length) return null;
  const { userId } = await auth();
  const defaultFollow = entityIds.length === 1 ? 'Follow topic' : 'Follow ' + entityIds.length + ' topics';
  const defaultFollowing = entityIds.length === 1 ? 'Following' : 'Following ' + entityIds.length + ' topics';
  if (!userId) {
    const signIn = '/sign-in?redirect_url=' + encodeURIComponent(returnTo);
    return <Button asChild variant={variant}><Link href={signIn}><Plus size={16}/>{followLabel ?? defaultFollow}</Link></Button>;
  }
  const rows = await db.following.findMany({
    where: { user_id: userId, entity_id: { in: entityIds } },
    select: { entity_id: true },
  });
  const following = followsAll(rows.map(row => row.entity_id), entityIds);
  return <form action={toggleFollowingAction} className="follow-form">
    {entityIds.map(id => <input key={id} type="hidden" name="entity_id" value={id}/>)}
    <input type="hidden" name="return_to" value={returnTo}/>
    <Button type="submit" variant={following ? 'outline' : variant} aria-pressed={following}>
      {following ? <Check size={16}/> : <Plus size={16}/>}{following ? (followingLabel ?? defaultFollowing) : (followLabel ?? defaultFollow)}
    </Button>
  </form>;
}
