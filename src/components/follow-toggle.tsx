import { FollowToggleClient } from './follow-toggle-client';

type Props = {
  entityIds: string[];
  entityName?: string;
  returnTo: string;
  followLabel?: string;
  followingLabel?: string;
  variant?: 'default' | 'outline';
  compact?: boolean;
};

export function FollowToggle({
  entityIds,
  entityName,
  returnTo,
  followLabel,
  followingLabel,
  variant = 'default',
  compact = false,
}: Props) {
  if (!entityIds.length) return null;
  const defaultFollow = entityIds.length === 1 ? 'Follow topic' : 'Follow ' + entityIds.length + ' topics';
  const defaultFollowing = entityIds.length === 1 ? 'Following' : 'Following ' + entityIds.length + ' topics';
  return <FollowToggleClient entityIds={entityIds} entityName={entityName} returnTo={returnTo} followLabel={followLabel ?? defaultFollow} followingLabel={followingLabel ?? defaultFollowing} variant={variant} compact={compact}/>;
}
