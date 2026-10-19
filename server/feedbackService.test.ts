import test from 'node:test';
import assert from 'node:assert/strict';
import { listFeedback, maskPersonalInfo, parseFeedback } from './feedbackService.ts';

const NOW = new Date('2026-10-19T00:00:00Z');

test('parseFeedback accepts ratings 1~5 and feedback text', () => {
  assert.deepEqual(parseFeedback({ kind: 'rating', rating: 5, text: '좋아요', counselorId: 'dog' }, NOW), {
    kind: 'rating', rating: 5, text: '좋아요', counselorId: 'dog', at: NOW.toISOString(),
  });
  assert.deepEqual(parseFeedback({ kind: 'feedback', text: ' 답이 빨랐으면 ' }, NOW), {
    kind: 'feedback', rating: null, text: '답이 빨랐으면', counselorId: null, at: NOW.toISOString(),
  });
});

test('parseFeedback rejects invalid input', () => {
  assert.equal(typeof parseFeedback({ kind: 'rating', rating: 6 }), 'string');
  assert.equal(typeof parseFeedback({ kind: 'rating' }), 'string');
  assert.equal(typeof parseFeedback({ kind: 'feedback', text: '   ' }), 'string');
  assert.equal(typeof parseFeedback({ kind: 'other', text: 'x' }), 'string');
  assert.equal(typeof parseFeedback(null), 'string');
});

test('parseFeedback trims long text and drops unknown counselor ids', () => {
  const r = parseFeedback({ kind: 'feedback', text: 'a'.repeat(900), counselorId: 'tiger' }, NOW);
  assert.ok(typeof r !== 'string');
  assert.equal(r.text.length, 500);
  assert.equal(r.counselorId, null);
});

test('maskPersonalInfo hides phone numbers and long digit runs', () => {
  assert.equal(maskPersonalInfo('제 번호 010-1234-5678 이에요'), '제 번호 *** 이에요');
  assert.equal(maskPersonalInfo('학번 20261234'), '학번 ***');
  assert.equal(maskPersonalInfo('별 5개!'), '별 5개!');
});

test('listFeedback is disabled without a token and rejects wrong tokens', async () => {
  const saved = process.env.FEEDBACK_ADMIN_TOKEN;
  delete process.env.FEEDBACK_ADMIN_TOKEN;
  assert.equal((await listFeedback('Bearer x')).status, 404);
  process.env.FEEDBACK_ADMIN_TOKEN = 'secret';
  assert.equal((await listFeedback('Bearer wrong')).status, 401);
  assert.equal((await listFeedback(undefined)).status, 401);
  if (saved === undefined) delete process.env.FEEDBACK_ADMIN_TOKEN;
  else process.env.FEEDBACK_ADMIN_TOKEN = saved;
});
