import { test } from 'node:test';
import assert from 'node:assert/strict';
import { FRONT_PAGE_LIMIT, selectEligibleFrontPageStories } from '../src/lib/front-page';

test('Front Page selection excludes zero-entity stories and caps the edition', () => {
  const zeroEntity = { id: 'off-topic', entities: [] };
  const relevant = Array.from({ length: 24 }, (_, index) => ({ id: 'relevant-' + index, entities: [{ id: 'entity' }] }));
  const selected = selectEligibleFrontPageStories([zeroEntity, ...relevant]);

  assert.equal(selected.length, FRONT_PAGE_LIMIT);
  assert.equal(selected.some(story => story.id === zeroEntity.id), false);
  assert.ok(selected.every(story => story.entities.length >= 1));
});
