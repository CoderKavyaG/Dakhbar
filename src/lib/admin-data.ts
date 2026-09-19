import { db } from './db';
export async function getAdminData(now = new Date()) {
  const [total, lastHour, last24Hours, items] = await db.$transaction([
    db.rawDocument.count(),
    db.rawDocument.count({ where: { ingested_at: { gte: new Date(now.getTime() - 3600000) } } }),
    db.rawDocument.count({ where: { ingested_at: { gte: new Date(now.getTime() - 86400000) } } }),
    db.rawDocument.findMany({ take: 20, orderBy: [{ ingested_at: 'desc' }, { id: 'desc' }], include: { source: true } }),
  ]);
  return { total, lastHour, last24Hours, items };
}
