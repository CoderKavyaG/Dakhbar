// Consolidated Test Suite: 11-seo-design.test.ts
import assert from 'node:assert/strict';
import { readFile, stat } from 'node:fs/promises';
import { test } from 'node:test';
import robots from '../src/app/robots';
import sitemap from '../src/app/sitemap';
import { clampRotation, rotationFromPointer } from '../src/lib/edition-motion';
import { mobileNavigationItems, navigationItems } from '../src/lib/navigation';

// --- Section: seo-discoverability.test.ts ---
{
test('Story page source defines generateMetadata with OpenGraph, Twitter, and generic Article JSON-LD schema (not NewsArticle)', async () => {
  const storySource = await readFile('src/app/stories/[id]/page.tsx', 'utf8');
  assert.match(storySource, /export async function generateMetadata/);
  assert.match(storySource, /type:\s*['"]article['"]/);
  assert.match(storySource, /openGraph:\s*\{/);
  assert.match(storySource, /twitter:\s*\{/);
  assert.match(storySource, /application\/ld\+json/);
  assert.match(storySource, /'@type':\s*'Article'/);
  assert.doesNotMatch(storySource, /'@type':\s*'NewsArticle'/);
  assert.match(storySource, /citation:\s*reports\.map/);
  assert.match(storySource, /publisher:\s*\{/);
});

test('Topic page source defines generateMetadata with topic name, velocity, and OpenGraph tags', async () => {
  const topicSource = await readFile('src/app/topics/[slug]/page.tsx', 'utf8');
  assert.match(topicSource, /export async function generateMetadata/);
  assert.match(topicSource, /openGraph:\s*\{/);
  assert.match(topicSource, /twitter:\s*\{/);
  assert.match(topicSource, /Developer News & Velocity Trends/);
});

test('Research page source defines generateMetadata and Article JSON-LD for dossier synthesis', async () => {
  const researchSource = await readFile('src/app/research/page.tsx', 'utf8');
  assert.match(researchSource, /export async function generateMetadata/);
  assert.match(researchSource, /executiveBrief/);
  assert.match(researchSource, /Research Dossier/);
  assert.match(researchSource, /openGraph:\s*\{/);
  assert.match(researchSource, /twitter:\s*\{/);
  assert.match(researchSource, /application\/ld\+json/);
  assert.match(researchSource, /'@type':\s*'Article'/);
});

test('sitemap.xml generator includes static editorial routes, dynamic stories, and topics', async () => {
  const entries = await sitemap();
  assert.ok(Array.isArray(entries));
  assert.ok(entries.length >= 6);

  const urls = entries.map(e => e.url);
  assert.ok(urls.some(u => u.endsWith('/')));
  assert.ok(urls.some(u => u.endsWith('/why-this-isnt-ai-slop')));
  assert.ok(urls.some(u => u.endsWith('/methodology')));
  assert.ok(urls.some(u => u.endsWith('/topics')));
  assert.ok(urls.some(u => u.endsWith('/pricing')));
  assert.ok(urls.some(u => u.endsWith('/legal')));
  assert.ok(urls.some(u => u.endsWith('/privacy')));
  assert.ok(urls.some(u => u.endsWith('/terms')));
  assert.ok(urls.some(u => u.includes('/category/ai-companies')));
  assert.ok(urls.some(u => u.includes('/category/infrastructure')));
  assert.ok(urls.some(u => u.includes('/category/languages-tools')));
  assert.ok(urls.some(u => u.includes('/stories/')));
  assert.ok(urls.some(u => u.includes('/topics/')));
  // Verify expanded coverage exceeds previous 120 limit
  const storyCount = urls.filter(u => u.includes('/stories/')).length;
  assert.ok(storyCount > 120, `Expected sitemap story count > 120, got ${storyCount}`);
});

test('robots.txt generator allows public routes and disallows sensitive internal endpoints', () => {
  const config = robots();
  assert.ok(config.rules);
  const rules = Array.isArray(config.rules) ? config.rules[0] : config.rules;
  assert.equal(rules.userAgent, '*');
  const allowed = Array.isArray(rules.allow) ? rules.allow : [rules.allow];
  assert.ok(allowed.includes('/'));
  assert.ok(allowed.includes('/stories/'));
  assert.ok(allowed.includes('/topics/'));
  assert.ok(allowed.includes('/why-this-isnt-ai-slop'));

  const disallowed = Array.isArray(rules.disallow) ? rules.disallow : [rules.disallow];
  assert.ok(disallowed.includes('/admin'));
  assert.ok(disallowed.includes('/api/'));
  assert.ok(disallowed.includes('/saved'));

  assert.ok(config.sitemap?.includes('sitemap.xml'));
});

test('Category page source defines generateMetadata with category title and description', async () => {
  const categorySource = await readFile('src/app/category/[slug]/page.tsx', 'utf8');
  assert.match(categorySource, /export async function generateMetadata/);
  assert.match(categorySource, /getCategoryBySlug/);
  assert.match(categorySource, /openGraph:\s*\{/);
  assert.match(categorySource, /twitter:\s*\{/);
});

test('Topic page hero and metadata directly answer long-tail search intent (is [topic] trending)', async () => {
  const topicSource = await readFile('src/app/topics/[slug]/page.tsx', 'utf8');
  assert.match(topicSource, /Is \$\{name\} trending\?/);
  assert.match(topicSource, /Is \{topic\.entity\.name\} trending\?/);
  assert.match(topicSource, /velocity/i);
});

test('Bidirectional internal linking connects Categories, Topics, and Stories', async () => {
  const storySource = await readFile('src/app/stories/[id]/page.tsx', 'utf8');
  const topicSource = await readFile('src/app/topics/[slug]/page.tsx', 'utf8');
  const categorySource = await readFile('src/app/category/[slug]/page.tsx', 'utf8');

  // Story links to category and topic
  assert.match(storySource, /primaryCategory/);
  assert.match(storySource, /topicPath/);
  assert.match(storySource, /\/category\/\$\{primaryCategory\.slug\}/);

  // Topic links to parent category and contributing stories
  assert.match(topicSource, /getCategoryForEntity/);
  assert.match(topicSource, /\/category\/\$\{category\.slug\}/);
  assert.match(topicSource, /StoryCard/);

  // Category links to member topics and stories
  assert.match(categorySource, /topicPath/);
  assert.match(categorySource, /StoryCard/);
});
}

// --- Section: public-views.test.ts ---
{
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
}

// --- Section: phase4-pages.test.ts ---
{
test('pricing sells only implemented Phase 4 capabilities', async () => {
  const pricing = await readFile('src/app/pricing/page.tsx', 'utf8');
  assert.match(pricing, /Unlimited Following/);
  assert.match(pricing, /Morning source-linked email digest/);
  assert.doesNotMatch(pricing, /Developer Pulse|Research Mode|personalized Edition/);
  assert.match(pricing, /Manage subscription/);
  assert.match(pricing, /sandbox only/);
  assert.match(pricing, /reconcileCompletedCheckout/);
});

test('legal pages accurately disclose aggregation, processors, sandbox billing, and reader choices', async () => {
  const [terms, privacy, legal] = await Promise.all([
    readFile('src/app/terms/page.tsx', 'utf8'),
    readFile('src/app/privacy/page.tsx', 'utf8'),
    readFile('src/app/legal/page.tsx', 'utf8'),
  ]);
  assert.match(terms, /does not host or claim ownership/);
  assert.match(terms, /no refund policy for the current service/);
  assert.doesNotMatch(terms, /seven calendar days|Renewal payments are non-refundable/);
  assert.match(privacy, /Clerk processes authentication data/);
  assert.match(privacy, /Stripe processes checkout/);
  assert.match(privacy, /Resend processes/);
  assert.match(privacy, /do not sell personal data/);
  assert.match(privacy, /advertising cookies/);
  assert.match(legal, /no real transaction is processed/i);
});

test('the supplied brand mark is optimized and used across owned billing surfaces', async () => {
  const [asset, header, upgrade, pricing] = await Promise.all([
    stat('public/brand/dakhbar-reporter.png'),
    readFile('src/components/site-header.tsx', 'utf8'),
    readFile('src/components/upgrade-dialog.tsx', 'utf8'),
    readFile('src/app/pricing/page.tsx', 'utf8'),
  ]);
  assert.ok(asset.size > 1_000 && asset.size < 300_000);
  assert.match(header, /BrandMark/);
  assert.match(upgrade, /BrandMark/);
  assert.match(pricing, /BrandMark/);
});
}

// --- Section: mobile-navigation.test.ts ---
{
test('mobile navigation exposes every permitted route once without crowding the dock', () => {
  for (const signedIn of [false, true]) {
    const { primary, more } = mobileNavigationItems(signedIn);
    assert.ok(primary.length <= 4);
    assert.deepEqual([...primary, ...more].map(x => x.href).sort(), navigationItems(signedIn).map(x => x.href).sort());
    assert.equal(new Set([...primary, ...more].map(x => x.href)).size, primary.length + more.length);
  }
});

test('anonymous mobile readers never see personal routes and subscribers retain their Following tab entry', () => {
  assert.ok(![...mobileNavigationItems(false).primary, ...mobileNavigationItems(false).more].some(x => ['/brief', '/saved', '/for-you', '/?tab=following'].includes(x.href)));
  assert.ok(mobileNavigationItems(true).primary.some(x => x.href === '/?tab=following'));
  assert.ok(mobileNavigationItems(true).primary.some(x => x.href === '/saved'));
});
}

// --- Section: edition-motion.test.ts ---
{
test('edition rotation is bounded to eight degrees', () => {
  assert.equal(clampRotation(30), 8);
  assert.equal(clampRotation(-30), -8);
  assert.deepEqual(rotationFromPointer(0, 0, 100, 100), { rotateX: 8, rotateY: -8 });
  assert.deepEqual(rotationFromPointer(50, 50, 100, 100), { rotateX: 0, rotateY: 0 });
  assert.deepEqual(rotationFromPointer(100, 100, 100, 100), { rotateX: -8, rotateY: 8 });
});
}
