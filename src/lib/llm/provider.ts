export type ChatMessage = { role: 'system' | 'user'; content: string };
export type ProviderConfig = { name: string; baseUrl: string; apiKey: string; model: string };
export type LlmAttempt = { provider: string; model: string; inputTokens: number; outputTokens: number; fallbackTriggered: boolean; content?: string; errorCode?: string };
export type CompletionResult = { content: string; provider: string; model: string; inputTokens: number; outputTokens: number; fallbackTriggered: boolean; attempts: LlmAttempt[] };

type OpenAiResponse = { choices?: { message?: { content?: string } }[]; usage?: { prompt_tokens?: number; completion_tokens?: number } };

function endpoint(baseUrl: string) { return baseUrl.replace(/\/$/, '') + '/chat/completions'; }

async function request(config: ProviderConfig, messages: ChatMessage[], fetchImpl: typeof fetch, fallbackTriggered: boolean): Promise<LlmAttempt> {
  let response: Response;
  try {
    response = await fetchImpl(endpoint(config.baseUrl), {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${config.apiKey}` },
      body: JSON.stringify({ model: config.model, messages, temperature: 0.2, max_completion_tokens: config.model.includes('gpt-oss') ? 600 : 280, ...(config.model.includes('gpt-oss') ? { reasoning_effort: 'low' } : {}) }),
    });
  } catch {
    return { provider: config.name, model: config.model, inputTokens: 0, outputTokens: 0, fallbackTriggered, errorCode: 'network_error' };
  }
  if (!response.ok) return { provider: config.name, model: config.model, inputTokens: 0, outputTokens: 0, fallbackTriggered, errorCode: String(response.status) };
  const payload = await response.json() as OpenAiResponse;
  const content = payload.choices?.[0]?.message?.content?.trim();
  if (!content) return { provider: config.name, model: config.model, inputTokens: payload.usage?.prompt_tokens ?? 0, outputTokens: payload.usage?.completion_tokens ?? 0, fallbackTriggered, errorCode: 'empty_response' };
  return { provider: config.name, model: config.model, inputTokens: payload.usage?.prompt_tokens ?? 0, outputTokens: payload.usage?.completion_tokens ?? 0, fallbackTriggered, content };
}

export async function completeWithFallback(input: { messages: ChatMessage[]; primary: ProviderConfig; fallback?: ProviderConfig; fetchImpl?: typeof fetch }): Promise<CompletionResult> {
  const fetchImpl = input.fetchImpl ?? fetch;
  const primary = await request(input.primary, input.messages, fetchImpl, false);
  const attempts = [primary];
  if (primary.content) return { ...primary, content: primary.content, attempts };
  if (!input.fallback || !['403', '404', '429', 'network_error', '500', '502', '503', '504'].includes(primary.errorCode ?? '')) throw Object.assign(new Error(`LLM primary failed: ${primary.errorCode}`), { attempts });
  const fallback = await request(input.fallback, input.messages, fetchImpl, true);
  attempts.push(fallback);
  if (!fallback.content) throw Object.assign(new Error(`LLM fallback failed: ${fallback.errorCode}`), { attempts });
  return { ...fallback, content: fallback.content, attempts };
}

export function providerConfig(tier: 'lead' | 'standard') {
  const primaryKey = process.env.GROQ_API_KEY ?? '';
  if (!primaryKey) return null;
  const primary: ProviderConfig = {
    name: 'groq',
    baseUrl: process.env.GROQ_BASE_URL ?? 'https://api.groq.com/openai/v1',
    apiKey: primaryKey,
    model: tier === 'lead' ? (process.env.GROQ_LEAD_MODEL ?? 'openai/gpt-oss-120b') : (process.env.GROQ_STANDARD_MODEL ?? 'llama-3.1-8b-instant'),
  };
  const fallbackKey = process.env.OPENROUTER_API_KEY ?? '';
  const fallbackModel = process.env.OPENROUTER_FREE_MODEL ?? '';
  const fallback = fallbackKey && fallbackModel ? { name: 'openrouter', baseUrl: process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1', apiKey: fallbackKey, model: fallbackModel } : undefined;
  return { primary, fallback };
}
