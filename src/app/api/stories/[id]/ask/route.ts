import { NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { db } from '@/lib/db';
import { completeWithFallback, providerConfig, type ChatMessage, type LlmAttempt } from '@/lib/llm/provider';
import { getModelHealth } from '@/lib/llm/catalog';
import { cleanText, countIndependentSources, publisherDomain, truncateAtWord } from '@/lib/story-evidence';
import { answerStoryQuestion, citationsAreValid, type AskEvidence } from '@/lib/story-ask';

export const dynamic = 'force-dynamic';

async function resolveDocumentContent(doc: {
  id: string;
  external_id: string;
  url: string;
  content: string | null;
  raw_json?: unknown;
}): Promise<string> {
  let content = (doc.content || '').trim();

  // If content is very brief and it's dev.to, fetch full article body from official public API
  if (content.length < 500 && (doc.url.includes('dev.to') || /^\d+$/.test(doc.external_id))) {
    try {
      const devtoId = /^\d+$/.test(doc.external_id) ? doc.external_id : null;
      const targetUrl = devtoId
        ? `https://dev.to/api/articles/${devtoId}`
        : `https://dev.to/api/articles/${new URL(doc.url).pathname.replace(/^\//, '')}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 3500);
      const res = await fetch(targetUrl, { signal: controller.signal, headers: { Accept: 'application/vnd.forem.api-v1+json' } });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json() as { body_markdown?: string };
        if (typeof data?.body_markdown === 'string' && data.body_markdown.length > content.length) {
          content = data.body_markdown;
          await db.rawDocument.update({
            where: { id: doc.id },
            data: { content: data.body_markdown },
          }).catch(() => null);
        }
      }
    } catch {
      // Fallback gracefully
    }
  }

  // If Hacker News submission has text in raw_json
  if (!content && doc.raw_json && typeof doc.raw_json === 'object' && 'text' in doc.raw_json && typeof (doc.raw_json as { text?: unknown }).text === 'string') {
    content = (doc.raw_json as { text: string }).text;
  }

  return cleanText(content);
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { userId } = await auth();
  if (!userId) return NextResponse.json({ error: 'sign_in_required', message: 'Sign in to ask questions about this story.' }, { status: 401 });
  const user = await db.user.findUnique({ where: { id: userId }, select: { subscription_status: true } });
  if (user?.subscription_status !== 'active') return NextResponse.json({ error: 'paid_members_only', message: 'Ask this story is included with Desk membership.', upgradeUrl: '/pricing' }, { status: 403 });
  const { id: storyId } = await params;
  const body = await request.json().catch(() => null) as { question?: unknown } | null;
  if (typeof body?.question !== 'string' || !body.question.trim() || body.question.length > 500) return NextResponse.json({ error: 'question_invalid', message: 'Enter a question of up to 500 characters.' }, { status: 400 });
  const story = await db.story.findUnique({ where: { id: storyId }, include: { entities: { include: { entity: { select: { name: true } } } }, documents: { orderBy: { raw_document: { published_at: 'asc' } }, include: { raw_document: { select: { id: true, external_id: true, title: true, url: true, content: true, og_description: true, published_at: true, raw_json: true } } } } } });
  if (!story) return NextResponse.json({ error: 'story_not_found' }, { status: 404 });
  const reports = story.documents.map(document => document.raw_document).filter((document, index, all) => all.findIndex(other => other.url === document.url) === index).slice(0, 8);
  if (countIndependentSources(reports) < 1) return NextResponse.json({ error: 'source_required', message: 'No indexed sources available for this story.' }, { status: 404 });
  const evidence: AskEvidence[] = await Promise.all(reports.map(async (document, index) => {
    const fullContent = await resolveDocumentContent(document);
    const parts: string[] = [];
    if (document.og_description) parts.push(cleanText(document.og_description));
    if (fullContent && !fullContent.startsWith(document.og_description || '___')) parts.push(fullContent);
    const combined = parts.join(' — ');
    return {
      citation: index + 1,
      title: document.title,
      domain: publisherDomain(document.url),
      reportedAt: document.published_at.toISOString(),
      excerpt: truncateAtWord(combined || document.title, 3500),
      url: document.url,
    };
  }));
  const config = providerConfig('standard');
  let health: Awaited<ReturnType<typeof getModelHealth>> = [];
  const result = await answerStoryQuestion({ storyId, question: body.question, evidence }, {
    cached: async (id, inputHash) => {
      const row = await db.llmCall.findFirst({
        where: { story_id: id, input_hash: inputHash, accepted: true, output_text: { not: null } },
        orderBy: { created_at: 'desc' },
        select: { output_text: true }
      });
      if (!row?.output_text) return null;
      if (/not (?:provide|contain|have) enough detail|not enough detail|does not provide information/i.test(row.output_text)) {
        return null;
      }
      return row.output_text;
    },
    complete: async (messages: ChatMessage[]) => {
      if (!config) throw new Error('ask_model_unconfigured');
      health = await getModelHealth();
      if (!health.some(row => row.provider === config.primary.name && row.model === config.primary.model && row.available)) throw new Error('ask_model_unavailable');
      const fallback = config.fallback && health.some(row => row.provider === config.fallback?.name && row.model === config.fallback?.model && row.available) ? config.fallback : undefined;
      return completeWithFallback({ messages, primary: config.primary, fallback, maxTokens: 650 });
    },
    log: async ({ inputHash, attempts, acceptedText, acceptedProvider, acceptedModel }) => { await db.llmCall.createMany({ data: attempts.map((attempt: LlmAttempt) => ({ user_id: userId, story_id: storyId, input_hash: inputHash, provider: attempt.provider, model: attempt.model, input_tokens: attempt.inputTokens, output_tokens: attempt.outputTokens, fallback_triggered: attempt.fallbackTriggered, accepted: Boolean(acceptedText && attempt.provider === acceptedProvider && attempt.model === acceptedModel), output_text: attempt.content ?? null, error_code: attempt.errorCode ?? (attempt.content && !acceptedText ? (citationsAreValid(attempt.content, evidence.length) ? 'ask_grounding_mismatch' : 'ask_citation_mismatch') : null) })) }); },
  });
  return NextResponse.json({ ...result, evidence }, { headers: { 'Cache-Control': 'no-store' } });
}

