import { auth, currentUser } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { decideAdminAccess } from './admin-access';

export async function requireAdmin() {
  const session = await auth();
  if (!session.userId) return session.redirectToSignIn();
  const user = await currentUser();
  const decision = decideAdminAccess(session.userId, user, {
    email: process.env.ADMIN_EMAIL,
    userId: process.env.ADMIN_USER_ID,
  });
  if (decision === 'deny') redirect('/?access=denied');
  return user;
}
