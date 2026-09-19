import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractEntityIds, type EntityDictionaryEntry } from '../src/lib/clustering/entities';

const entries: EntityDictionaryEntry[] = [
  { id: 'react', name: 'React', aliases: ['ReactJS', 'React.js'] },
  { id: 'postgres', name: 'PostgreSQL', aliases: ['Postgres'] },
  { id: 'go', name: 'Go', aliases: ['Golang', 'Go language'] },
  { id: 'cpp', name: 'C++', aliases: ['cpp'] },
];

test('extracts exact names and aliases case-insensitively', () => {
  assert.deepEqual(extractEntityIds('ReactJS meets POSTGRES', null, entries), ['react', 'postgres']);
});
test('does not match aliases inside larger words', () => {
  assert.deepEqual(extractEntityIds('Google reacts to a goal and we should go now', null, entries), []);
});
test('supports punctuation-bearing entity names and deduplicates matches', () => {
  assert.deepEqual(extractEntityIds('C++ and cpp tooling', 'C++', entries), ['cpp']);
});
