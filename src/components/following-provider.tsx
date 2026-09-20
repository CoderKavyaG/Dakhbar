'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

type FollowingState = {
  followsAll(entityIds: readonly string[]): boolean;
  follow(entityIds: readonly string[]): void;
  unfollow(entityIds: readonly string[]): void;
};

const FollowingContext = createContext<FollowingState | null>(null);

export function FollowingProvider({ initialEntityIds, children }: { initialEntityIds: string[]; children: React.ReactNode }) {
  const initialKey = initialEntityIds.join('|');
  const stableInitialIds = useMemo(() => initialKey ? initialKey.split('|') : [], [initialKey]);
  const [followed, setFollowed] = useState(() => new Set(stableInitialIds));
  useEffect(() => setFollowed(new Set(stableInitialIds)), [stableInitialIds]);
  const follow = useCallback((entityIds: readonly string[]) => setFollowed(current => {
    const next = new Set(current);
    entityIds.forEach(id => next.add(id));
    return next;
  }), []);
  const unfollow = useCallback((entityIds: readonly string[]) => setFollowed(current => {
    const next = new Set(current);
    entityIds.forEach(id => next.delete(id));
    return next;
  }), []);
  const value = useMemo(() => ({
    followsAll: (entityIds: readonly string[]) => entityIds.length > 0 && entityIds.every(id => followed.has(id)),
    follow,
    unfollow,
  }), [followed, follow, unfollow]);
  return <FollowingContext.Provider value={value}>{children}</FollowingContext.Provider>;
}

export function useFollowing() {
  const value = useContext(FollowingContext);
  if (!value) throw new Error('useFollowing must be used within FollowingProvider');
  return value;
}
