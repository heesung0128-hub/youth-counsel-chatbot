import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluateConversationRisk } from './conversationRisk.ts';

const u = (text: string) => ({ sender: 'user', text });
const c = (text: string) => ({ sender: 'counselor', text });

test('explicit crisis keyword is always crisis', () => {
  assert.deepEqual(evaluateConversationRisk('죽고 싶어', []), { riskLevel: 'crisis', needsSafetyCheck: false });
});

test('first indirect signal asks a safety check question instead of crisis', () => {
  assert.deepEqual(evaluateConversationRisk('다 그만하고 싶어. 내가 없어져도 아무도 모를 거야', []), {
    riskLevel: 'concern',
    needsSafetyCheck: true,
  });
});

test('repeated indirect signal in recent conversation becomes crisis', () => {
  const history = [u('그냥 다 그만하고 싶어'), c('혹시 사라지고 싶다는 생각까지 들어?'), u('모르겠어')];
  assert.equal(evaluateConversationRisk('내가 없어져도 아무도 모를 거야', history).riskLevel, 'crisis');
});

test('earlier crisis keyword keeps later messages at least concern', () => {
  const history = [u('죽고 싶다는 생각이 들어'), c('…'), u('응')];
  assert.deepEqual(evaluateConversationRisk('밥은 먹었어', history), { riskLevel: 'concern', needsSafetyCheck: false });
});

test('accumulated concern across recent messages is concern', () => {
  const history = [u('요즘 우울해'), c('…'), u('그냥 다 의미 없게 느껴져'), c('…')];
  assert.equal(evaluateConversationRisk('몇 달 됐어. 밥도 잘 안 먹혀', history).riskLevel, 'concern');
});

test('everyday phrases that look similar do not trigger a safety check', () => {
  for (const text of ['숙제 그만하고 싶어', '시험이 없어지면 좋겠다', '이 숙제 의미가 없어']) {
    assert.deepEqual(evaluateConversationRisk(text, []), { riskLevel: 'safe', needsSafetyCheck: false }, text);
  }
});

test('ordinary conversation stays safe and old messages fall out of the window', () => {
  assert.equal(evaluateConversationRisk('오늘 급식 맛있었어', []).riskLevel, 'safe');
  const old = [u('죽고 싶어'), u('a'), u('b'), u('c'), u('d')];
  assert.equal(evaluateConversationRisk('오늘 급식 맛있었어', old).riskLevel, 'safe');
});
