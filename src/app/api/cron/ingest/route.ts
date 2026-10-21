import { NextRequest, NextResponse } from 'next/server';
import { ingestHn } from '@/lib/ingestion/hn';
import { prismaStore } from '@/lib/ingestion/store';
import { ingestAdditionalSource } from '@/lib/ingestion/run';
import { processUnclustered } from '@/lib/clustering/service';
import { INGESTION_SUCCESS_KEY } from '@/lib/operational-health';
import { createQueue } from '@/lib/queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // 60s max execution for serverless cron

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    // In local development or staging without CRON_SECRET configured, allow execution
    return process.env.NODE_ENV !== 'production';
  }

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) {
    return true;
  }

  // Also support custom x-cron-secret header or Vercel cron header
  const customSecret = request.headers.get('x-cron-secret');
  if (customSecret === cronSecret) {
    return true;
  }

  return false;
}

async function recordSuccess(key: string) {
  if (!process.env.REDIS_URL) return;
  try {
    const queue = createQueue(true);
    queue.on('error', () => {});
    const client = await queue.client;
    await client.set(key, new Date().toISOString());
    await queue.close();
  } catch {
    // Non-fatal if Redis is unreachable
  }
}

export async function GET(request: NextRequest) {
  return handleIngest(request);
}

export async function POST(request: NextRequest) {
  return handleIngest(request);
}

async function handleIngest(request: NextRequest) {
  const startTime = Date.now();
  // Safe deadlines for serverless: 40s total budget (leaves 20s margin before Vercel 60s hard ceiling)
  const totalDeadlineMs = startTime + 40000;
  const hnDeadlineMs = startTime + 20000;

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide valid Bearer token in Authorization header.' },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const source = searchParams.get('source') ?? 'all';

  const results: Record<string, unknown> = {};

  try {
    // 1. Ingest HN (bounded to top 15 pending and 20s budget for serverless)
    if (source === 'all' || source === 'hn') {
      const hnResult = await ingestHn(prismaStore, fetch, 15, hnDeadlineMs);
      results.hn = hnResult;
      await recordSuccess(INGESTION_SUCCESS_KEY);
    }

    // 2. Ingest Dev.to (if time permits)
    if ((source === 'all' || source === 'feeds' || source === 'devto') && Date.now() < totalDeadlineMs - 15000) {
      const devtoResult = await ingestAdditionalSource('devto');
      results.devto = devtoResult;
      if (!devtoResult.failed && !devtoResult.deferred) {
        await recordSuccess('dakhbar:health:devto:last-success');
      }
    }

    // 3. Ingest Publisher RSS (if time permits)
    if ((source === 'all' || source === 'feeds' || source === 'rss') && Date.now() < totalDeadlineMs - 12000) {
      const rssResult = await ingestAdditionalSource('rss');
      results.rss = rssResult;
      if (!rssResult.failed && !rssResult.deferred) {
        await recordSuccess('dakhbar:health:rss:last-success');
      }
    }

    // 4. Ingest GitHub (if configured and time permits)
    if (source === 'all' || source === 'github') {
      if (process.env.GITHUB_TOKEN && Date.now() < totalDeadlineMs - 10000) {
        const ghResult = await ingestAdditionalSource('github');
        results.github = ghResult;
        if (!ghResult.failed && !ghResult.deferred) {
          await recordSuccess('dakhbar:health:github:last-success');
        }
      } else if (!process.env.GITHUB_TOKEN) {
        results.github = { skipped: true, reason: 'GITHUB_TOKEN not configured' };
      }
    }

    // 5. Run deterministic clustering on unclustered documents (bounded to 20 items & deadline)
    const clustering = await processUnclustered(20, totalDeadlineMs);
    results.clustering = clustering;

    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      durationMs,
      source,
      results,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: false,
        durationMs,
        source,
        error: error instanceof Error ? error.message : 'Unknown ingestion error',
        results,
      },
      { status: 500 }
    );
  }
}
