export const FREE_FOLLOW_LIMIT = 5;

type SubscriptionStatus = 'free' | 'active' | 'canceled' | 'past_due';

type FollowDecisionInput = {
  currentEntityIds: readonly string[];
  requestedEntityIds: readonly string[];
  intent: 'toggle' | 'follow';
  subscriptionStatus: SubscriptionStatus;
};

export type FollowDecision = {
  kind: 'follow' | 'unfollow' | 'noop' | 'upgrade';
  entityIds: string[];
  currentCount: number;
  projectedCount: number;
};

export function decideFollowChange(input: FollowDecisionInput): FollowDecision {
  const requested = [...new Set(input.requestedEntityIds.filter(Boolean))];
  const current = new Set(input.currentEntityIds);
  const allFollowed = requested.length > 0 && requested.every(id => current.has(id));
  if (!requested.length) return { kind: 'noop', entityIds: requested, currentCount: current.size, projectedCount: current.size };
  if (allFollowed && input.intent === 'toggle') {
    return { kind: 'unfollow', entityIds: requested, currentCount: current.size, projectedCount: current.size - requested.length };
  }
  if (allFollowed) return { kind: 'noop', entityIds: requested, currentCount: current.size, projectedCount: current.size };
  const missing = requested.filter(id => !current.has(id));
  const projectedCount = current.size + missing.length;
  if (input.subscriptionStatus !== 'active' && projectedCount > FREE_FOLLOW_LIMIT) {
    return { kind: 'upgrade', entityIds: requested, currentCount: current.size, projectedCount };
  }
  return { kind: 'follow', entityIds: requested, currentCount: current.size, projectedCount };
}
