import { Queue } from 'bullmq';
export const QUEUE_NAME = 'hn-ingestion';
export const SCHEDULE_ID = 'hn-every-15-minutes';
export const INTERVAL_MS = 15 * 60 * 1000;
export function redisConnection() {
  if (!process.env.REDIS_URL) throw new Error('REDIS_URL is required');
  const url = new URL(process.env.REDIS_URL);
  if (!['redis:', 'rediss:'].includes(url.protocol)) throw new Error('REDIS_URL must use redis:// or rediss://');
  return {
    host: url.hostname, port: Number(url.port || 6379),
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: Number(url.pathname.slice(1) || 0),
    ...(url.protocol === 'rediss:' ? { tls: {} } : {}),
    maxRetriesPerRequest: null,
  };
}
export function createQueue() { return new Queue(QUEUE_NAME, { connection: redisConnection() }); }
export async function scheduleIngestion(queue: Queue) {
  return queue.upsertJobScheduler(SCHEDULE_ID, { every: INTERVAL_MS }, {
    name: 'ingest-top-stories',
    opts: { attempts: 3, backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 100 }, removeOnFail: { count: 100 } },
  });
}
