import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const publicRoutes = [
  'src/app/page.tsx',
  'src/app/search/page.tsx',
  'src/app/stories/[id]/page.tsx',
  'src/app/methodology/page.tsx',
  'src/app/topics/[slug]/page.tsx',
  'src/app/for-you/page.tsx',
  'src/app/brief/page.tsx',
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

test('public evidence uses elapsed-time timelines and never exposes match percentages', async () => {
  const [timeline, detail, css] = await Promise.all([
    readFile('src/components/source-timeline.tsx', 'utf8'),
    readFile('src/app/stories/[id]/page.tsx', 'utf8'),
    readFile('src/app/globals.css', 'utf8'),
  ]);
  assert.match(timeline, /sourceTimelinePoints/);
  assert.doesNotMatch(timeline + detail, /confidence|% match|similarity_score/);
  assert.doesNotMatch(css, /corroboration-bar|confidence-badge/);
});

test('signature interactions explicitly respect reduced motion', async () => {
  const [edition, methodology, css] = await Promise.all([
    readFile('src/components/today-edition.tsx', 'utf8'),
    readFile('src/components/methodology-timeline.tsx', 'utf8'),
    readFile('src/app/globals.css', 'utf8'),
  ]);
  assert.match(edition, /prefers-reduced-motion: reduce/);
  assert.match(methodology, /prefers-reduced-motion: reduce/);
  assert.match(css, /@media \(prefers-reduced-motion: reduce\)/);
  assert.match(edition, /preserve-3d|edition-stack/);
});

test('Front Page and Search share the exact StoryCard component', async () => {
  const [frontPage, searchPage] = await Promise.all([
    readFile('src/app/page.tsx', 'utf8'),
    readFile('src/app/search/page.tsx', 'utf8'),
  ]);
  assert.match(frontPage, /<StoryCard/);
  assert.match(searchPage, /<StoryCard/);
});

test('Front Page selection remains independent of reader Following state', async () => {
  const [frontPage, readerFeed] = await Promise.all([
    readFile('src/lib/front-page.ts', 'utf8'),
    readFile('src/lib/reader-data.ts', 'utf8'),
  ]);
  assert.doesNotMatch(frontPage, /Following|following|userId|UserVisit/);
  assert.match(readerFeed, /getForYouStories/);
});
