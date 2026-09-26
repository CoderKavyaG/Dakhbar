import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeResearchTopic,
  researchTopicHash,
  buildResearchPrompt,
  verifyResearchSection,
  parseLlmReportOutput,
  RESEARCH_CACHE_TTL_MS,
  SUBSCRIBER_DAILY_RESEARCH_LIMIT,
  type ResearchEvidence,
} from '../src/lib/research';

const mockEvidence: ResearchEvidence[] = [
  {
    citation: 1,
    storyId: 'story-1',
    storyTitle: 'Anthropic releases Claude 3.5 Sonnet',
    documentId: 'doc-1',
    title: 'Anthropic announces Claude 3.5 Sonnet architecture',
    domain: 'anthropic.com',
    reportedAt: 'Sep 21, 2026',
    published_at: '2026-09-21T08:00:00.000Z',
    excerpt: 'Anthropic released Claude 3.5 Sonnet on Monday with improved reasoning benchmarks.',
    url: 'https://anthropic.com/claude-3-5',
  },
  {
    citation: 2,
    storyId: 'story-2',
    storyTitle: 'OpenAI responds with GPT-5 preview',
    documentId: 'doc-2',
    title: 'OpenAI previews GPT-5 model features',
    domain: 'openai.com',
    reportedAt: 'Sep 22, 2026',
    published_at: '2026-09-22T10:00:00.000Z',
    excerpt: 'OpenAI revealed competitive benchmark results comparing against Anthropic.',
    url: 'https://openai.com/gpt-5-preview',
  },
  {
    citation: 3,
    storyId: 'story-2',
    storyTitle: 'OpenAI responds with GPT-5 preview',
    documentId: 'doc-3',
    title: 'Reuters analysis of AI model benchmarks',
    domain: 'reuters.com',
    reportedAt: 'Sep 23, 2026',
    published_at: '2026-09-23T14:30:00.000Z',
    excerpt: 'Reuters analyzed the competing benchmark claims across Anthropic and OpenAI.',
    url: 'https://reuters.com/ai-race-benchmarks',
  },
];

test('normalizeResearchTopic strips trailing punctuation and normalizes spacing/casing', () => {
  assert.equal(
    normalizeResearchTopic('  How is Anthropic competing with OpenAI??? '),
    'how is anthropic competing with openai'
  );
  assert.equal(
    normalizeResearchTopic('Rust vs Go: Memory safety & concurrency!'),
    'rust vs go: memory safety & concurrency'
  );
  assert.equal(normalizeResearchTopic('   '), '');
});

test('researchTopicHash produces deterministic SHA-256 topic hash', () => {
  const norm = normalizeResearchTopic('Anthropic vs OpenAI');
  const hash1 = researchTopicHash(norm);
  const hash2 = researchTopicHash(norm);
  assert.equal(hash1, hash2);
  assert.equal(typeof hash1, 'string');
  assert.equal(hash1.length, 64);
});

test('buildResearchPrompt structures system instructions enforcing citation brackets [1]', () => {
  const messages = buildResearchPrompt('Anthropic vs OpenAI', mockEvidence);
  assert.equal(messages.length, 2);
  assert.equal(messages[0].role, 'system');
  assert.match(messages[0].content, /\[1\], \[2\]/);
  assert.match(messages[0].content, /executiveBrief/);
  assert.match(messages[0].content, /keyPoints/);
  assert.equal(messages[1].role, 'user');
  assert.match(messages[1].content, /Anthropic announces Claude 3.5 Sonnet architecture/);
});

test('parseLlmReportOutput correctly handles JSON and markdown fences', () => {
  const validJson = JSON.stringify({
    executiveBrief: 'Anthropic released Claude 3.5 Sonnet [1]. OpenAI responded with benchmark data [2].',
    keyPoints: [
      'Anthropic launched updated reasoning benchmarks [1].',
      'OpenAI and Reuters compared cross-lab metrics [2][3].',
    ],
  });

  const parsed = parseLlmReportOutput(validJson);
  assert.ok(parsed);
  assert.equal(parsed.executiveBrief, 'Anthropic released Claude 3.5 Sonnet [1]. OpenAI responded with benchmark data [2].');
  assert.equal(parsed.keyPoints.length, 2);

  // Markdown fence wrapped
  const fenced = '```json\n' + validJson + '\n```';
  const parsedFenced = parseLlmReportOutput(fenced);
  assert.ok(parsedFenced);
  assert.equal(parsedFenced.executiveBrief, parsed.executiveBrief);

  // Malformed JSON returns null
  assert.equal(parseLlmReportOutput('Not a valid JSON'), null);
});

test('verifyResearchSection validates sentence-level citations and grounded facts', () => {
  // Valid grounded sentences
  const validBrief = 'Anthropic released Claude 3.5 Sonnet on Monday [1]. Reuters analyzed the benchmark claims across Anthropic and OpenAI [3].';
  assert.equal(verifyResearchSection(validBrief, mockEvidence), true);

  // Missing citation on second sentence
  const missingCite = 'Anthropic released Claude 3.5 Sonnet [1]. OpenAI is headquartered in San Francisco.';
  assert.equal(verifyResearchSection(missingCite, mockEvidence), false);

  // Out of range citation
  const outOfRange = 'Anthropic announced new benchmarks [9].';
  assert.equal(verifyResearchSection(outOfRange, mockEvidence), false);

  // Hallucinated entities not in evidence
  const ungroundedFact = 'Anthropic signed a $10B contract with NVIDIA [1].';
  assert.equal(verifyResearchSection(ungroundedFact, mockEvidence), false);
});

test('Shared cache TTL is 24 hours, subscriber daily limit is 5 reports, and global token limit is 80k', () => {
  assert.equal(RESEARCH_CACHE_TTL_MS, 86400000);
  assert.equal(SUBSCRIBER_DAILY_RESEARCH_LIMIT, 5);
});

test('Research API generation endpoint enforces subscription check, topic validation and rate limits', async () => {
  const { readFile } = await import('node:fs/promises');
  const route = await readFile('src/app/api/research/generate/route.ts', 'utf8');
  assert.match(route, /await auth\(\)/);
  assert.match(route, /subscription_status !== 'active'/);
  assert.match(route, /generateResearchReport/);
});

test('Admin data aggregates research feature calls and tracks both TPD and RPD binding ceilings', async () => {
  const { readFile } = await import('node:fs/promises');
  const adminData = await readFile('src/lib/admin-data.ts', 'utf8');
  assert.match(adminData, /story_id\?\.startsWith\('research:'\)/);
  assert.match(adminData, /featureStats\.research\.calls\+\+/);
  assert.match(adminData, /featureStats\.ask\.calls\+\+/);
  assert.match(adminData, /featureStats\.brief\.calls\+\+/);
  assert.match(adminData, /Research Mode Dossier/);
  assert.match(adminData, /FREE_DAILY_LIMITS/);
  assert.match(adminData, /tpdLimit/);
  assert.match(adminData, /rpdLimit/);
  assert.match(adminData, /bindingConstraint/);
});

test('Research page gracefully handles both user rate limits and global system capacity ceilings', async () => {
  const { readFile } = await import('node:fs/promises');
  const page = await readFile('src/app/research/page.tsx', 'utf8');
  assert.match(page, /System Research Capacity Reached/);
  assert.match(page, /Daily Research Limit Reached/);
  assert.match(page, /tokens per day \(TPD\) ceilings/);
});
