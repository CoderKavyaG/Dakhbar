import { NextRequest, NextResponse } from 'next/server';
import { sendDailyBriefEmails } from '@/lib/email/delivery';

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
  return handleBrief(request);
}

export async function POST(request: NextRequest) {
  return handleBrief(request);
}

async function handleBrief(request: NextRequest) {
  const startTime = Date.now();

  if (!isAuthorized(request)) {
    return NextResponse.json(
      { error: 'Unauthorized. Provide valid Bearer token in Authorization header.' },
      { status: 401 }
    );
  }

  try {
    const delivery = await sendDailyBriefEmails();
    const durationMs = Date.now() - startTime;

    return NextResponse.json({
      success: true,
      durationMs,
      delivery,
    });
  } catch (error) {
    const durationMs = Date.now() - startTime;
    return NextResponse.json(
      {
        success: false,
        durationMs,
        error: error instanceof Error ? error.message : 'Unknown brief email delivery error',
      },
      { status: 500 }
    );
  }
}
