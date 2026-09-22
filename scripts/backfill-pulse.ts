import { backfillEntityMetricSnapshots } from '../src/lib/pulse';
import { db } from '../src/lib/db';

backfillEntityMetricSnapshots()
  .then(result => console.log(JSON.stringify(result)))
  .catch(error => { console.error(error); process.exitCode = 1; })
  .finally(() => db.$disconnect());
