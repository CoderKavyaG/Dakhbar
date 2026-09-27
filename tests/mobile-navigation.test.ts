import { test } from 'node:test';
import assert from 'node:assert/strict';
import { navigationItems, mobileNavigationItems } from '../src/lib/navigation';

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
