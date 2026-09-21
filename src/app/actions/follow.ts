'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { changeFollowingWithCap } from '@/lib/following-command';
import { requireReader } from '@/lib/reader-auth';

export async function toggleFollowingAction(formData: FormData) {
  const userId = await requireReader();
  const requested = formData.getAll('entity_id').filter((value): value is string => typeof value === 'string');
  const existing = await db.entity.findMany({ where: { id: { in: requested } }, select: { id: true } });
  const entityIds = existing.map(entity => entity.id);
  const intent = formData.get('intent') === 'follow' ? 'follow' : 'toggle';
  const result = await changeFollowingWithCap(userId, entityIds, intent);

  const requestedReturn = formData.get('return_to');
  const returnTo = typeof requestedReturn === 'string' && /^\/(?!\/)/.test(requestedReturn) ? requestedReturn : '/for-you';
  revalidatePath(returnTo);
  revalidatePath('/');
  revalidatePath('/search');
  revalidatePath('/for-you');
  revalidatePath('/brief');
  return result;
}
