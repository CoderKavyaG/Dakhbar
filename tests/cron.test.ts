import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Cron endpoints and vercel.json are properly configured', async () => {
  const { readFile } = await import('node:fs/promises');

  // Verify vercel.json cron config
  const vercelJsonRaw = await readFile('vercel.json', 'utf8');
  const vercelJson = JSON.parse(vercelJsonRaw);
  assert.ok(Array.isArray(vercelJson.crons));
  assert.equal(vercelJson.crons.length, 4);

  const paths = (vercelJson.crons as Array<{ path: string }>).map(c => c.path);
  assert.ok(paths.includes('/api/cron/ingest?source=hn'));
  assert.ok(paths.includes('/api/cron/ingest?source=feeds'));
  assert.ok(paths.includes('/api/cron/pulse'));
  assert.ok(paths.includes('/api/cron/brief'));

  // Verify cron route handlers exist and export GET/POST with maxDuration
  const ingestRoute = await readFile('src/app/api/cron/ingest/route.ts', 'utf8');
  assert.match(ingestRoute, /export const maxDuration = 60/);
  assert.match(ingestRoute, /export async function GET/);
  assert.match(ingestRoute, /export async function POST/);
  assert.match(ingestRoute, /ingestHn/);
  assert.match(ingestRoute, /processUnclustered/);

  const pulseRoute = await readFile('src/app/api/cron/pulse/route.ts', 'utf8');
  assert.match(pulseRoute, /export const maxDuration = 60/);
  assert.match(pulseRoute, /computeLatestEntityMetricSnapshots/);

  const briefRoute = await readFile('src/app/api/cron/brief/route.ts', 'utf8');
  assert.match(briefRoute, /export const maxDuration = 60/);
  assert.match(briefRoute, /sendDailyBriefEmails/);
});
