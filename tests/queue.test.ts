import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { Queue } from 'bullmq';
import { INTERVAL_MS, SCHEDULE_ID, scheduleIngestion, redisConnection } from '../src/lib/queue';
test('registers a stable 15-minute scheduler with bounded retries and retention', async () => {
  const calls: unknown[][] = [];
  const queue = { upsertJobScheduler: async (...args: unknown[]) => { calls.push(args); } } as unknown as Queue;
  await scheduleIngestion(queue);
  await scheduleIngestion(queue);
  assert.equal(INTERVAL_MS, 900000);
  assert.deepEqual(calls[0], calls[1]);
  assert.equal(calls[0][0], SCHEDULE_ID);
  assert.deepEqual(calls[0][1], { every: 900000 });
  assert.equal((calls[0][2] as { opts: { attempts: number } }).opts.attempts, 3);
});
test('Redis configuration requires a URL and supports TLS', () => {
  const previous = process.env.REDIS_URL;
  try {
    delete process.env.REDIS_URL;
    assert.throws(redisConnection, /required/);
    process.env.REDIS_URL = 'https://localhost';
    assert.throws(redisConnection, /redis/);
    process.env.REDIS_URL = 'rediss://user:pass@localhost:6380/2';
    const config = redisConnection();
    assert.equal(config.port, 6380);
    assert.equal(config.db, 2);
    assert.deepEqual(config.tls, {});
  } finally {
    if (previous === undefined) delete process.env.REDIS_URL; else process.env.REDIS_URL = previous;
  }
});
