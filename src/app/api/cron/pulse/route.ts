import { NextRequest, NextResponse } from 'next/server';
import { computeLatestEntityMetricSnapshots } from '@/lib/pulse';
import { PULSE_SUCCESS_KEY } from '@/lib/operational-health';
import { createQueue } from '@/lib/queue';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

function isAuthorized(request: NextRequest): boolean {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) return process.env.NODE_ENV !== 'production';

  const authHeader = request.headers.get('authorization');
  if (authHeader === `Bearer ${cronSecret}`) return true;

  const customSecret = request.headers.get('x-cron-secret');
  return customSecret === cronSecret;
}

export async function GET(request: NextRequest) {
  return handlePulse(request);
}

export async function POST(request: NextRequest) {
  return handlePulse(request);
}

async function handlePulse(request: NextRequest) {
  const startTime = Date.now();

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide valid Bearer token in Authorization header.' },
      { status: 401 }
    );
  }

  try {
    const pulseResult = await computeLatestEntityMetricSnapshots();
    const completedAt = new Date().toISOString();

    if (process.env.REDIS_URL) {
      try {
        const queue = createQueue(true);
        queue.on('error', () => {});
        const client = await queue.client;
        await client.set(
          PULSE_SUCCESS_KEY,
          JSON.stringify({ completedAt, ...pulseResult }),
          { EX: 3 * 86400 }
        );
        await queue.close();
      } catch {
        // Non-fatal if Redis is unavailable
      }
    }

    const durationMs = Date.now() - startTime;
    return NextResponse.json({
      success: true,
      durationMs,
      completedAt,
      ...pulseResult,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: false,
        durationMs,
        error: error instanceof Error ? error.message : 'Unknown pulse snapshot calculation error',
      },
      { status: 500 }
    );
  }
}
