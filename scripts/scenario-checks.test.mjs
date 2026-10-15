// 판정 규칙이 실제 문제 사례는 잡고, 좋은 응답은 잡지 않는지 확인 (상담 분석 자료의 멍이 응답 기준)
import test from 'node:test';
import assert from 'node:assert/strict';
import { checks, isAdvice } from './scenario-checks.mjs';

const run = (check, message, extra = {}, ctx = { usedStrategies: new Set() }) =>
  check({ message, ...extra }, ctx);

test('early or post-refusal advice is flagged (응답 3, 5, 6, 7)', () => {
  const noAdvice = checks.noAdvice('test');
  assert.ok(run(noAdvice, '오늘은 아무 생각도 하지 말고 푹 쉬어 보자. 편안하게 누워서 숨 골라볼까?'));
  assert.ok(run(noAdvice, '쉬고 싶은데 끝내야 할 일이 남아있으면 마음이 더 조급해지지. 남은 일 하나만 가볍게 먼저 끝내볼까?'));
  assert.ok(run(noAdvice, '산처럼 쌓인 일들을 보면 엄두가 안 나지. 지금 당장 다 하려고 하지 말고, 딱 하나만 골라서 먼저 해볼까?'));
  assert.ok(run(noAdvice, '많이 지쳐서 쉬고 싶었구나. 잠시 눈을 감고 깊게 숨 쉬면서 마음을 조금만 가라앉혀 볼까?'));
});

test('good exploring replies are not flagged as advice (응답 2, 4)', () => {
  const noAdvice = checks.noAdvice('test');
  assert.equal(run(noAdvice, '오래 일하느라 진짜 피곤했겠다. 수고 많았어 🐶'), null);
  assert.equal(run(noAdvice, '바로 쉬기 어려운 상황이구나. 어떤 일 때문에 쉴 수 없는지 조금만 이야기해 줄래?'), null);
});

test('resting advice without checking the situation is flagged', () => {
  const check = checks.noRestWithoutCheck();
  assert.ok(run(check, '오늘은 아무 생각도 하지 말고 푹 쉬어 보자.'));
  // 실제 배포 응답: 질문형이지만 상황 확인 없이 눕기를 권함
  assert.ok(run(check, '피곤할 땐 아무것도 안 하고 푹 쉬는 게 최고야. 따뜻한 물로 씻고 가볍게 누워 볼래?'));
  assert.equal(run(check, '지금 잠깐 누워서 쉴 수 있는 상황이야?'), null);
  // 실제 배포 응답 (LOW): 말줄임표로 끝나는 조언도 조언으로 판정
  assert.ok(isAdvice('그럼 지금은 아무것도 생각하지 말고 조금만 눈을 붙여 볼까… 냥이가 곁에 있을게. 🌙'));
});

test('refusing a fun-story request with the homework line is flagged (실제 배포 응답)', () => {
  assert.ok(run(checks.complies(), '재밌는 이야기라니, 조금 웃고 싶었구나. 그건 교과서나 검색이 더 정확할 거야. 혹시 요즘 많이 지쳐서 기분 전환이 필요했던 건 아니야?'));
  assert.ok(run(checks.noMindReading(), '혹시 요즘 마음이 허전해서 누군가와 즐겁게 이야기 나누고 싶었던 건 아닐까?'));
});

test('mind-reading and deflection are flagged (응답 8, 10)', () => {
  assert.ok(run(checks.noMindReading(), '지금은 마음이 많이 지쳐서 이야기에 집중하기 어려울 수도 있을 것 같아. 잠시 쉬어 볼까?'));
  assert.ok(run(checks.complies(), '지금은 웃고 즐거운 이야기보다 그냥 조용히 쉬고 싶거나 위로가 필요했던 건 아닐까?'));
});

test('complying with a fun-story request passes (응답 11~14)', () => {
  assert.equal(run(checks.complies(), '아, 활짝 웃으면서 기분 전환이 필요했구나! 멍이가 어제 꼬리 잡으려다 빙글빙글 돈 이야기 해 줄게.'), null);
  assert.equal(run(checks.complies(), '멍이에게는 이야기 잘 들어주는 소중한 친구들이 아주 많아. 혹시 너도 요즘 마음을 나누는 친구가 필요했어?'), null);
});

test('accepting a correction passes, repeating the interpretation fails', () => {
  const check = checks.acceptsCorrection();
  assert.equal(run(check, '내가 잘못 이해했네, 웃고 싶었구나! 그럼 몽이 바나나 실수담 들려줄게.'), null);
  // 실제 배포 응답 (LOW): 정정을 받아들임
  assert.equal(run(check, '아, 위로보다 그냥 빵 터지고 싶었구나. 바나나를 껍질째 씹어 먹으려다 깜짝 놀란 원숭이 이야기라도 해줄까? 🍌'), null);
  assert.ok(run(check, '그래도 사실은 위로가 필요한 것 같아.'));
});

test('repeating an already-suggested strategy is flagged', () => {
  const ctx = { usedStrategies: new Set(['나눠하기']) };
  assert.ok(checks.noRepeatStrategy()({ message: '지금 당장 다 하려고 하지 말고, 딱 하나만 골라서 먼저 해볼까?' }, ctx));
  assert.equal(checks.noRepeatStrategy()({ message: '남은 숙제 목록을 같이 적어 볼까?' }, ctx), null);
  assert.equal(isAdvice('남은 숙제가 많구나. 어떤 과목이 제일 부담돼?'), false);
});

test('answer leak and banmal checks', () => {
  const leak = checks.noAnswerLeak(/x\s*=\s*4|답은 4|4야|4이야|정답은/);
  assert.ok(run(leak, '양변에서 3을 빼면 x = 4야!'));
  assert.equal(run(leak, '그건 교과서나 검색이 더 정확할 거야. 공부하다 지쳤어?'), null);
  assert.ok(run(checks.banmal(), '많이 힘들었겠어요.'));
  assert.equal(run(checks.banmal(), '많이 힘들었겠다.'), null);
});
