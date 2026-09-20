'use client';

import { useCallback, useEffect, useRef, useState, useTransition } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { Check, Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { toggleFollowingAction } from '@/app/actions/follow';
import { useFollowing } from './following-provider';
import { Button } from './ui/button';

const PENDING_FOLLOW_KEY = 'dakhbar:pending-follow';

type Props = {
  entityIds: string[];
  entityName?: string;
  returnTo: string;
  followLabel: string;
  followingLabel: string;
  variant: 'default' | 'outline';
  compact?: boolean;
};

export function FollowToggleClient({ entityIds, entityName, returnTo, followLabel, followingLabel, variant, compact = false }: Props) {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const router = useRouter();
  const { followsAll, follow, unfollow } = useFollowing();
  const following = followsAll(entityIds);
  const intentKey = JSON.stringify({ entityIds: [...entityIds].sort(), returnTo });
  const [awaitingSignIn, setAwaitingSignIn] = useState(false);
  const [, startTransition] = useTransition();
  const signedInRef = useRef(Boolean(isSignedIn));
  useEffect(() => { signedInRef.current = Boolean(isSignedIn); }, [isSignedIn]);

  const submit = useCallback((intent: 'toggle' | 'follow') => {
    startTransition(async () => {
      const formData = new FormData();
      entityIds.forEach(id => formData.append('entity_id', id));
      formData.set('return_to', returnTo);
      formData.set('intent', intent);
      const result = await toggleFollowingAction(formData);
      if (result.following) follow(result.entityIds);
      else unfollow(result.entityIds);
      router.refresh();
    });
  }, [entityIds, returnTo, follow, unfollow, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    const storedIntent = window.sessionStorage.getItem(PENDING_FOLLOW_KEY);
    if (!awaitingSignIn && storedIntent !== intentKey) return;
    window.sessionStorage.removeItem(PENDING_FOLLOW_KEY);
    setAwaitingSignIn(false);
    submit('follow');
  }, [isSignedIn, awaitingSignIn, intentKey, submit]);

  const openSignIn = () => {
    window.sessionStorage.setItem(PENDING_FOLLOW_KEY, intentKey);
    setAwaitingSignIn(true);
    clerk.openSignIn({});
    let sawModal = false;
    const observer = new MutationObserver(() => {
      const modalOpen = Boolean(document.querySelector('.cl-modalBackdrop,.cl-modalContent,[data-clerk-modal]'));
      if (modalOpen) sawModal = true;
      if (sawModal && !modalOpen) {
        observer.disconnect();
        window.setTimeout(() => {
          if (signedInRef.current) return;
          setAwaitingSignIn(false);
          if (window.sessionStorage.getItem(PENDING_FOLLOW_KEY) === intentKey) {
            window.sessionStorage.removeItem(PENDING_FOLLOW_KEY);
          }
        }, 1000);
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    window.setTimeout(() => observer.disconnect(), 120000);
  };

  const activate = () => isSignedIn ? submit('toggle') : openSignIn();
  const accessibleLabel = (following ? 'Unfollow ' : 'Follow ') + (entityName ?? (entityIds.length === 1 ? 'topic' : 'story topics'));
  return <Button type="button" size={compact ? 'icon' : 'default'} variant={following ? 'outline' : variant} className={compact ? 'entity-follow-button' : undefined} aria-label={accessibleLabel} aria-pressed={following} onClick={activate}>
    {following ? <Check size={compact ? 13 : 16}/> : <Plus size={compact ? 13 : 16}/>}
    {compact ? <span className="sr-only">{accessibleLabel}</span> : (following ? followingLabel : followLabel)}
  </Button>;
}
