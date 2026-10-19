import test from 'node:test';
import assert from 'node:assert/strict';
import { loadRatingState, postponeRating, shouldPromptRating } from './ratingPrompt.ts';

test('first prompt after 6 counselor replies, only on a safe turn', () => {
  assert.equal(shouldPromptRating({ status: 'none' }, 5, 'safe'), false);
  assert.equal(shouldPromptRating({ status: 'none' }, 6, 'safe'), true);
  assert.equal(shouldPromptRating({ status: 'none' }, 9, 'concern'), false);
  assert.equal(shouldPromptRating({ status: 'none' }, 9, 'crisis'), false);
});

test('"later" asks once more after 12 replies, then never again', () => {
  const later = postponeRating({ status: 'none' }, 6);
  assert.deepEqual(later, { status: 'later', atCount: 6 });
  assert.equal(shouldPromptRating(later, 17, 'safe'), false);
  assert.equal(shouldPromptRating(later, 18, 'safe'), true);
  assert.deepEqual(postponeRating(later, 18), { status: 'done' });
  assert.equal(shouldPromptRating({ status: 'done' }, 100, 'safe'), false);
});

test('loadRatingState handles missing or broken values', () => {
  assert.deepEqual(loadRatingState(null), { status: 'none' });
  assert.deepEqual(loadRatingState('{broken'), { status: 'none' });
  assert.deepEqual(loadRatingState('{"status":"done"}'), { status: 'done' });
  assert.deepEqual(loadRatingState('{"status":"later","atCount":7}'), { status: 'later', atCount: 7 });
});
