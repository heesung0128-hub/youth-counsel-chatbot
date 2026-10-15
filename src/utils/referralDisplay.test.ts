import test from 'node:test';
import assert from 'node:assert/strict';
import { displayValue, isPlaceholder } from './referralDisplay.ts';

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
