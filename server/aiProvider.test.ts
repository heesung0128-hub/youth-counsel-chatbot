import test from 'node:test';
import assert from 'node:assert/strict';
import { extractJson, getProviderInfo } from './aiProvider.ts';

test('extractJson pulls the JSON object out of extra text, code fences and think tags', () => {
  assert.equal(extractJson('{"message":"안녕"}'), '{"message":"안녕"}');
  assert.equal(extractJson('```json\n{"message":"안녕"}\n```'), '{"message":"안녕"}');
  assert.equal(extractJson('<think>생각 중 {not json}</think>\n여기 답변이야: {"message":"안녕","riskLevel":"safe"} 끝'), '{"message":"안녕","riskLevel":"safe"}');
  assert.throws(() => extractJson('그냥 문장만 있어'), SyntaxError);
});

test('getProviderInfo reads AI_PROVIDER and reports whether keys are configured', () => {
  const saved = { ...process.env };
  try {
    for (const k of ['AI_PROVIDER', 'GEMINI_API_KEY', 'CLOUDFLARE_ACCOUNT_ID', 'CLOUDFLARE_API_TOKEN', 'CLOUDFLARE_MODEL', 'UPSTAGE_API_KEY', 'UPSTAGE_MODEL']) {
      delete process.env[k];
    }
    assert.deepEqual(
      { name: getProviderInfo().name, configured: getProviderInfo().configured },
      { name: 'gemini', configured: false }
    );

    process.env.AI_PROVIDER = 'cloudflare';
    process.env.CLOUDFLARE_ACCOUNT_ID = 'acc';
    assert.equal(getProviderInfo().configured, false); // 토큰이 없으면 미설정
    process.env.CLOUDFLARE_API_TOKEN = 'tok';
    process.env.CLOUDFLARE_MODEL = '@cf/qwen/test';
    assert.deepEqual(getProviderInfo(), { name: 'cloudflare', model: '@cf/qwen/test', configured: true });

    process.env.AI_PROVIDER = 'Upstage';
    process.env.UPSTAGE_API_KEY = 'up';
    assert.deepEqual(getProviderInfo(), { name: 'upstage', model: 'solar-pro2', configured: true });

    process.env.AI_PROVIDER = 'something-else';
    assert.equal(getProviderInfo().name, 'gemini');
  } finally {
    process.env = saved;
  }
});
