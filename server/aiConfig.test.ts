import test from 'node:test';
import assert from 'node:assert/strict';
import {
  classifyAiError,
  EmptyResponseError,
  RefusalError,
  getOpenAIBaseUrl,
  getOpenAIModel,
  getReasoningEffort,
  getTimeoutMs,
  withOverloadRetry,
} from './aiConfig.ts';

test('classifyAiError maps HTTP status codes', () => {
  assert.equal(classifyAiError({ status: 429 }), 'quota_exceeded');
  assert.equal(classifyAiError({ status: 503 }), 'model_overloaded');
  assert.equal(classifyAiError({ status: 500 }), 'model_overloaded');
  assert.equal(classifyAiError({ status: 400 }), 'invalid_request');
  assert.equal(classifyAiError({ status: 401 }), 'auth_error');
  assert.equal(classifyAiError({ status: 404 }), 'model_not_found');
});

test('classifyAiError reads OpenAI error codes in the message', () => {
  assert.equal(classifyAiError({ status: 401, message: 'HTTP 401 {"error":{"code":"invalid_api_key"}}' }), 'auth_error');
  assert.equal(classifyAiError({ status: 429, message: 'HTTP 429 {"error":{"code":"insufficient_quota"}}' }), 'quota_exceeded');
  assert.equal(classifyAiError({ status: 400, message: 'HTTP 400 {"error":{"code":"model_not_found"}}' }), 'model_not_found');
});

test('classifyAiError handles timeouts, refusals, parsing and empty responses', () => {
  assert.equal(classifyAiError(Object.assign(new Error('x'), { name: 'AbortError' })), 'timeout');
  assert.equal(classifyAiError(Object.assign(new Error('x'), { name: 'TimeoutError' })), 'timeout');
  assert.equal(classifyAiError(new SyntaxError('Unexpected token')), 'parse_error');
  assert.equal(classifyAiError(new EmptyResponseError('empty')), 'empty_response');
  assert.equal(classifyAiError(new RefusalError('no')), 'refused');
  assert.equal(classifyAiError(new Error('fetch failed')), 'unknown');
  assert.equal(classifyAiError(null), 'unknown');
});

test('OpenAI settings default to gpt-6-luna, low effort, 20s and read env overrides', () => {
  const saved = { ...process.env };
  try {
    for (const k of ['OPENAI_MODEL', 'OPENAI_REASONING_EFFORT', 'OPENAI_BASE_URL', 'AI_TIMEOUT_MS']) delete process.env[k];
    assert.equal(getOpenAIModel(), 'gpt-6-luna');
    assert.equal(getReasoningEffort(), 'low');
    assert.equal(getOpenAIBaseUrl(), 'https://api.openai.com/v1');
    assert.equal(getTimeoutMs(), 20000);

    process.env.OPENAI_MODEL = 'gpt-6.1-sol';
    process.env.OPENAI_REASONING_EFFORT = 'NONE';
    process.env.OPENAI_BASE_URL = 'https://us.api.openai.com/v1/';
    process.env.AI_TIMEOUT_MS = '15000';
    assert.equal(getOpenAIModel(), 'gpt-6.1-sol');
    assert.equal(getReasoningEffort(), 'none');
    assert.equal(getOpenAIBaseUrl(), 'https://us.api.openai.com/v1');
    assert.equal(getTimeoutMs(), 15000);

    process.env.OPENAI_REASONING_EFFORT = 'nonsense';
    process.env.AI_TIMEOUT_MS = 'abc';
    assert.equal(getReasoningEffort(), 'low');
    assert.equal(getTimeoutMs(), 20000);
  } finally {
    process.env = saved;
  }
});

test('withOverloadRetry retries once on 503 and returns the second result', async () => {
  let calls = 0;
  const waits: number[] = [];
  const result = await withOverloadRetry(
    async () => {
      calls++;
      if (calls === 1) throw Object.assign(new Error('UNAVAILABLE'), { status: 503 });
      return 'ok';
    },
    { timeoutMs: 20000, sleep: async (ms) => void waits.push(ms) }
  );
  assert.equal(result, 'ok');
  assert.equal(calls, 2);
  assert.deepEqual(waits, [1200]);
});

test('withOverloadRetry does not retry quota, auth or other errors', async () => {
  for (const status of [429, 400, 403]) {
    let calls = 0;
    await assert.rejects(
      withOverloadRetry(
        async () => {
          calls++;
          throw Object.assign(new Error('x'), { status });
        },
        { timeoutMs: 20000, sleep: async () => {} }
      )
    );
    assert.equal(calls, 1, `status ${status}`);
  }
});

test('withOverloadRetry gives up when too little time is left', async () => {
  let t = 0;
  let calls = 0;
  await assert.rejects(
    withOverloadRetry(
      async () => {
        calls++;
        t += 16000; // 첫 시도가 16초 걸림 → 남은 4초로는 재시도하지 않음
        throw Object.assign(new Error('UNAVAILABLE'), { status: 503 });
      },
      { timeoutMs: 20000, sleep: async () => {}, now: () => t }
    )
  );
  assert.equal(calls, 1);
});

test('withOverloadRetry fails if the retry also fails', async () => {
  let calls = 0;
  await assert.rejects(
    withOverloadRetry(
      async () => {
        calls++;
        throw Object.assign(new Error('UNAVAILABLE'), { status: 503 });
      },
      { timeoutMs: 20000, sleep: async () => {} }
    )
  );
  assert.equal(calls, 2);
});
