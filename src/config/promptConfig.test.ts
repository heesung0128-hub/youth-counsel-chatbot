import test from 'node:test';
import assert from 'node:assert/strict';
import { buildSystemPrompt, COUNSELOR_PROFILES, getLocalFallbackResponse } from './promptConfig.ts';
import type { CounselorId } from '../types.ts';

const IDS: CounselorId[] = ['cat', 'dog', 'monkey'];
// 문장 끝 존댓말 어미 (반말 통일 규칙 위반 감지)
const POLITE_ENDING = /(요|세요|습니다|니다)[.?!\s]*($|[.?!])/m;

test('buildSystemPrompt includes only the active character voice guide', () => {
  for (const id of IDS) {
    const prompt = buildSystemPrompt(id);
    const own = COUNSELOR_PROFILES[id];
    assert.ok(prompt.includes(own.sampleLine), `${id} sample line missing`);
    for (const rule of own.voiceGuide) assert.ok(prompt.includes(rule));
    for (const other of IDS.filter((o) => o !== id)) {
      assert.ok(!prompt.includes(COUNSELOR_PROFILES[other].sampleLine), `${id} prompt leaks ${other}`);
    }
  }
});

test('system prompt sets 반말 and an off-topic rule', () => {
  const prompt = buildSystemPrompt('cat');
  assert.ok(prompt.includes('다정한 반말'));
  assert.ok(!prompt.includes('해요체'));
  assert.ok(prompt.includes('[상담과 관계없는 요청 - 두 가지로 구분]'));
  for (const header of ['[학생이 원하는 것을 먼저 따르기 - 자율성 존중]', '[마음을 단정하지 않기 - 독심술 금지]', '[상담 대화 단계 - 조언은 순서와 허락을 지키기]', '[학생이 거부하면 조언을 멈추기]', '[같은 조언(전략) 반복 금지]', '[실제 상황을 먼저 확인하기]']) {
    assert.ok(prompt.includes(header), header);
  }
  assert.ok(prompt.includes('[답변 길이 - 상황에 맞게 짧게]'));
  assert.ok(prompt.includes('[표현 반복 금지 - 최근 대화 확인]'));
  assert.ok(!prompt.includes('2~4문장'));
});

test('character sample lines and greetings use 반말', () => {
  for (const id of IDS) {
    const p = COUNSELOR_PROFILES[id];
    assert.doesNotMatch(p.sampleLine, POLITE_ENDING, `${id} sampleLine`);
    assert.doesNotMatch(p.greetingMessage, POLITE_ENDING, `${id} greeting`);
  }
});

test('local fallback responses use 반말 for every risk level and character', () => {
  for (const id of IDS) {
    for (const [risk, msg] of [
      ['crisis', '죽고 싶어'],
      ['concern', '우울해'],
      ['safe', '고민이 있어'],
      ['safe', '오늘 급식 맛있었어'],
    ] as const) {
      const res = getLocalFallbackResponse(id, msg, risk);
      for (const sentence of res.message.split(/(?<=[.?!])\s+/)) {
        assert.doesNotMatch(sentence, POLITE_ENDING, `${id}/${risk}: ${sentence}`);
      }
    }
  }
});

test('each character has a calm crisis message with 1388 and 109 in 반말', () => {
  for (const id of IDS) {
    const msg = COUNSELOR_PROFILES[id].crisisMessage;
    assert.ok(msg.includes('1388') && msg.includes('109'), `${id} crisis numbers`);
    assert.doesNotMatch(msg, /[!🐾🌙🐶💛🌱🍌]/u, `${id} crisis message should be calm`);
    for (const sentence of msg.split(/(?<=[.?!])\s+/)) {
      assert.doesNotMatch(sentence, POLITE_ENDING, `${id}: ${sentence}`);
    }
    assert.equal(getLocalFallbackResponse(id, '죽고 싶어', 'crisis').message, msg);
  }
});

test('violence or abuse crisis points to 112·117·1388, not only 109', () => {
  const prompt = buildSystemPrompt('cat');
  assert.ok(prompt.includes('학교폭력 신고 117'));
  for (const id of IDS) {
    const msg = getLocalFallbackResponse(id, '아빠한테 맞았어', 'crisis').message;
    assert.equal(msg, COUNSELOR_PROFILES[id].violenceCrisisMessage);
    assert.ok(msg.includes('112') && msg.includes('117') && msg.includes('1388'), id);
    assert.ok(!msg.includes('109'), id);
    for (const sentence of msg.split(/(?<=[.?!])s+/)) assert.doesNotMatch(sentence, POLITE_ENDING, id);
    // 자해 신호가 함께 있으면 기존 안내(109 포함) 유지
    assert.equal(getLocalFallbackResponse(id, '맞았고 죽고 싶어', 'crisis').message, COUNSELOR_PROFILES[id].crisisMessage);
  }
});

test('prompt tells the model to tell the story right away instead of offering it', () => {
  const prompt = buildSystemPrompt('dog');
  assert.ok(prompt.includes('[바로 응하기]'));
  // 다시 묻게 만들던 예시는 남아 있지 않아야 함
  assert.ok(!prompt.includes('웃긴 얘기 해 줄까, 아니면 그냥 들어 줄까?'));
  assert.ok(!prompt.includes('(예: "내가 잘못 이해했네, 웃고 싶었구나!")'));
});

test('prompt has no concrete example stories that models tend to copy', () => {
  for (const id of IDS) {
    const prompt = buildSystemPrompt(id);
    for (const phrase of ['거울 속', '고무장갑']) assert.ok(!prompt.includes(phrase), `${id}: ${phrase}`);
  }
});

test('[바로 응하기] shows a format-only good example and the rest-check rule', () => {
  const prompt = buildSystemPrompt('cat');
  assert.ok(prompt.includes('좋은 예(형식만)'));
  assert.ok(prompt.includes('제안만 하고 이야기가 없음'));
  assert.ok(prompt.includes('"지금 쉴 수 있는 상황이야?"'));
});
