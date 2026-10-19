import test from 'node:test';
import assert from 'node:assert/strict';
import { displayValue, isPlaceholder, shouldShowReferralCard } from './referralDisplay.ts';

test('isPlaceholder treats bracketed or empty values as unconfirmed', () => {
  assert.equal(isPlaceholder('[시범 운영 시 교내 Wee클래스 직통 내선번호 입력]'), true);
  assert.equal(isPlaceholder('  [평일 09:00 ~ 18:00]  '), true);
  assert.equal(isPlaceholder(''), true);
  assert.equal(isPlaceholder(undefined), true);
});

test('isPlaceholder keeps real values visible', () => {
  assert.equal(isPlaceholder('02-000-0000'), false);
  assert.equal(isPlaceholder('서울특별시 서초구 반포대로 (서초유스센터 내)'), false);
  assert.equal(displayValue('  평일 09:00 ~ 18:00 '), '평일 09:00 ~ 18:00');
  assert.equal(displayValue('[입력]'), null);
});

test('shouldShowReferralCard does not repeat the same card within the last 3 counselor replies', () => {
  const card = (stage: 2 | 3) => ({ sender: 'counselor', isReferralOffer: true, referralStage: stage });
  const plain = { sender: 'counselor' };
  const user = { sender: 'user' };
  assert.equal(shouldShowReferralCard([], true, 2), true);
  assert.equal(shouldShowReferralCard([card(2), user], false, 2), false);
  assert.equal(shouldShowReferralCard([card(2), user], true, 2), false);
  assert.equal(shouldShowReferralCard([card(3), user, plain, user], true, 2), false);
  // 단계가 올라가면 다시 보여 줌
  assert.equal(shouldShowReferralCard([card(2), user], true, 3), true);
  // 캐릭터 답변 3개가 지나면 다시 보여 줌
  assert.equal(shouldShowReferralCard([card(2), user, plain, user, plain, user, plain, user], true, 2), true);
});
