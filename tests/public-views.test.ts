import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const publicRoutes = [
  'src/app/page.tsx',
  'src/app/search/page.tsx',
  'src/app/stories/[id]/page.tsx',
  'src/app/methodology/page.tsx',
];

test('public routes never render internal ranking or similarity numbers', async () => {
  const renderedSource = (await Promise.all(publicRoutes.map(path => readFile(path, 'utf8')))).join(String.fromCharCode(10));
  assert.doesNotMatch(renderedSource, /significance_score|similarity_score|toFixed/);
  assert.doesNotMatch(renderedSource, /score\s+[0-9{]|relevance\s+\{/i);
});

test('theme exposes newsprint tokens and a dark variant through Tailwind', async () => {
  const css = await readFile('src/app/globals.css', 'utf8');
  assert.match(css, /--newsprint:/);
  assert.match(css, /--ink:/);
  assert.match(css, /--signal:/);
  assert.match(css, /@theme inline/);
  assert.match(css, /[.]dark {/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
});

