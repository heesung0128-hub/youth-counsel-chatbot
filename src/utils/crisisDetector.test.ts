import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateCrisisSignals } from './crisisDetector.ts';

test('evaluateCrisisSignals detects high-risk crisis keywords', () => {
  const result = evaluateCrisisSignals('요즘 너무 힘들어서 죽고 싶다는 생각이 자꾸 들어요');
  assert.equal(result.riskLevel, 'crisis');
  assert.equal(result.shouldPinEmergencyCard, true);
  assert.ok(result.matchedKeywords.length > 0);
  assert.ok(result.matchedKeywords.some((k) => k.includes('죽고')));
});

test('evaluateCrisisSignals detects moderate concern keywords', () => {
  const result = evaluateCrisisSignals('요즘 우울해서 공부에 집중이 안 돼요');
  assert.equal(result.riskLevel, 'concern');
  assert.equal(result.shouldPinEmergencyCard, false);
  assert.ok(result.matchedKeywords.includes('우울해'));
});

test('evaluateCrisisSignals returns safe for everyday conversation', () => {
  const result = evaluateCrisisSignals('오늘 급식 맛있었어. 내일 시험 잘 볼 수 있을까?');
  assert.equal(result.riskLevel, 'safe');
  assert.equal(result.shouldPinEmergencyCard, false);
  assert.equal(result.matchedKeywords.length, 0);
});

test('evaluateCrisisSignals ignores spacing variations', () => {
  assert.equal(evaluateCrisisSignals('죽 고 싶 어').riskLevel, 'crisis');
  assert.equal(evaluateCrisisSignals('그냥 없어지고싶다').riskLevel, 'crisis');
  assert.equal(evaluateCrisisSignals('살고 싶지 않아').riskLevel, 'crisis');
});

test('evaluateCrisisSignals handles non-string input', () => {
  assert.equal(evaluateCrisisSignals(undefined as unknown as string).riskLevel, 'safe');
});
