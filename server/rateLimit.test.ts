import test from 'node:test';
import assert from 'node:assert/strict';
import { checkRateLimit, getClientIp, type Limiters } from './rateLimit.ts';

const ok = { limit: async () => ({ success: true }) };
const blocked = { limit: async () => ({ success: false }) };

test('checkRateLimit passes when limiter is not configured', async () => {
  assert.deepEqual(await checkRateLimit('1.1.1.1', null), { limited: false });
});

test('checkRateLimit reports which limit was hit', async () => {
  const base: Limiters = { perMin: ok, perDay: ok, global: ok };
  assert.deepEqual(await checkRateLimit('a', base), { limited: false });
  assert.deepEqual(await checkRateLimit('a', { ...base, perMin: blocked }), { limited: true, reason: 'per_minute' });
  assert.deepEqual(await checkRateLimit('a', { ...base, perDay: blocked }), { limited: true, reason: 'per_day' });
  assert.deepEqual(await checkRateLimit('a', { ...base, global: blocked }), { limited: true, reason: 'global_daily' });
});

test('checkRateLimit does not consume global quota when the IP is already limited', async () => {
  let globalCalls = 0;
  const global = { limit: async () => { globalCalls++; return { success: true }; } };
  await checkRateLimit('a', { perMin: blocked, perDay: ok, global });
  assert.equal(globalCalls, 0);
});

test('checkRateLimit fails open on Redis errors', async () => {
  const broken = { limit: async () => { throw new Error('redis down'); } };
  const res = await checkRateLimit('a', { perMin: broken, perDay: ok, global: ok });
  assert.deepEqual(res, { limited: false });
});

test('getClientIp reads the first x-forwarded-for entry', () => {
  assert.equal(getClientIp({ 'x-forwarded-for': '203.0.113.5, 10.0.0.1' }), '203.0.113.5');
  assert.equal(getClientIp({ 'x-real-ip': '198.51.100.7' }), '198.51.100.7');
  assert.equal(getClientIp({}), 'unknown');
});
