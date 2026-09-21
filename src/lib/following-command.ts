import { Prisma } from '@prisma/client';
import { db } from './db';
import { decideFollowChange, FREE_FOLLOW_LIMIT } from './follow-entitlement';

export type FollowingCommandResult = {
  following: boolean;
  entityIds: string[];
  upgradeRequired: boolean;
  currentCount: number;
  limit: number;
};

export async function changeFollowingWithCap(userId: string, entityIds: string[], intent: 'toggle' | 'follow'): Promise<FollowingCommandResult> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await db.$transaction(async tx => {
        const [user, currentRows] = await Promise.all([
          tx.user.findUniqueOrThrow({ where: { id: userId }, select: { subscription_status: true } }),
          tx.following.findMany({ where: { user_id: userId }, select: { entity_id: true } }),
        ]);
        const decision = decideFollowChange({
          currentEntityIds: currentRows.map(row => row.entity_id),
          requestedEntityIds: entityIds,
          intent,
          subscriptionStatus: user.subscription_status,
        });
        if (decision.kind === 'follow') {
          const current = new Set(currentRows.map(row => row.entity_id));
          await tx.following.createMany({
            data: decision.entityIds.filter(id => !current.has(id)).map(entity_id => ({ user_id: userId, entity_id })),
            skipDuplicates: true,
          });
        } else if (decision.kind === 'unfollow') {
          await tx.following.deleteMany({ where: { user_id: userId, entity_id: { in: decision.entityIds } } });
        }
        return {
          following: decision.kind === 'follow' || decision.kind === 'noop',
          entityIds: decision.entityIds,
          upgradeRequired: decision.kind === 'upgrade',
          currentCount: decision.currentCount,
          limit: FREE_FOLLOW_LIMIT,
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2034' && attempt < 2) continue;
      throw error;
    }
  }
  throw new Error('Following transaction retry limit reached');
}
