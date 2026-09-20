import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { db } from './db';

export async function requireReader() {
  const session = await auth();
  if (!session.userId) redirect('/sign-in');
  await db.user.upsert({
    where: { id: session.userId },
    update: {},
    create: { id: session.userId },
  });
  return session.userId;
}
