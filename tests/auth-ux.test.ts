import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const read = (path: string) => readFile(path, 'utf8');

test('reader sign-in entry points use Clerk modal and replay a pending follow', async () => {
  const [join, follow, css] = await Promise.all([
    read('src/components/join-us-button.tsx'),
    read('src/components/follow-toggle-client.tsx'),
    read('src/app/globals.css'),
  ]);
  assert.match(join, /SignInButton mode="modal"/);
  assert.match(join, />Join us</);
  assert.match(follow, /openSignIn/);
  assert.match(follow, /awaitingSignIn/);
  assert.match(follow, /sessionStorage\.setItem\(PENDING_FOLLOW_KEY/);
  assert.match(follow, /sessionStorage\.removeItem\(PENDING_FOLLOW_KEY/);
  assert.match(follow, /submit\('follow'\)/);
  assert.match(css, /\.cl-modalBackdrop/);
  assert.match(css, /backdrop-filter:\s*blur/);
});

test('signed-out navigation hides personalized routes and Brief hides its badge on visit', async () => {
  const [header, briefLink] = await Promise.all([
    read('src/components/site-header.tsx'),
    read('src/components/brief-nav-link.tsx'),
  ]);
  assert.match(header, /userId && <Link href="\/for-you">Following<\/Link>/);
  assert.match(header, /userId && <BriefNavLink/);
  assert.doesNotMatch(header, /href="\/sign-in"/);
  assert.match(briefLink, /pathname !== '\/brief'/);
  assert.match(briefLink, /count === 1 \? 'story' : 'stories'/);
});

test('ordinary story cards expose a follow control for every entity tag', async () => {
  const card = await read('src/components/story-card.tsx');
  assert.match(card, /story\.entities\[0\][\s\S]*<EntityFollowControl/);
  assert.match(card, /story\.entities\.slice\(1\)\.map/);
  assert.doesNotMatch(card, /slice\(1,\s*3\)/);
});
