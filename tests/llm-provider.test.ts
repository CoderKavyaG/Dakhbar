import { test } from 'node:test';
import assert from 'node:assert/strict';
import { completeWithFallback } from '../src/lib/llm/provider';

const primary = { name: 'groq', baseUrl: 'https://groq.test/v1', apiKey: 'test', model: 'llama' };
const fallback = { name: 'openrouter', baseUrl: 'https://router.test/v1', apiKey: 'test', model: 'model:free' };

test('OpenAI-compatible provider falls back after primary 429', async () => {
  const calls: string[] = [];
  const fetchImpl = (async (url: string | URL | Request) => {
    calls.push(String(url));
    if (String(url).includes('groq')) return new Response('{}', { status: 429 });
    return Response.json({ choices: [{ message: { content: 'Grounded copy.' } }], usage: { prompt_tokens: 12, completion_tokens: 4 } });
  }) as typeof fetch;
  const result = await completeWithFallback({ messages: [{ role: 'user', content: 'facts' }], primary, fallback, fetchImpl });
  assert.equal(result.provider, 'openrouter');
  assert.equal(result.fallbackTriggered, true);
  assert.equal(result.content, 'Grounded copy.');
  assert.deepEqual(calls, ['https://groq.test/v1/chat/completions', 'https://router.test/v1/chat/completions']);
  assert.equal(result.attempts[0].errorCode, '429');
});
