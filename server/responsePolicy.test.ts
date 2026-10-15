import test from 'node:test';
import assert from 'node:assert/strict';
import { avoidConsecutiveEmoji, resolveSafetyCheck } from './responsePolicy.ts';

test('avoidConsecutiveEmoji strips emoji only when the previous counselor reply had one', () => {
  const withEmoji = [
    { sender: 'counselor', text: '반가워! 🌱' },
    { sender: 'user', text: '진로 고민이야' },
  ];
  const withoutEmoji = [
    { sender: 'counselor', text: '반가워!' },
    { sender: 'user', text: '진로 고민이야' },
  ];
  assert.equal(avoidConsecutiveEmoji('하나씩 풀어 볼까? 🍌', withEmoji), '하나씩 풀어 볼까?');
  assert.equal(avoidConsecutiveEmoji('하나씩 풀어 볼까? 🍌', withoutEmoji), '하나씩 풀어 볼까? 🍌');
  assert.equal(avoidConsecutiveEmoji('그랬구나 💛 정말로', withEmoji), '그랬구나 정말로');
  assert.equal(avoidConsecutiveEmoji('괜찮아 🐾', undefined), '괜찮아 🐾');
  // 연속 호출에서도 정규식 상태가 꼬이지 않아야 함
  assert.equal(avoidConsecutiveEmoji('좋아 🌱', withEmoji), '좋아');
  assert.equal(avoidConsecutiveEmoji('좋아 🌱', withEmoji), '좋아');
});

test('resolveSafetyCheck never delays explicit crisis', () => {
  assert.deepEqual(
    resolveSafetyCheck({ finalRiskLevel: 'crisis', heuristicRiskLevel: 'crisis', modelSafetyCheck: true, modelOfferReferral: false }),
    { safetyCheck: false, shouldOfferReferral: true }
  );
  assert.deepEqual(
    resolveSafetyCheck({ finalRiskLevel: 'crisis', heuristicRiskLevel: 'safe', modelSafetyCheck: true, modelOfferReferral: false }),
    { safetyCheck: false, shouldOfferReferral: true }
  );
});

test('resolveSafetyCheck shows a check question instead of the referral card for indirect signals', () => {
  assert.deepEqual(
    resolveSafetyCheck({ finalRiskLevel: 'concern', heuristicRiskLevel: 'safe', modelSafetyCheck: true, modelOfferReferral: true }),
    { safetyCheck: true, shouldOfferReferral: false }
  );
});

test('resolveSafetyCheck keeps normal referral behavior otherwise', () => {
  assert.deepEqual(
    resolveSafetyCheck({ finalRiskLevel: 'concern', heuristicRiskLevel: 'concern', modelSafetyCheck: false, modelOfferReferral: undefined }),
    { safetyCheck: false, shouldOfferReferral: true }
  );
  assert.deepEqual(
    resolveSafetyCheck({ finalRiskLevel: 'safe', heuristicRiskLevel: 'safe', modelSafetyCheck: undefined, modelOfferReferral: false }),
    { safetyCheck: false, shouldOfferReferral: false }
  );
});
