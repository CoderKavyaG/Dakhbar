'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  Sparkles,
  Newspaper,
  ShieldCheck,
  Check,
  Plus,
  ArrowRight,
  Flame,
  Layers,
} from 'lucide-react';
import { BrandMark } from './brand-mark';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { useFollowing } from './following-provider';
import { toggleFollowingAction } from '@/app/actions/follow';
import { useToast } from './ui/toast';

type TopicEntity = {
  id: string;
  name: string;
  type: string;
  _count: { stories: number };
};

interface WelcomeOnboardingModalProps {
  userId: string;
  initialFollowedIds: string[];
  popularEntities: TopicEntity[];
}

export function WelcomeOnboardingModal({
  userId,
  initialFollowedIds,
  popularEntities,
}: WelcomeOnboardingModalProps) {
  const router = useRouter();
  const { toast } = useToast();
  const { follow } = useFollowing();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => new Set(initialFollowedIds));
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!userId) return;
    const dismissedKey = `dakhbar_welcome_completed_${userId}`;
    const isDismissed = window.localStorage.getItem(dismissedKey) === 'true';

    // Open modal if user has fewer than 2 followed topics or hasn't finished welcome onboarding
    if (initialFollowedIds.length < 2 || !isDismissed) {
      setIsOpen(true);
    }
  }, [userId, initialFollowedIds.length]);

  if (!isOpen) return null;

  const count = selectedIds.size;
  const isReady = count >= 2;

  const toggleTopic = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleComplete = () => {
    if (!isReady || isPending) return;

    startTransition(async () => {
      const idsToFollow = Array.from(selectedIds);
      if (idsToFollow.length > 0) {
        const formData = new FormData();
        idsToFollow.forEach(id => formData.append('entity_id', id));
        formData.set('return_to', '/?tab=following');
        formData.set('intent', 'follow');
        await toggleFollowingAction(formData);
        follow(idsToFollow);
      }

      window.localStorage.setItem(`dakhbar_welcome_completed_${userId}`, 'true');
      toast({
        message: `Welcome to Dअख़बार! Now tracking ${idsToFollow.length} topics.`,
        type: 'success',
      });

      setIsOpen(false);
      router.push('/?tab=following');
      router.refresh();
    });
  };

  return (
    <div
      className="welcome-modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="welcome-modal-title"
    >
      <div className="welcome-modal-card">
        {/* Header with Mascot and Welcome Banner */}
        <div className="welcome-modal-header">
          <div className="welcome-mascot-row">
            <BrandMark size={44} priority />
            <div className="welcome-badge-wrap">
              <Badge className="welcome-status-badge">Member Unlocked</Badge>
            </div>
          </div>
          <h2 id="welcome-modal-title" className="welcome-title">
            Welcome to Dअख़बार
          </h2>
          <p className="welcome-subtitle">
            Your evidence-first developer newspaper is ready. Here is what your account unlocks:
          </p>
        </div>

        {/* Perks Grid */}
        <div className="welcome-perks-grid">
          <div className="welcome-perk-card">
            <div className="perk-icon-wrap">
              <Newspaper size={18} />
            </div>
            <div>
              <h4 className="perk-title">Personal Edition</h4>
              <p className="perk-desc">
                Curated daily stream filtered precisely to the frameworks and tools you follow.
              </p>
            </div>
          </div>

          <div className="welcome-perk-card">
            <div className="perk-icon-wrap">
              <Sparkles size={18} />
            </div>
            <div>
              <h4 className="perk-title">Mascot Story Intelligence</h4>
              <p className="perk-desc">
                Source-grounded Q&A on every cluster, citing primary commits and posts.
              </p>
            </div>
          </div>

          <div className="welcome-perk-card">
            <div className="perk-icon-wrap">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h4 className="perk-title">Corroborated Facts</h4>
              <p className="perk-desc">
                Deduplicated coverage across GitHub, Hacker News, Dev.to, and frontier releases.
              </p>
            </div>
          </div>
        </div>

        {/* Required Step: Select at least 2 topics */}
        <div className="welcome-topics-section">
          <div className="welcome-topics-header">
            <div>
              <span className="section-note">Required Step</span>
              <h3 className="welcome-section-heading">Curate Your First Dispatch</h3>
            </div>
            <div className="welcome-progress-indicator">
              <span className={`progress-badge ${isReady ? 'ready' : 'needed'}`}>
                {isReady ? (
                  <>
                    <Check size={13} className="inline-icon" /> Ready to stream ({count} selected)
                  </>
                ) : (
                  <>Select at least 2 topics ({count}/2 selected)</>
                )}
              </span>
            </div>
          </div>

          <p className="welcome-instruction">
            Choose at least 2 topics you rely on so your Following feed is always populated with verified developer stories:
          </p>

          <div className="welcome-topic-chips-grid">
            {popularEntities.slice(0, 16).map(entity => {
              const isSelected = selectedIds.has(entity.id);
              return (
                <button
                  key={entity.id}
                  type="button"
                  onClick={() => toggleTopic(entity.id)}
                  className={`welcome-topic-chip ${isSelected ? 'selected' : ''}`}
                  aria-pressed={isSelected}
                >
                  <span className="chip-indicator">
                    {isSelected ? <Check size={12} /> : <Plus size={12} />}
                  </span>
                  <span className="chip-name">{entity.name}</span>
                  <span className="chip-count">{entity._count.stories}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="welcome-modal-footer">
          <div className="footer-status-text">
            {!isReady ? (
              <span className="text-warning">
                Follow {2 - count} more topic{2 - count === 1 ? '' : 's'} to activate your personalized stream.
              </span>
            ) : (
              <span className="text-success">
                ✓ Ready! Your feed will include stories from {count} topics.
              </span>
            )}
          </div>

          <Button
            type="button"
            onClick={handleComplete}
            disabled={!isReady || isPending}
            className={`welcome-submit-btn ${isReady ? 'ready-pulse' : ''}`}
          >
            {isPending ? (
              'Curating your feed...'
            ) : isReady ? (
              <>
                Enter Your Personal Dispatch <ArrowRight size={15} className="inline-icon" />
              </>
            ) : (
              `Follow at least 2 topics (${count}/2)`
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
