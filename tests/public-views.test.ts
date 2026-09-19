import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const publicRoutes = [
  'src/app/page.tsx',
  'src/app/search/page.tsx',
  'src/app/stories/[id]/page.tsx',
  'src/app/methodology/page.tsx',
];

test('public routes never render internal ranking decimals or generic eyebrow patterns', async () => {
  const renderedSource = (await Promise.all(publicRoutes.map(path => readFile(path, 'utf8')))).join(String.fromCharCode(10));
  assert.doesNotMatch(renderedSource, /significance_score|toFixed/);
  assert.doesNotMatch(renderedSource, /score\s+[0-9{]|relevance\s+\{/i);
  assert.doesNotMatch(renderedSource, /className="kicker"| · /);
});

test('theme exposes editorial and developer-data tokens with a dark variant', async () => {
  const [css, layout] = await Promise.all([
    readFile('src/app/globals.css', 'utf8'),
    readFile('src/app/layout.tsx', 'utf8'),
  ]);
  assert.match(css, /--paper:/);
  assert.match(css, /--ink:/);
  assert.match(css, /--data:/);
  assert.match(css, /@theme inline/);
  assert.match(css, /[.]dark {/);
  assert.match(css, /font-variant-numeric: tabular-nums/);
  assert.doesNotMatch(css, /Cambria|Nirmala UI/);
  for (const font of ['Newsreader', 'IBM_Plex_Sans', 'IBM_Plex_Mono', 'Martel']) assert.match(layout, new RegExp(font));
});
