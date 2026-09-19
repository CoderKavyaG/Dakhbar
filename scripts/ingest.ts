import { QueueEvents } from 'bullmq';
import { createQueue, QUEUE_NAME, redisConnection } from '../src/lib/queue';
async function main() {
  const queue = createQueue();
  const events = new QueueEvents(QUEUE_NAME, { connection: redisConnection() });
  try {
    await events.waitUntilReady();
    const job = await queue.add('manual-ingestion', {}, {
      attempts: 3, backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 }, removeOnFail: { count: 100 },
    });
    console.log('Queued ingestion', job.id);
    console.log(await job.waitUntilFinished(events, 300000));
  } finally { await events.close(); await queue.close(); }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
