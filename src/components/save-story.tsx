'use client';
import { useCallback, useEffect, useState, useTransition } from 'react';
import { useAuth, useClerk } from '@clerk/nextjs';
import { TabloidBookmark as Bookmark } from '@/components/pop-tabloid-icons';
import { setSavedStory } from '@/app/actions/saved';
import { useSavedStories } from './saved-stories-provider';
import { useToast } from './ui/toast';

import { Button } from './ui/button';

export function SaveStory({
  id,
  variant = 'default',
  className = '',
}: {
  id: string;
  variant?: 'default' | 'outline';
  className?: string;
}) {
  const { isSignedIn } = useAuth();
  const clerk = useClerk();
  const { toast } = useToast();
  const { stories, update } = useSavedStories();
  const saved = Boolean(stories[id]);
  const [pending, start] = useTransition();
  const [intent, setIntent] = useState<'save' | 'remove' | null>(null);
  const [error, setError] = useState('');

  const submit = useCallback((mode: 'save' | 'remove') => start(async () => {
    try {
      setError('');
      const result = await setSavedStory(id, mode);
      update(id, result.saved);
      toast({
        message: result.saved ? 'Story saved to bookmarks.' : 'Story removed from saved.',
        type: 'success',
      });
    } catch {
      setError('Could not save. Try again.');
      toast({
        message: 'Could not update reading list. Try again.',
        type: 'error',
      });
    }
  }), [id, update, toast]);

  useEffect(() => {
    if (isSignedIn && intent) {
      setIntent(null);
      submit(intent);
    }
  }, [isSignedIn, intent, submit]);

  const act = (mode: 'save' | 'remove') => {
    if (isSignedIn) {
      submit(mode);
    } else {
      setIntent(mode);
      clerk.openSignIn({ fallbackRedirectUrl: '/', signUpFallbackRedirectUrl: '/' });
    }
  };

  return (
    <div className={`save-story-controls ${variant === 'outline' ? 'save-controls-outline' : ''} ${className}`}>
      {variant === 'outline' ? (
        <Button
          type="button"
          variant="outline"
          disabled={pending}
          aria-pressed={saved}
          aria-label={saved ? 'Remove saved story' : 'Save story'}
          onClick={() => act(saved ? 'remove' : 'save')}
          className="save-story-btn"
        >
          <Bookmark size={15} fill={saved ? 'currentColor' : 'none'} className="inline-icon" />
          <span>{saved ? 'Saved' : 'Save'}</span>
        </Button>
      ) : (
        <button
          type="button"
          disabled={pending}
          aria-pressed={saved}
          aria-label={saved ? 'Remove saved story' : 'Save story'}
          onClick={() => act(saved ? 'remove' : 'save')}
        >
          <Bookmark size={14} fill={saved ? 'currentColor' : 'none'} />
          {saved ? 'Saved' : 'Save'}
        </button>
      )}
      {error && <span role="alert">{error}</span>}
    </div>
  );
}
