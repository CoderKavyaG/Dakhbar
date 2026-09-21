import { createHash } from 'node:crypto';
import { db } from './db';
import { countIndependentSources, publisherDomain, storyDek } from './story-evidence';
import { completeWithFallback, providerConfig, type LlmAttempt } from './llm/provider';

export type BriefGenerationStory = {
  id: string;
  title: string;
  significance_score: number;
  entities: { entity: { name: string } }[];
  documents: { raw_document: { title: string; url: string; content: string | null; og_description: string | null; published_at: Date } }[];
};

export type GroundedStoryFacts = {
  headline: string;
  entities: string[];
  sourceCount: number;
  significance: number;
  corroborationTimeline: { source: string; reportedAt: string }[];
};

export function buildGroundedFacts(story: BriefGenerationStory): GroundedStoryFacts {
  const documents = story.documents.map(item => item.raw_document);
  const seen = new Map<string, Date>();
  for (const document of documents) {
    const source = publisherDomain(document.url) || 'source';
    const current = seen.get(source);
    if (!current || document.published_at < current) seen.set(source, document.published_at);
  }
  return {
    headline: story.title,
    entities: story.entities.map(item => item.entity.name),
    sourceCount: countIndependentSources(documents),
    significance: Number(story.significance_score.toFixed(3)),
    corroborationTimeline: [...seen].sort((a, b) => a[1].getTime() - b[1].getTime()).map(([source, date]) => ({ source, reportedAt: date.toISOString() })),
  };
}

const NAME_STOPWORDS = new Set(['A', 'An', 'The', 'This', 'That', 'These', 'Those', 'First', 'Later', 'Meanwhile', 'Reported', 'Reporting', 'Sources', 'Source']);
export function verifyGroundedCopy(text: string, facts: GroundedStoryFacts) {
  if (/\b(significance|ranking|score)\b/i.test(text) || /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(text) || text.includes(String(facts.significance))) return false;
  const input = JSON.stringify(facts).toLowerCase();
  const numbers = text.match(/\b\d+(?:\.\d+)?\b/g) ?? [];
  if (numbers.some(value => !input.includes(value.toLowerCase()))) return false;
  const names = text.match(/\b[A-Z](?:[A-Za-z0-9+#-]|\.(?=[A-Za-z]))*(?:\s+[A-Z](?:[A-Za-z0-9+#-]|\.(?=[A-Za-z]))*)*/g) ?? [];
  return names.every(name => NAME_STOPWORDS.has(name) || input.includes(name.toLowerCase()));
}

export function groundedOrFallback(candidate: string, facts: GroundedStoryFacts, fallback: string) {
  return verifyGroundedCopy(candidate, facts) ? { text: candidate, generated: true as const } : { text: fallback, generated: false as const };
}

function fallbackCopy(story: BriefGenerationStory) {
  const document = story.documents[0]?.raw_document;
  return document ? storyDek(document, 240).text : story.title;
}

function messages(facts: GroundedStoryFacts, lead: boolean) {
  return [{ role: 'system' as const, content: 'You are an exacting technology news editor. Rewrite only the supplied facts. Never add outside knowledge, causes, implications, names, dates, quantities, or claims. Use no markdown. If a fact is absent, omit it. Never expose significance, ranking, scores, JSON field names, or raw timestamps.' }, { role: 'user' as const, content: `Write ${lead ? 'up to two concise sentences for the lead story' : 'one concise sentence'} using only this JSON. Write natural editorial prose from the headline and source domains. Do not mention sourceCount, significance, reportedAt, internal metrics, or raw timestamps. Every name and number you do use must appear verbatim in the JSON. Facts: ${JSON.stringify(facts)}` }];
}

async function logAttempts(input: { attempts: LlmAttempt[]; userId: string; storyId: string; inputHash: string; acceptedText?: string; acceptedProvider?: string; acceptedModel?: string }) {
  await db.llmCall.createMany({ data: input.attempts.map(attempt => ({
    user_id: input.userId,
    story_id: input.storyId,
    input_hash: input.inputHash,
    provider: attempt.provider,
    model: attempt.model,
    input_tokens: attempt.inputTokens,
    output_tokens: attempt.outputTokens,
    fallback_triggered: attempt.fallbackTriggered,
    accepted: Boolean(input.acceptedText && attempt.provider === input.acceptedProvider && attempt.model === input.acceptedModel),
    output_text: input.acceptedText && attempt.provider === input.acceptedProvider && attempt.model === input.acceptedModel ? input.acceptedText : null,
    error_code: attempt.errorCode,
  })) });
}

export async function generateBriefStoryCopy(story: BriefGenerationStory, userId: string, lead: boolean) {
  const config = providerConfig(lead ? 'lead' : 'standard');
  if (!config) return { text: fallbackCopy(story), generated: false as const, reason: 'provider_unconfigured' };
  const facts = buildGroundedFacts(story);
  const inputHash = createHash('sha256').update('brief-grounding-v3:' + JSON.stringify(facts)).digest('hex');
  const cached = await db.llmCall.findFirst({ where: { story_id: story.id, input_hash: inputHash, model: { in: [config.primary.model, ...(config.fallback ? [config.fallback.model] : [])] }, accepted: true, output_text: { not: null } }, orderBy: { created_at: 'desc' } });
  if (cached?.output_text) return { text: cached.output_text, generated: true as const, cached: true };
  try {
    const result = await completeWithFallback({ messages: messages(facts, lead), ...config });
    const decision = groundedOrFallback(result.content, facts, fallbackCopy(story));
    const accepted = decision.generated;
    await logAttempts({ attempts: result.attempts, userId, storyId: story.id, inputHash, acceptedText: accepted ? result.content : undefined, acceptedProvider: result.provider, acceptedModel: result.model });
    return accepted ? { text: decision.text, generated: true as const, cached: false } : { text: decision.text, generated: false as const, reason: 'grounding_mismatch' };
  } catch (error) {
    const attempts = (error as Error & { attempts?: LlmAttempt[] }).attempts ?? [];
    if (attempts.length) await logAttempts({ attempts, userId, storyId: story.id, inputHash });
    return { text: fallbackCopy(story), generated: false as const, reason: 'provider_failure' };
  }
}
