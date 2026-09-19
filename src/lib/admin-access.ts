type Identity = {
  id: string;
  emailAddresses: { emailAddress: string; verification: { status: string } | null }[];
};
export function isAdmin(user: Identity | null, allowlist: { userId?: string; email?: string }): boolean {
  if (!user) return false;
  const userId = allowlist.userId?.trim();
  if (userId) return user.id === userId;
  const email = allowlist.email?.trim().toLowerCase();
  return Boolean(email && user.emailAddresses.some(address =>
    address.verification?.status === 'verified' && address.emailAddress.toLowerCase() === email));
}
