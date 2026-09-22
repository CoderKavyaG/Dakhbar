import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { completeWithFallback, providerConfig, type ChatMessage, type LlmAttempt } from '@/lib/llm/provider';
import { getModelHealth } from '@/lib/llm/catalog';
import { countIndependentSources, publisherDomain, storyDek } from '@/lib/story-evidence';
import { answerStoryQuestion, type AskEvidence } from '@/lib/story-ask';

export const dynamic = 'force-dynamic';
export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'sign_in_required' }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: userId }, select: { subscription_status: true } });
  if (user?.subscription_status !== 'active') return NextResponse.json({ error: 'paid_members_only', upgradeUrl: '/pricing' }, { status: 403 });
  const { id: storyId } = await params;
  const body = await request.json().catch(() => null) as { question?: unknown } | null;
  if (typeof body?.question !== 'string' || !body.question.trim() || body.question.length > 500) return NextResponse.json({ error: 'question_invalid', message: 'Enter a question of up to 500 characters.' }, { status: 400 });
  const story = await db.story.findUnique({ where: { id: storyId }, include: { entities: { include: { entity: { select: { name: true } } } }, documents: { orderBy: { raw_document: { published_at: 'asc' } }, include: { raw_document: { select: { title: true, url: true, content: true, og_description: true, published_at: true } } } } } });
  if (!story) return NextResponse.json({ error: 'story_not_found' }, { status: 404 });
  const reports = story.documents.map(document => document.raw_document).filter((document, index, all) => all.findIndex(other => other.url === document.url) === index).slice(0, 8);
  if (countIndependentSources(reports) < 2) return NextResponse.json({ error: 'multi_source_story_required' }, { status: 404 });
  const evidence: AskEvidence[] = reports.map((document, index) => ({ citation: index + 1, title: document.title, domain: publisherDomain(document.url), reportedAt: document.published_at.toISOString(), excerpt: storyDek(document, 700).text, url: document.url }));
  const config = providerConfig('standard');
  let health: Awaited<ReturnType<typeof getModelHealth>> = [];
  const result = await answerStoryQuestion({ storyId, question: body.question, evidence }, {
    cached: async (id, inputHash) => (await db.llmCall.findFirst({ where: { story_id: id, input_hash: inputHash, accepted: true, output_text: { not: null } }, orderBy: { created_at: 'desc' }, select: { output_text: true } }))?.output_text ?? null,
    complete: async (messages: ChatMessage[]) => {
      if (!config) throw new Error('ask_model_unconfigured');
      health = await getModelHealth();
      if (!health.some(row => row.provider === config.primary.name && row.model === config.primary.model && row.available)) throw new Error('ask_model_unavailable');
      const fallback = config.fallback && health.some(row => row.provider === config.fallback?.name && row.model === config.fallback?.model && row.available) ? config.fallback : undefined;
      return completeWithFallback({ messages, primary: config.primary, fallback, maxTokens: 650 });
    },
    log: async ({ inputHash, attempts, acceptedText, acceptedProvider, acceptedModel }) => { await db.llmCall.createMany({ data: attempts.map((attempt: LlmAttempt) => ({ user_id: userId, story_id: storyId, input_hash: inputHash, provider: attempt.provider, model: attempt.model, input_tokens: attempt.inputTokens, output_tokens: attempt.outputTokens, fallback_triggered: attempt.fallbackTriggered, accepted: Boolean(acceptedText && attempt.provider === acceptedProvider && attempt.model === acceptedModel), output_text: acceptedText && attempt.provider === acceptedProvider && attempt.model === acceptedModel ? acceptedText : null, error_code: attempt.errorCode })) }); },
  });
  return NextResponse.json({ ...result, evidence }, { headers: { 'Cache-Control': 'no-store' } });
}
