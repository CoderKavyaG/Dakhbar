import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPendingRelationships, type PendingReviewStory } from '../src/lib/pending-relationships';

const stories: PendingReviewStory[] = [{
  id: 'new-story',
  title: 'OpenAI and Anthropic face pacing lawsuit',
  documents: [{ similarity_score: 0.781 }],
  entities: [
    { entity_id: 'openai', entity: { name: 'OpenAI' } },
    { entity_id: 'anthropic', entity: { name: 'Anthropic' } },
  ],
  possibly_related_to: {
    id: 'candidate',
    title: 'Lawsuit alleges AI pacing agreement',
    entities: [
      { entity_id: 'openai', entity: { name: 'OpenAI' } },
      { entity_id: 'google', entity: { name: 'Google' } },
    ],
  },
}, {
  id: 'confirmed',
  title: 'A confirmed story',
  documents: [{ similarity_score: 1 }],
  entities: [],
  possibly_related_to: null,
}];

test('bulk review rows pair both headlines with shared evidence and score', () => {
  assert.deepEqual(buildPendingRelationships(stories), [{
    storyId: 'new-story',
    storyTitle: 'OpenAI and Anthropic face pacing lawsuit',
    candidateId: 'candidate',
    candidateTitle: 'Lawsuit alleges AI pacing agreement',
    similarity: 0.781,
    sharedEntities: ['OpenAI'],
  }]);
});

test('bulk review rows are sorted by similarity descending', () => {
  const lowerScore: PendingReviewStory = {
    ...stories[0],
    id: 'lower-story',
    title: 'Lower similarity candidate',
    documents: [{ similarity_score: 0.72 }],
  };
  assert.deepEqual(
    buildPendingRelationships([lowerScore, stories[0]]).map(item => item.similarity),
    [0.781, 0.72],
  );
});
