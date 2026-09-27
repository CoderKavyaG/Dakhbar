'use server';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireReader } from '@/lib/reader-auth';

export async function setSavedStory(storyId: string, mode: 'save' | 'remove') {
  const userId = await requireReader();
  if (typeof storyId !== 'string' || storyId.length > 128 || !['save', 'remove'].includes(mode)) {
    throw new Error('Invalid save request.');
  }
  if (!await db.story.findUnique({ where: { id: storyId }, select: { id: true } })) {
    throw new Error('This story is no longer available.');
  }
  if (mode === 'remove') {
    await db.savedStory.deleteMany({ where: { user_id: userId, story_id: storyId } });
  } else {
    await db.savedStory.upsert({
      where: { user_id_story_id: { user_id: userId, story_id: storyId } },
      create: { user_id: userId, story_id: storyId },
      update: {},
    });
  }
  revalidatePath('/saved');
  revalidatePath('/');
  return { id: storyId, saved: mode !== 'remove' };
}
