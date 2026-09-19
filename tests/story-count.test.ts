import { test } from 'node:test';
import assert from 'node:assert/strict';
import { storyCountLabel } from '../src/lib/story-count';

test('story result counts pluralize correctly', () => {
  assert.equal(storyCountLabel(0), '0 stories');
  assert.equal(storyCountLabel(1), '1 story');
  assert.equal(storyCountLabel(2), '2 stories');
});
