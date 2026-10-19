import test from 'node:test';
import assert from 'node:assert/strict';
import { detectPersonalInfo, maskPersonalInfo } from './personalInfo.ts';

test('detectPersonalInfo finds common personal details', () => {
  assert.deepEqual(detectPersonalInfo('내 번호 010-1234-5678이야'), ['phone']);
  assert.deepEqual(detectPersonalInfo('메일은 kim.minji@gmail.com'), ['email']);
  assert.deepEqual(detectPersonalInfo('학번 20261234'), ['number']);
  assert.deepEqual(detectPersonalInfo('우리 집 103동 1204호야'), ['address']);
  assert.deepEqual(detectPersonalInfo('서초고등학교 다녀'), ['school']);
  assert.deepEqual(detectPersonalInfo('동덕여고 2학년 3반이야'), ['school', 'classInfo']);
  assert.deepEqual(detectPersonalInfo('내 이름은 김민지야'), ['name']);
});

test('detectPersonalInfo ignores everyday sentences', () => {
  for (const text of ['그리고 학교 가기 싫어', '시험 3일 남았어', '고등학교 생활이 힘들어', '중학교 때 친구랑 싸웠어', '오늘 2시간 공부했어']) {
    assert.deepEqual(detectPersonalInfo(text), [], text);
  }
});

test('maskPersonalInfo hides phone, email, long numbers and unit numbers but keeps the rest', () => {
  assert.equal(maskPersonalInfo('010-1234-5678로 연락해'), '[가림]로 연락해');
  assert.equal(maskPersonalInfo('a.b@c.com 이야'), '[가림] 이야');
  assert.equal(maskPersonalInfo('학번 20261234'), '학번 [가림]');
  assert.equal(maskPersonalInfo('103동 1204호'), '[가림]');
  assert.equal(maskPersonalInfo('시험 3일 남았어, 2학년 3반'), '시험 3일 남았어, 2학년 3반');
});
