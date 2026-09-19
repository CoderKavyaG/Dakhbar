'use server';

import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { requireAdmin } from '@/lib/admin-auth';
import { extractEntityIds } from '@/lib/clustering/entities';
import { refreshSignificance } from '@/lib/clustering/service';

export async function confirmMergeAction(formData: FormData) {
  await requireAdmin();
  const storyId = String(formData.get('storyId') ?? '');
  const story = await db.story.findUnique({
    where: { id: storyId },
    include: { documents: true, entities: true },
  });
  if (!story?.possibly_related_to_id) return;
  const targetId = story.possibly_related_to_id;
  await db.$transaction(async tx => {
    await tx.storyDocument.deleteMany({ where: { story_id: storyId } });
    await tx.storyDocument.createMany({
      data: story.documents.map(member => ({ ...member, story_id: targetId, created_at: member.created_at })),
      skipDuplicates: true,
    });
    await tx.storyEntity.createMany({
      data: story.entities.map(item => ({ story_id: targetId, entity_id: item.entity_id })),
      skipDuplicates: true,
    });
    await tx.story.update({ where: { id: targetId }, data: { status: 'confirmed' } });
    await tx.story.delete({ where: { id: storyId } });
  });
  await refreshSignificance([targetId]);
  revalidatePath('/admin/clusters');
  revalidatePath('/');
}

export async function keepSeparateAction(formData: FormData) {
  await requireAdmin();
  const storyId = String(formData.get('storyId') ?? '');
  await db.story.update({ where: { id: storyId }, data: { status: 'confirmed', possibly_related_to_id: null } });
  revalidatePath('/admin/clusters');
}

export async function unmergeDocumentAction(formData: FormData) {
  await requireAdmin();
  const storyId = String(formData.get('storyId') ?? '');
  const documentId = String(formData.get('documentId') ?? '');
  const [membership, memberCount, entities] = await Promise.all([
    db.storyDocument.findUnique({
      where: { story_id_raw_document_id: { story_id: storyId, raw_document_id: documentId } },
      include: { raw_document: true },
    }),
    db.storyDocument.count({ where: { story_id: storyId } }),
    db.entity.findMany({ select: { id: true, name: true, aliases: true } }),
  ]);
  if (!membership || memberCount < 2) return;
  const entityIds = extractEntityIds(membership.raw_document.title, membership.raw_document.content, entities);
  const created = await db.$transaction(async tx => {
    await tx.storyDocument.delete({ where: { story_id_raw_document_id: { story_id: storyId, raw_document_id: documentId } } });
    if (membership.is_primary) {
      const replacement = await tx.storyDocument.findFirst({ where: { story_id: storyId }, orderBy: { created_at: 'asc' } });
      if (replacement) await tx.storyDocument.update({ where: { story_id_raw_document_id: { story_id: storyId, raw_document_id: replacement.raw_document_id } }, data: { is_primary: true } });
    }
    return tx.story.create({
      data: {
        title: membership.raw_document.title,
        status: 'confirmed',
        created_at: membership.raw_document.published_at,
        updated_at: membership.raw_document.published_at,
        documents: { create: { raw_document_id: documentId, similarity_score: 1, is_primary: true } },
        entities: { create: entityIds.map(entity_id => ({ entity_id })) },
      },
      select: { id: true },
    });
  });
  await refreshSignificance([storyId, created.id]);
  revalidatePath('/admin/clusters');
  revalidatePath('/');
}
