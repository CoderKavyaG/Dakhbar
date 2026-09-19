import { db } from '../src/lib/db';
import { ENTITY_SEED } from '../src/lib/clustering/entity-seed';

async function main() {
  for (const entity of ENTITY_SEED) {
    await db.entity.upsert({ where: { name: entity.name }, update: { type: entity.type, aliases: entity.aliases }, create: entity });
  }
  console.log(JSON.stringify({ seeded: ENTITY_SEED.length }));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
