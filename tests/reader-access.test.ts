import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isReaderProtectedPath, readerRouteStatus } from '../src/lib/reader-access';

test('anonymous readers can browse public editorial routes', () => {
  for (const route of ['/', '/search', '/stories/story-1', '/topics/openai', '/methodology']) {
    assert.equal(isReaderProtectedPath(route), false);
    assert.equal(readerRouteStatus(route, null), 200);
  }
});

test('Following and Brief require a reader session', () => {
  for (const route of ['/for-you', '/brief']) {
    assert.equal(isReaderProtectedPath(route), true);
    assert.equal(readerRouteStatus(route, null), 307);
    assert.equal(readerRouteStatus(route, 'user_1'), 200);
  }
});
