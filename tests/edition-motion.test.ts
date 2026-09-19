import { test } from 'node:test';
import assert from 'node:assert/strict';
import { clampRotation, rotationFromPointer } from '../src/lib/edition-motion';

test('edition rotation is bounded to eight degrees', () => {
  assert.equal(clampRotation(30), 8);
  assert.equal(clampRotation(-30), -8);
  assert.deepEqual(rotationFromPointer(0, 0, 100, 100), { rotateX: 8, rotateY: -8 });
  assert.deepEqual(rotationFromPointer(50, 50, 100, 100), { rotateX: 0, rotateY: 0 });
  assert.deepEqual(rotationFromPointer(100, 100, 100, 100), { rotateX: -8, rotateY: 8 });
});
