import { db } from '../src/lib/db';
import { getAdminData } from '../src/lib/admin-data';
async function main() {
  const tables = await db.$queryRaw<{ tablename: string }[]>`SELECT tablename FROM pg_tables WHERE schemaname = 'public' ORDER BY tablename`;
  const data = await getAdminData();
  console.log(JSON.stringify({ tables, ...data, items: data.items.map(item => ({
    title: item.title, source: item.source.name, ingested_at: item.ingested_at, url: item.url,
  })) }, null, 2));
}
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
