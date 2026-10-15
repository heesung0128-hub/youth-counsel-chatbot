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
  assert.ok(prompt.includes('[상담과 관계없는 질문 - 주제 이탈 대응]'));
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
