import { test } from 'node:test';
import assert from 'node:assert/strict';

test('Cron endpoints, vercel.json, and GitHub Actions scheduled ingestion are properly configured', async () => {
  const { readFile } = await import('node:fs/promises');

  // 1. Verify vercel.json contains ONLY once-per-day crons (Vercel Hobby tier compatible)
  const vercelJsonRaw = await readFile('vercel.json', 'utf8');
  const vercelJson = JSON.parse(vercelJsonRaw);
  assert.ok(Array.isArray(vercelJson.crons));
  assert.equal(vercelJson.crons.length, 2, 'vercel.json must only contain once-per-day crons for Vercel Hobby tier');

  const paths = (vercelJson.crons as Array<{ path: string; schedule: string }>).map(c => c.path);
  assert.ok(paths.includes('/api/cron/pulse'), 'Pulse snapshot must be scheduled daily in vercel.json');
  assert.ok(paths.includes('/api/cron/brief'), 'Daily brief email must be scheduled daily in vercel.json');
  assert.ok(!paths.includes('/api/cron/ingest?source=hn'), 'Sub-daily HN cron must be removed from vercel.json');
  assert.ok(!paths.includes('/api/cron/ingest?source=feeds'), 'Sub-daily feeds cron must be removed from vercel.json');

  // 2. Verify GitHub Actions scheduled ingestion workflow handles sub-daily ingestion
  const workflowRaw = await readFile('.github/workflows/scheduled-ingestion.yml', 'utf8');
  assert.ok(workflowRaw.includes('*/15 * * * *'), 'Workflow must schedule HN ingestion every 15 minutes');
  assert.ok(workflowRaw.includes('api/cron/ingest?source=hn'), 'Workflow must call HN endpoint');
  assert.ok(workflowRaw.includes('api/cron/ingest?source=$SOURCE_PARAM'), 'Workflow must call feeds endpoint');
  assert.ok(workflowRaw.includes('${{ secrets.CRON_SECRET }}'), 'Workflow must use CRON_SECRET');
  assert.ok(workflowRaw.includes('${{ secrets.APP_URL }}'), 'Workflow must use APP_URL');

  // 3. Verify cron route handlers exist and export GET/POST with maxDuration = 60
  const ingestRoute = await readFile('src/app/api/cron/ingest/route.ts', 'utf8');
  assert.match(ingestRoute, /export const maxDuration = 60/);
  assert.match(ingestRoute, /export async function GET/);
  assert.match(ingestRoute, /export async function POST/);
  assert.match(ingestRoute, /ingestHn/);
  assert.match(ingestRoute, /ingestAdditionalSource/);
  assert.match(ingestRoute, /processUnclustered/);

  const pulseRoute = await readFile('src/app/api/cron/pulse/route.ts', 'utf8');
  assert.match(pulseRoute, /export const maxDuration = 60/);
  assert.match(pulseRoute, /computeLatestEntityMetricSnapshots/);

  const briefRoute = await readFile('src/app/api/cron/brief/route.ts', 'utf8');
  assert.match(briefRoute, /export const maxDuration = 60/);
  assert.match(briefRoute, /sendDailyBriefEmails/);
});
