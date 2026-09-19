import { db } from '../src/lib/db';
import { processUnclustered } from '../src/lib/clustering/service';

async function main() {
  const documents = await db.rawDocument.count();
  await db.$transaction(async tx => {
    await tx.story.deleteMany();
  });
  const summary = await processUnclustered(documents + 1);
  console.log(JSON.stringify({ rebuiltFromDocuments: documents, ...summary }));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
