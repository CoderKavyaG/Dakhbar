import { ingestAdditionalSource, type AdditionalSource } from './lib/ingestion/run';
import { Worker } from 'bullmq';
import { db } from './lib/db';
import { processUnclustered } from './lib/clustering/service';
import { sendDailyBriefEmails } from './lib/email/delivery';
import { ingestHn } from './lib/ingestion/hn';
import { prismaStore } from './lib/ingestion/store';
import { getModelHealth } from './lib/llm/catalog';
import { INGESTION_SUCCESS_KEY, PULSE_SUCCESS_KEY, WORKER_HEARTBEAT_KEY } from './lib/operational-health';
import { computeLatestEntityMetricSnapshots } from './lib/pulse';
import { createQueue, QUEUE_NAME, redisConnection, scheduleDailyBriefEmail, scheduleIngestion, scheduleAdditionalSources, schedulePulseSnapshots } from './lib/queue';

async function main() {
  const queue = createQueue();
  const redis = await queue.client;
  await getModelHealth(true);
  const heartbeat = () => redis.set(WORKER_HEARTBEAT_KEY, new Date().toISOString(), {EX:90});
  await heartbeat();
  const heartbeatTimer = setInterval(() => { void heartbeat().catch(error => console.error('Worker heartbeat failed', error.message)); }, 30000);
  const modelTimer = setInterval(() => { void getModelHealth(true); }, 15 * 60000);
  const worker = new Worker(QUEUE_NAME, async job => {
    const startedAt = new Date().toISOString();
    if (job.name === 'compute-pulse-snapshots') {
      const pulse = await computeLatestEntityMetricSnapshots();
      const completedAt = new Date().toISOString();
      await redis.set(PULSE_SUCCESS_KEY, JSON.stringify({ completedAt, ...pulse }), { EX: 3 * 86400 });
      console.log(JSON.stringify({ event: 'entity_metric_snapshots', startedAt, completedAt, ...pulse }));
      return pulse;
    }
    if (job.name === 'send-daily-briefs') {
      const delivery = await sendDailyBriefEmails();
      console.log(JSON.stringify({ event: 'daily_brief_email', startedAt, ...delivery }));
      if (delivery.failed) throw new Error(`${delivery.failed} Brief emails failed; retrying with idempotency keys`);
      return delivery;
    }
    if (['ingest-github','ingest-devto','ingest-rss'].includes(job.name)) {
      const source=job.name.slice(7) as AdditionalSource;
      const cooldownKey='dakhbar:ingestion:retry:'+source;
      const retryAt=await redis.get(cooldownKey);
      if(retryAt && Date.parse(retryAt)>Date.now()) return {deferred:true,retryAt};
      const ingestion=await ingestAdditionalSource(source);
      if(ingestion.retryAt) await redis.set(cooldownKey,ingestion.retryAt,{EX:Math.max(60,Math.ceil((Date.parse(ingestion.retryAt)-Date.now())/1000))});
      console.log(JSON.stringify({event:source+'_ingestion',startedAt,...ingestion}));
      if(!ingestion.failed&&!ingestion.deferred) await redis.set('dakhbar:health:'+source+':last-success',new Date().toISOString());
      const clustering=await processUnclustered();
      console.log(JSON.stringify({event:'story_clustering',source,startedAt,...clustering}));
      return {ingestion,clustering};
    }
    if(job.name!=='ingest-top-stories') throw new Error('Unknown job: '+job.name);
    const ingestion = await ingestHn(prismaStore);
    console.log(JSON.stringify({ event: 'hn_ingestion', startedAt, ...ingestion }));
    if (ingestion.failed) throw new Error(ingestion.failed + ' HN items failed; retrying idempotently');
    await redis.set(INGESTION_SUCCESS_KEY, new Date().toISOString());
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
    clearInterval(heartbeatTimer);
    clearInterval(modelTimer);
    await redis.del(WORKER_HEARTBEAT_KEY);
    await worker.close();
    await queue.close();
    await db.$disconnect();
  };
  process.once('SIGINT', () => void close());
  process.once('SIGTERM', () => void close());
  try {
    await Promise.all([scheduleIngestion(queue), scheduleDailyBriefEmail(queue), scheduleAdditionalSources(queue), schedulePulseSnapshots(queue)]);
    console.log('Worker ready: HN every 15 minutes; Dev.to every 30; GitHub and RSS hourly; Pulse daily at 00:15 UTC; Brief email daily at 08:00 Asia/Kolkata.');
  } catch (error) { await close(); throw error; }
}

main().catch(error => { console.error(error); process.exitCode = 1; });
