import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { generateResearchReport } from '@/lib/research';

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { subscription_status: true },
  });

  if (user?.subscription_status !== 'active') {
    return NextResponse.json(
      { error: 'paid_members_only', upgradeUrl: '/pricing' },
      { status: 403 }
    );
  }

  let body: { topic?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const topic = body.topic?.trim();
  if (!topic) {
    return NextResponse.json({ error: 'topic_required' }, { status: 400 });
  }

  const result = await generateResearchReport({ topic, userId });

  if (result.error && !result.report) {
    const status = result.error.includes('limit reached') ? 429 : 400;
    return NextResponse.json(
      { error: result.error, quotaUsed: result.quotaUsed, quotaLimit: result.quotaLimit },
      { status }
    );
  }

  return NextResponse.json({
    report: result.report,
    cached: result.cached,
    quotaUsed: result.quotaUsed,
    quotaLimit: result.quotaLimit,
  });
}
