import { test } from 'node:test';
import assert from 'node:assert/strict';
import { answerStoryQuestion, askQuestionHash, citationsAreValid, normalizeAskQuestion, verifyStoryAnswer, type AskEvidence, type StoryAskDependencies } from '../src/lib/story-ask';
import type { LlmAttempt } from '../src/lib/llm/provider';

const evidence: AskEvidence[] = [
  { citation: 1, title: 'OpenAI announces a new developer API', domain: 'openai.com', reportedAt: '2026-09-22T10:00:00.000Z', excerpt: 'OpenAI announced the API on Tuesday.', url: 'https://openai.com/news' },
  { citation: 2, title: 'Reuters confirms OpenAI API launch', domain: 'reuters.com', reportedAt: '2026-09-22T11:00:00.000Z', excerpt: 'Reuters confirmed the launch details.', url: 'https://reuters.com/technology' },
];

const lawsuitEvidence: AskEvidence[] = [
  { citation: 1, title: 'Lawsuit Accuses Anthropic, OpenAI, SpaceXAI, Google of AI Pacing Collusion', domain: 'thehill.com', reportedAt: '2026-09-21T08:00:00.000Z', excerpt: 'thehill.com', url: 'https://thehill.com/1' },
  { citation: 2, title: 'Anthropic, OpenAI, SpaceXAI, Google sued over call to pace AI development', domain: 'politico.com', reportedAt: '2026-09-21T08:10:00.000Z', excerpt: 'politico.com', url: 'https://politico.com/2' },
  { citation: 3, title: 'Lawsuit says Anthropic, OpenAI and others made illegal agreement on AI slowdown', domain: 'apnews.com', reportedAt: '2026-09-21T08:20:00.000Z', excerpt: 'apnews.com', url: 'https://apnews.com/3' },
  { citation: 4, title: 'Lawsuit: Illegal Agreement of Anthropic, OpenAI, SpaceXAI, Google on AI Slowdown', domain: 'independent.co.uk', reportedAt: '2026-09-21T08:30:00.000Z', excerpt: 'Anthropic CEO acknowledged potential antitrust hurdles', url: 'https://independent.co.uk/4' },
  { citation: 5, title: 'Lawsuit: Anthropic, OpenAI, SpaceXAI and Google made illegal slowdown agreement', domain: 'pbs.org', reportedAt: '2026-09-21T08:40:00.000Z', excerpt: 'The lawsuit argues that the leading AI companies violated antitrust laws when they agreed to coordinate slowdown efforts, and that doing so would reduce the value consumers get for paid AI subscriptions.', url: 'https://pbs.org/5' },
];

const attempt: LlmAttempt = { provider: 'groq', model: 'gpt-oss-20b', inputTokens: 20, outputTokens: 18, fallbackTriggered: false, content: 'OpenAI announced the developer API. [1]' };

function mocked(answer: string | null, cached: string | null = null) {
  let calls = 0, logs = 0;
  const deps: StoryAskDependencies = {
    cached: async () => cached,
    complete: async messages => {
      calls++;
      assert.match(messages[1].content, /OpenAI announces a new developer API/);
      return { content: answer ?? '', provider: 'groq', model: 'gpt-oss-20b', attempts: [attempt] };
    },
    log: async () => { logs++; },
  };
  return { deps, calls: () => calls, logs: () => logs };
}

test('Ask accepts a source-cited answer whose names and numbers trace to this story', async () => {
  const m = mocked('OpenAI announced the developer API. [1]');
  const result = await answerStoryQuestion({ storyId: 'story-1', question: ' What did OpenAI announce? ', evidence }, m.deps);
  assert.equal(result.generated, true);
  assert.equal(result.answer, 'OpenAI announced the developer API. [1]');
  assert.equal(m.logs(), 1);
});

test('Ask withholds invented facts and leaves raw evidence as the fallback', async () => {
  const m = mocked('Microsoft shipped version 4. [1]');
  const result = await answerStoryQuestion({ storyId: 'story-1', question: 'What happened?', evidence }, m.deps);
  assert.equal(result.generated, false);
  assert.equal(result.answer, null);
  assert.equal(result.reason, 'grounding_mismatch');
  assert.equal(m.logs(), 1);
});

test('story and normalized question cache avoids another provider request', async () => {
  const normalized = normalizeAskQuestion(' WHAT did OpenAI announce??? ');
  assert.equal(normalized, 'what did openai announce');
  const m = mocked(null, 'OpenAI announced the developer API. [1]');
  const result = await answerStoryQuestion({ storyId: 'story-1', question: 'WHAT did OpenAI announce?', evidence }, m.deps);
  assert.equal(result.inputHash, askQuestionHash(normalized));
  assert.equal(result.cached, true);
  assert.equal(m.calls(), 0);
  assert.equal(m.logs(), 0);
});

test('a cached answer is revalidated against the current evidence before reuse', async () => {
  const m = mocked('OpenAI announced the developer API. [1]', 'Microsoft shipped version 4. [1]');
  const result = await answerStoryQuestion({ storyId: 'story-1', question: 'What did OpenAI announce?', evidence }, m.deps);
  assert.equal(result.cached, false);
  assert.equal(result.generated, true);
  assert.equal(m.calls(), 1);
});

test('every answer sentence cites a valid source from the scoped story', () => {
  assert.equal(citationsAreValid('OpenAI announced it. [1]', 2), true);
  assert.equal(citationsAreValid('OpenAI announced it [1].', 2), true);
  assert.equal(citationsAreValid('OpenAI announced it. [3]', 2), false);
  assert.equal(citationsAreValid('OpenAI announced it. No source is cited.', 2), false);
  assert.equal(citationsAreValid('OpenAI announced it. [1] Microsoft confirmed it. [2]', 2), true);
  assert.equal(citationsAreValid('OpenAI announced it [1]. Microsoft confirmed it [2].', 2), true);
  assert.equal(citationsAreValid('OpenAI announced it. [1] Microsoft confirmed it.', 2), false);
  assert.equal(citationsAreValid('OpenAI announced it. Microsoft confirmed it [2].', 2), false);
  assert.equal(verifyStoryAnswer('OpenAI announced the developer API. [1]', evidence), true);
  assert.equal(verifyStoryAnswer('OpenAI announced the developer API [1].', evidence), true);
  assert.equal(verifyStoryAnswer('Microsoft announced the developer API. [1]', evidence), false);
});

test('real Groq model output fixtures validate correctly across pre- and post-punctuation conventions', () => {
  // Real Groq output fixture 1 (pre-punctuation form on all sentences):
  const groqOutput1 = 'The lawsuit accuses Anthropic, OpenAI, SpaceXAI and Google of illegally colluding to slow AI development, alleging an antitrust‑violating agreement to pace progress [1][2][3][4][5]. The plaintiffs have sued those four companies for the alleged coordination that would reduce consumer value in paid AI services [1][2][3][4][5].';
  assert.equal(citationsAreValid(groqOutput1, 5), true);
  assert.equal(verifyStoryAnswer(groqOutput1, lawsuitEvidence), true);

  // Real Groq output fixture 2 (post-punctuation form):
  const groqOutput2 = 'The evidence does not provide details on how OpenAI was broken into. [1][2][3][4]';
  assert.equal(citationsAreValid(groqOutput2, 4), true);

  // Real Groq output fixture 3 (mixed multiple citations):
  const groqOutput3 = 'Anthropic and OpenAI were sued over AI pacing [1][2]. The filing cites antitrust concerns [3][4].';
  assert.equal(citationsAreValid(groqOutput3, 4), true);
  assert.equal(verifyStoryAnswer(groqOutput3, lawsuitEvidence), true);
});

test('Ask endpoint enforces the active subscription, independent sources, and shared LlmCall logging', async () => {
  const { readFile } = await import('node:fs/promises');
  const route = await readFile('src/app/api/stories/[id]/ask/route.ts', 'utf8');
  assert.match(route, /await auth\(\)/);
  assert.match(route, /subscription_status !== 'active'/);
  assert.match(route, /countIndependentSources\(reports\) < 1/);
  assert.match(route, /where: \{ story_id: id, input_hash: inputHash/);
  assert.match(route, /db\.llmCall\.createMany/);
  assert.match(route, /input_tokens: attempt\.inputTokens/);
  assert.match(route, /fallback_triggered: attempt\.fallbackTriggered/);
});
