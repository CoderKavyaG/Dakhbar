export type Identity = {
  id: string;
  emailAddresses: { emailAddress: string; verification: { status: string } | null }[];
};

export type AdminAccessDecision = 'allow' | 'sign-in' | 'deny';

export function isAdmin(user: Identity | null, allowlist: { userId?: string; email?: string }): boolean {
  if (!user) return false;
  const userId = allowlist.userId?.trim();
  if (userId) return user.id === userId;
  const email = allowlist.email?.trim().toLowerCase();
  return Boolean(email && user.emailAddresses.some(address =>
    address.verification?.status === 'verified' && address.emailAddress.toLowerCase() === email));
}

export function decideAdminAccess(
  sessionUserId: string | null,
  user: Identity | null,
  allowlist: { userId?: string; email?: string },
): AdminAccessDecision {
  if (!sessionUserId) return 'sign-in';
  return isAdmin(user, allowlist) ? 'allow' : 'deny';
}

export function adminRouteStatus(decision: AdminAccessDecision): 200 | 307 {
  return decision === 'allow' ? 200 : 307;
}
