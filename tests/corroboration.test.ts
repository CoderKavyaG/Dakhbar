import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCorroborationLead, confidencePercent, distinctCorroborationSources } from '../src/lib/corroboration';

const at = (iso: string) => new Date(iso);

test('single-source lead is complete and literal', () => {
  assert.equal(buildCorroborationLead([
    { domain: 'wsj.com', publishedAt: at('2026-09-19T03:47:00Z'), confidence: 100 },
  ], 'UTC'), 'Reported by wsj.com at 3:47 AM.');
});

test('two-source lead names the first confirmation and elapsed time', () => {
  assert.equal(buildCorroborationLead([
    { domain: 'reuters.com', publishedAt: at('2026-09-19T07:10:00Z'), confidence: 94 },
    { domain: 'wsj.com', publishedAt: at('2026-09-19T03:47:00Z'), confidence: 100 },
  ], 'UTC'), 'First reported by wsj.com at 3:47 AM; confirmed by reuters.com 3h 23m later.');
});

test('three-plus-source lead pluralizes additional reporting without inventing detail', () => {
  assert.equal(buildCorroborationLead([
    { domain: 'a.dev', publishedAt: at('2026-09-19T01:00:00Z'), confidence: 100 },
    { domain: 'b.dev', publishedAt: at('2026-09-19T01:45:00Z'), confidence: 93 },
    { domain: 'c.dev', publishedAt: at('2026-09-19T02:00:00Z'), confidence: 89 },
    { domain: 'd.dev', publishedAt: at('2026-09-19T03:00:00Z'), confidence: 87 },
  ], 'UTC'), 'First reported by a.dev at 1:00 AM; confirmed by b.dev 45m later, with 2 additional sources reporting afterward.');
});

test('source grouping is domain-based and confidence is a bounded percentage', () => {
  const grouped = distinctCorroborationSources([
    { url: 'https://www.example.com/one', sourceName: 'hn', publishedAt: at('2026-09-19T02:00:00Z'), similarity: 0.912 },
    { url: 'https://example.com/two', sourceName: 'hn', publishedAt: at('2026-09-19T01:00:00Z'), similarity: 1 },
  ]);
  assert.deepEqual(grouped, [{ domain: 'example.com', publishedAt: at('2026-09-19T01:00:00Z'), confidence: 100 }]);
  assert.equal(confidencePercent(1.2), 100);
  assert.equal(confidencePercent(-1), 0);
});
