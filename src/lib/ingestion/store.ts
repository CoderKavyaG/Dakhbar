import { Prisma } from '@prisma/client';
import { db } from '../db';
import type { IngestionStore } from './hn';
export const prismaStore: IngestionStore = {
  async ensureSource() {
    const source = await db.source.upsert({
      where: { name: 'hn' }, update: {},
      create: { name: 'hn', type: 'hn', base_url: 'https://news.ycombinator.com' },
    });
    return source.id;
  },
  async existingIds(sourceId, ids) {
    const rows = await db.rawDocument.findMany({
      where: { source_id: sourceId, external_id: { in: ids } }, select: { external_id: true },
    });
    return rows.map(row => row.external_id);
  },
  async insert(row) {
    const result = await db.rawDocument.createMany({
      data: [{ ...row, raw_json: row.raw_json as Prisma.InputJsonObject }],
      skipDuplicates: true,
    });
    return result.count === 1;
  },
};
