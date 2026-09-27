'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useUser, useClerk } from '@clerk/nextjs';
import {
  Bookmark,
  Heart,
  Compass,
  LogOut,
  Sparkles,
  ChevronDown,
  User as UserIcon,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { JoinUsButton } from './join-us-button';

export function AccountMenu({
  signedIn = false,
  subscriptionStatus,
  savedCount = 0,
}: {
  signedIn?: boolean;
  subscriptionStatus?: 'active' | 'free' | 'past_due' | 'canceled' | null;
  savedCount?: number;
}) {
  const { user, isLoaded, isSignedIn } = useUser();
  const { signOut } = useClerk();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const isSubscriber = subscriptionStatus === 'active';
  const authenticated = signedIn || (isLoaded && isSignedIn);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  if (!authenticated) {
    return <JoinUsButton />;
  }

  const displayName = user?.fullName || user?.firstName || user?.username || 'Reader';
  const email = user?.primaryEmailAddress?.emailAddress || '';
  const initial = (displayName.charAt(0) || email.charAt(0) || 'R').toUpperCase();

  return (
    <div ref={containerRef} className="account-menu-container">
      {/* Avatar Button Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`account-avatar-btn ${isOpen ? 'active' : ''} ${isSubscriber ? 'is-subscriber' : ''}`}
        aria-expanded={isOpen}
        aria-haspopup="menu"
        aria-label={`Open account menu for ${displayName}`}
      >
        {user?.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={user.imageUrl}
            alt=""
            className="account-avatar-img"
          />
        ) : (
          <span className="account-avatar-initial">{initial}</span>
        )}
        {isSubscriber && (
          <span className="account-subscriber-dot" title="Desk Member" aria-label="Desk Member Active" />
        )}
        <ChevronDown size={13} className={`account-chevron ${isOpen ? 'rotated' : ''}`} aria-hidden="true" />
      </button>

      {/* Account Dropdown Menu */}
      {isOpen && (
        <div className="account-dropdown-card" role="menu" aria-label="User Account Menu">
          {/* User Profile & Membership Status Header */}
          <div className="account-dropdown-header">
            <div className="account-user-identity">
              <span className="account-user-name">{displayName}</span>
              {email && <span className="account-user-email">{email}</span>}
            </div>

            <div className="account-membership-banner">
              {isSubscriber ? (
                <div className="membership-status-box is-active-desk">
                  <div className="membership-badge-row">
                    <Badge className="badge-desk-active">
                      <Sparkles size={11} className="inline-icon" /> Desk Member
                    </Badge>
                    <span className="membership-price-tag">$5/mo</span>
                  </div>
                  <p className="membership-note">Full access to verified dossiers & unlimited topics.</p>
                  <Link
                    href="/pricing"
                    onClick={() => setIsOpen(false)}
                    className="membership-manage-link"
                  >
                    Manage subscription →
                  </Link>
                </div>
              ) : (
                <div className="membership-status-box is-free-reader">
                  <div className="membership-badge-row">
                    <Badge className="badge-free-reader">
                      <UserIcon size={11} className="inline-icon" /> Free Reader
                    </Badge>
                    <span className="membership-limit-tag">5 follows active</span>
                  </div>
                  <p className="membership-note">Follow up to 5 entities. Unlock custom dossiers with Desk.</p>
                  <Link
                    href="/pricing"
                    onClick={() => setIsOpen(false)}
                    className="membership-upgrade-btn"
                  >
                    <Sparkles size={12} className="inline-icon" /> Upgrade to Desk ($5/mo) →
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="account-dropdown-divider" />

          {/* Navigation Items (Saved, Following, Methodology) */}
          <div className="account-dropdown-links" role="group" aria-label="Personal Library & Links">
            <Link
              href="/saved"
              onClick={() => setIsOpen(false)}
              className="account-dropdown-item"
              role="menuitem"
            >
              <div className="dropdown-item-icon-wrap">
                <Bookmark size={15} />
              </div>
              <div className="dropdown-item-text">
                <div className="dropdown-item-title-row">
                  <span className="dropdown-item-title">Saved Clippings</span>
                  {savedCount > 0 && <span className="dropdown-item-count">{savedCount}</span>}
                </div>
                <span className="dropdown-item-sub">Stories bookmarked for later</span>
              </div>
            </Link>

            <Link
              href="/?tab=following"
              onClick={() => setIsOpen(false)}
              className="account-dropdown-item"
              role="menuitem"
            >
              <div className="dropdown-item-icon-wrap">
                <Heart size={15} />
              </div>
              <div className="dropdown-item-text">
                <span className="dropdown-item-title">Following Feed</span>
                <span className="dropdown-item-sub">Updates from followed topics</span>
              </div>
            </Link>

            <Link
              href="/methodology"
              onClick={() => setIsOpen(false)}
              className="account-dropdown-item"
              role="menuitem"
            >
              <div className="dropdown-item-icon-wrap">
                <Compass size={15} />
              </div>
              <div className="dropdown-item-text">
                <span className="dropdown-item-title">Methodology</span>
                <span className="dropdown-item-sub">How Dअख़बार verifies signals</span>
              </div>
            </Link>
          </div>

          <div className="account-dropdown-divider" />

          {/* Sign Out Action */}
          <div className="account-dropdown-footer">
            <button
              type="button"
              onClick={() => {
                setIsOpen(false);
                signOut({ redirectUrl: '/' });
              }}
              className="account-logout-button"
              role="menuitem"
            >
              <LogOut size={14} className="inline-icon" />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
