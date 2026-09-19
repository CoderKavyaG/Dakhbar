import { db } from '../src/lib/db';
import { processUnclustered } from '../src/lib/clustering/service';
async function main() { console.log(JSON.stringify(await processUnclustered())); }
main().catch(error => { console.error(error); process.exitCode = 1; }).finally(() => db.$disconnect());
