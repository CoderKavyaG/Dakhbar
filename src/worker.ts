import { Worker } from 'bullmq';
import { db } from './lib/db';
import { processUnclustered } from './lib/clustering/service';
import { sendDailyBriefEmails } from './lib/email/delivery';
import { ingestHn } from './lib/ingestion/hn';
import { prismaStore } from './lib/ingestion/store';
import { createQueue, QUEUE_NAME, redisConnection, scheduleDailyBriefEmail, scheduleIngestion } from './lib/queue';

async function main() {
  const queue = createQueue();
  const worker = new Worker(QUEUE_NAME, async job => {
    const startedAt = new Date().toISOString();
    if (job.name === 'send-daily-briefs') {
      const delivery = await sendDailyBriefEmails();
      console.log(JSON.stringify({ event: 'daily_brief_email', startedAt, ...delivery }));
      if (delivery.failed) throw new Error(`${delivery.failed} Brief emails failed; retrying with idempotency keys`);
      return delivery;
    }
    const ingestion = await ingestHn(prismaStore);
    console.log(JSON.stringify({ event: 'hn_ingestion', startedAt, ...ingestion }));
    if (ingestion.failed) throw new Error(ingestion.failed + ' HN items failed; retrying idempotently');
    const clustering = await processUnclustered();
    console.log(JSON.stringify({ event: 'story_clustering', startedAt, ...clustering }));
    return { ingestion, clustering };
  }, { connection: redisConnection(), concurrency: 1 });
  worker.on('failed', (job, error) => console.error(JSON.stringify({ event: 'job_failed', jobId: job?.id, error: error.message })));
  worker.on('error', error => console.error('Worker error:', error.message));
  queue.on('error', error => console.error('Queue error:', error.message));
  let closing = false;
  const close = async () => {
    if (closing) return;
    closing = true;
    await worker.close();
    await queue.close();
    await db.$disconnect();
  };
  process.once('SIGINT', () => void close());
  process.once('SIGTERM', () => void close());
  try {
    await Promise.all([scheduleIngestion(queue), scheduleDailyBriefEmail(queue)]);
    console.log('Worker ready: HN every 15 minutes; Brief email daily at 08:00 Asia/Kolkata.');
  } catch (error) { await close(); throw error; }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
