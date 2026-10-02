'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { TabloidNewspaper, TabloidX } from './pop-tabloid-icons';

interface FollowingNotificationProps {
  hasFollowedTopics: boolean;
  topicCount?: number;
}

export function FollowingNotification({
  hasFollowedTopics,
  topicCount = 0,
}: FollowingNotificationProps) {
  const [dismissed, setDismissed] = useState<boolean>(true); // start hidden to avoid layout shift before checking storage

  useEffect(() => {
    try {
      const todayKey = `dakhbar_following_dismissed_${new Date().toISOString().slice(0, 10)}`;
      const isDismissed = sessionStorage.getItem(todayKey) === 'true';
      setDismissed(isDismissed);
    } catch {
      setDismissed(false);
    }
  }, []);

  const handleDismiss = () => {
    try {
      const todayKey = `dakhbar_following_dismissed_${new Date().toISOString().slice(0, 10)}`;
      sessionStorage.setItem(todayKey, 'true');
    } catch {
      // storage unavailable
    }
    setDismissed(true);
  };

  if (dismissed) {
    return null;
  }

  return (
    <div
      className="following-notification-banner"
      role="region"
      aria-label="Following updates notification"
    >
      <div className="following-notification-content">
        <div className="following-notification-badge">
          <TabloidNewspaper size={14} />
          <span>EDITION DISPATCH</span>
        </div>

        <div className="following-notification-body">
          <p className="following-notification-title">
            {hasFollowedTopics
              ? "You're all caught up! No new dispatches across your followed topics today."
              : 'Your personalized following feed is ready to be curated.'}
          </p>
          <p className="following-notification-dek">
            {hasFollowedTopics
              ? `We checked all ${topicCount > 0 ? topicCount : ''} followed topics against today's wire. Check out the top newsroom dispatches below or explore trending tech.`
              : 'Follow languages, frameworks, or AI labs to receive custom multi-source coverage.'}
          </p>
        </div>

        <div className="following-notification-actions">
          <Link href="/?tab=today" className="following-notification-btn primary">
            Read Today&apos;s Edition
          </Link>
          <Link href="/topics" className="following-notification-btn outline">
            Explore Topics
          </Link>
        </div>
      </div>

      <button
        type="button"
        onClick={handleDismiss}
        className="following-notification-close"
        aria-label="Dismiss notification"
        title="Dismiss this notification"
      >
        <TabloidX size={16} />
        <span className="close-text">Dismiss</span>
      </button>
    </div>
  );
}
