import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildCorroborationLead, distinctCorroborationSources, sourceTimelinePoints } from '../src/lib/corroboration';

const at = (value: string) => new Date(value);

test('single-source lead is complete and literal', () => {
  assert.equal(buildCorroborationLead([
    { domain: 'wsj.com', publishedAt: at('2026-09-19T03:47:00Z') },
  ], 'UTC'), 'Reported by wsj.com at 3:47 AM.');
});

test('two-source lead names the first confirmation and elapsed time', () => {
  assert.equal(buildCorroborationLead([
    { domain: 'reuters.com', publishedAt: at('2026-09-19T07:10:00Z') },
    { domain: 'wsj.com', publishedAt: at('2026-09-19T03:47:00Z') },
  ], 'UTC'), 'First reported by wsj.com at 3:47 AM; confirmed by reuters.com 3h 23m later.');
});

test('three-plus-source lead pluralizes additional reporting without inventing detail', () => {
  assert.equal(buildCorroborationLead([
    { domain: 'a.dev', publishedAt: at('2026-09-19T01:00:00Z') },
    { domain: 'b.dev', publishedAt: at('2026-09-19T02:00:00Z') },
    { domain: 'c.dev', publishedAt: at('2026-09-19T03:00:00Z') },
    { domain: 'd.dev', publishedAt: at('2026-09-19T04:00:00Z') },
  ], 'UTC'), 'First reported by a.dev at 1:00 AM; confirmed by b.dev 1h later, with 2 additional sources reporting afterward.');
});

test('timeline dots use true proportional elapsed time', () => {
  const points = sourceTimelinePoints([
    { domain: 'first.dev', publishedAt: at('2026-09-19T00:00:00Z') },
    { domain: 'middle.dev', publishedAt: at('2026-09-19T01:00:00Z') },
    { domain: 'last.dev', publishedAt: at('2026-09-19T04:00:00Z') },
  ]);
  assert.deepEqual(points.map(point => point.position), [0, 25, 100]);
  assert.deepEqual(points.map(point => point.elapsedLabel), ['first report', '1h later', '4h later']);
});

test('source grouping is domain-based and keeps the earliest report', () => {
  const grouped = distinctCorroborationSources([
    { url: 'https://www.example.com/one', sourceName: 'hn', publishedAt: at('2026-09-19T02:00:00Z') },
    { url: 'https://example.com/two', sourceName: 'hn', publishedAt: at('2026-09-19T01:00:00Z') },
  ]);
  assert.equal(grouped.length, 1);
  assert.equal(grouped[0].publishedAt.toISOString(), '2026-09-19T01:00:00.000Z');
});
