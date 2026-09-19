import { db } from '../src/lib/db';
import { fetchOpenGraphMetadata } from '../src/lib/ingestion/hn';

async function main() {
  const limit = Number(process.argv[2] ?? 120);
  const documents = await db.rawDocument.findMany({
    where: { og_image_url: null, og_description: null },
    orderBy: [{ published_at: 'desc' }, { id: 'asc' }],
    take: Number.isFinite(limit) ? Math.max(1, Math.min(limit, 1000)) : 120,
    select: { id: true, url: true },
  });
  let cursor = 0;
  let images = 0;
  let descriptions = 0;
  let checked = 0;
  await Promise.all(Array.from({ length: Math.min(5, documents.length) }, async () => {
    while (cursor < documents.length) {
      const document = documents[cursor++];
      const metadata = await fetchOpenGraphMetadata(document.url);
      if (metadata.og_image_url || metadata.og_description) {
        await db.rawDocument.update({ where: { id: document.id }, data: metadata });
        if (metadata.og_image_url) images++;
        if (metadata.og_description) descriptions++;
      }
      checked++;
      if (checked % 25 === 0) console.log(JSON.stringify({ checked, images, descriptions }));
    }
  }));
  console.log(JSON.stringify({ checked, images, descriptions, complete: true }));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
