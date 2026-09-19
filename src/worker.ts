import { Worker } from 'bullmq';
import { db } from './lib/db';
import { ingestHn } from './lib/ingestion/hn';
import { prismaStore } from './lib/ingestion/store';
import { createQueue, QUEUE_NAME, redisConnection, scheduleIngestion } from './lib/queue';

async function main() {
  const queue = createQueue();
  const worker = new Worker(QUEUE_NAME, async () => {
    const startedAt = new Date().toISOString();
    const summary = await ingestHn(prismaStore);
    console.log(JSON.stringify({ event: 'hn_ingestion', startedAt, ...summary }));
    if (summary.failed) throw new Error(summary.failed + ' HN items failed; retrying idempotently');
    return summary;
  }, { connection: redisConnection(), concurrency: 1 });
  worker.on('failed', (job, error) => console.error(JSON.stringify({ event: 'job_failed', jobId: job?.id, error: error.message })));
  worker.on('error', error => console.error('Worker error:', error.message));
  queue.on('error', error => console.error('Queue error:', error.message));
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await worker.close(); await queue.close(); await db.$disconnect();
  };
  process.once('SIGINT', () => void close());
  process.once('SIGTERM', () => void close());
  try {
    await scheduleIngestion(queue);
    console.log('HN worker ready; schedule every 15 minutes.');
  } catch (error) { await close(); throw error; }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
