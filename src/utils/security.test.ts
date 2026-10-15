import test from 'node:test';
import assert from 'node:assert/strict';
import {
  hashPin,
  verifyPin,
  needsRehash,
  generateAnonymousId,
  generateTransferCode,
  validateTransferCode,
  checkLockoutStatus,
  getNextLockStateOnFailure,
} from './security.ts';

test('hashPin and verifyPin correctly hashes and matches 4-digit PIN', async () => {
  const pin = '1234';
  const hashed = await hashPin(pin);
  assert.equal(typeof hashed, 'string');
  assert.ok(hashed.length >= 8);

  const isMatch = await verifyPin('1234', hashed);
  assert.equal(isMatch, true);

  const isMismatch = await verifyPin('9999', hashed);
  assert.equal(isMismatch, false);
});

test('hashPin uses a random salt so the same PIN gives different hashes', async () => {
  const a = await hashPin('1234');
  const b = await hashPin('1234');
  assert.match(a, /^pbkdf2-sha256\$200000\$[0-9a-f]{32}\$[0-9a-f]{64}$/);
  assert.notEqual(a, b);
  assert.equal(needsRehash(a), false);
});

test('verifyPin still accepts legacy unsalted SHA-256 hashes and flags them for rehash', async () => {
  // 이전 버전에서 저장된 '1234'의 SHA-256 값
  const legacy = '03ac674216f3e15c761ee1a5e255f067953623c8b388b4459e13f978d7c846f4';
  assert.equal(await verifyPin('1234', legacy), true);
  assert.equal(await verifyPin('0000', legacy), false);
  assert.equal(needsRehash(legacy), true);
  assert.equal(needsRehash(null), false);
});

test('verifyPin rejects malformed stored hashes', async () => {
  assert.equal(await verifyPin('1234', 'pbkdf2-sha256$abc$$'), false);
  assert.equal(await verifyPin('1234', ''), false);
});

test('generateAnonymousId returns valid UUID-like string', () => {
  const id1 = generateAnonymousId();
  const id2 = generateAnonymousId();
  assert.ok(id1.length > 20);
  assert.notEqual(id1, id2);
});

test('generateTransferCode and validateTransferCode work correctly', () => {
  const anonId = '4f92c300-8b1e-4512-8702-8f929d20c3a1';
  const code = generateTransferCode(anonId);
  assert.ok(code.startsWith('SC-'));
  assert.equal(validateTransferCode(code), true);
  assert.equal(validateTransferCode('INVALID'), false);
  assert.equal(validateTransferCode('SC-123'), false);
});

test('checkLockoutStatus handles lockout delay', () => {
  const now = 1000000;
  // Not locked
  const status1 = checkLockoutStatus(2, null, now);
  assert.equal(status1.isLocked, false);
  assert.equal(status1.remainingSeconds, 0);

  // Locked with 20 seconds remaining
  const status2 = checkLockoutStatus(5, now + 20000, now);
  assert.equal(status2.isLocked, true);
  assert.equal(status2.remainingSeconds, 20);

  // Lock expired
  const status3 = checkLockoutStatus(5, now - 1000, now);
  assert.equal(status3.isLocked, false);
});

test('getNextLockStateOnFailure triggers 30s lockout on 5th attempt', () => {
  const now = 500000;
  const attempt4 = getNextLockStateOnFailure(3, now);
  assert.equal(attempt4.failedAttempts, 4);
  assert.equal(attempt4.lockedUntil, null);

  const attempt5 = getNextLockStateOnFailure(4, now);
  assert.equal(attempt5.failedAttempts, 5);
  assert.equal(attempt5.lockedUntil, now + 30000);
});
