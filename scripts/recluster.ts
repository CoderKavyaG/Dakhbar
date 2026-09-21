import { db } from '../src/lib/db';
import { processUnclustered } from '../src/lib/clustering/service';

async function main() {
  if (await db.savedStory.count()) throw new Error('Full reclustering would replace saved story URLs. Use reviewed merges instead while saved stories exist.');
  const documents = await db.rawDocument.count();
  await db.$transaction(async tx => {
    await tx.story.deleteMany();
  });
  const summary = await processUnclustered(documents + 1);
  console.log(JSON.stringify({ rebuiltFromDocuments: documents, ...summary }));
}

main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
