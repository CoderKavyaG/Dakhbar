import { auth, currentUser } from '@clerk/nextjs/server';
import { notFound } from 'next/navigation';
import { isAdmin } from './admin-access';

export async function requireAdmin() {
  const session = await auth();
  if (!session.userId) return session.redirectToSignIn();
  const user = await currentUser();
  if (!isAdmin(user, { email: process.env.ADMIN_EMAIL, userId: process.env.ADMIN_USER_ID })) notFound();
  return user;
}
