import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { storyDek } from '../src/lib/story-evidence';

test('StoryCard source enforces pull-quote treatment for stories without an image and real image for stories with one', async () => {
  const source = await readFile('src/components/story-card.tsx', 'utf8');

  // Confirms the conditional pull-quote rendering when no image is present
  assert.match(source, /!image \? \(/, 'Must branch on !image for pull-quote');
  assert.match(source, /className="story-card-pullquote"/, 'Must render story-card-pullquote');
  assert.match(source, /className="pullquote-mark"/, 'Must render decorative quotation mark');
  assert.match(source, /className="pullquote-text"/, 'Must render pullquote-text');
  assert.match(source, /className="pullquote-attribution"/, 'Must render pullquote attribution cite');
  assert.match(source, /!image \? 'story-card-text-only' : ''/, 'Must apply story-card-text-only class when !image');

  // Confirms cards with images keep real image treatment
  assert.match(source, /\{image && \([\s\S]*?<StoryImage/, 'Must render StoryImage when image exists');
});

test('StoryCard surfaces early evidence signal and new-since-visit retention highlight', async () => {
  const source = await readFile('src/components/story-card.tsx', 'utf8');

  // Early evidence signal
  assert.match(source, /card-evidence-pill/, 'Must include card-evidence-pill in meta strip');
  assert.match(source, /sources verified/, 'Must display verified sources count for corroborated stories');
  assert.match(source, /Primary report/, 'Must display primary report indicator for single-source stories');
  assert.match(source, /badge-corroborated/, 'Must style footer badge for corroborated stories');

  // Retention loop: new since visit
  assert.match(source, /isNewSinceVisit\?: boolean/, 'Must accept isNewSinceVisit prop');
  assert.match(source, /card-new-arrival-tag/, 'Must render card-new-arrival-tag when new since visit');
  assert.match(source, /story-card-new-arrival/, 'Must apply story-card-new-arrival class to card');
});

test('storyDek extracts real excerpt content from evidence for pull-quote rendering', () => {
  const documentWithOg = {
    url: 'https://dev.to/example',
    content: 'Full body content with rich technical substance and detailed architecture.',
    og_description: 'An authoritative technical announcement about database internals and query optimizations.',
  };

  const dek = storyDek(documentWithOg, 260);
  assert.equal(dek.kind, 'excerpt');
  assert.equal(dek.text, 'An authoritative technical announcement about database internals and query optimizations.');

  const documentTextOnly = {
    url: 'https://dev.to/example-no-og',
    content: 'The core engine enforces fail-closed state machines across distributed storage clusters.',
    og_description: null,
  };

  const dek2 = storyDek(documentTextOnly, 260);
  assert.equal(dek2.kind, 'excerpt');
  assert.equal(dek2.text, 'The core engine enforces fail-closed state machines across distributed storage clusters.');
});

test('globals.css defines distinctive editorial pull-quote and early evidence styling', async () => {
  const css = await readFile('src/app/globals.css', 'utf8');

  assert.match(css, /\.story-card-pullquote \{/, 'Must define .story-card-pullquote styles');
  assert.match(css, /border-left: 2\.5px solid var\(--data\)/, 'Must have distinct border rule accent');
  assert.match(css, /\.pullquote-text \{/, 'Must define .pullquote-text styles');
  assert.match(css, /font-style: italic/, 'Pull-quote text must be italic');
  assert.match(css, /\.card-evidence-pill/, 'Must define .card-evidence-pill styles');
  assert.match(css, /\.pulse-sparkline/, 'Must define .pulse-sparkline styles');
  assert.match(css, /\.card-new-arrival-tag/, 'Must define .card-new-arrival-tag styles');
});
