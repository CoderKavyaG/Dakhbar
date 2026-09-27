import {test} from 'node:test';
import assert from 'node:assert/strict';
import {storyDestination} from '../src/lib/story-evidence';

test('all stories link internally to universal story pages', () => {
  assert.equal(storyDestination('series', [{ url: 'https://example.com/a', content: null }, { url: 'https://example.com/b', content: null }]).external, false);
  assert.equal(storyDestination('single', [{ url: 'https://example.com/a', content: null }]).external, false);
});

