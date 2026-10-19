import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOpenAIRequest, COUNSELOR_REPLY_SCHEMA, getProviderInfo, parseOpenAIResponse } from './aiProvider.ts';
import { EmptyResponseError, RefusalError } from './aiConfig.ts';

const withEnv = (vars: Record<string, string | undefined>, fn: () => void) => {
  const saved = { ...process.env };
  try {
    for (const [k, v] of Object.entries(vars)) {
      if (v === undefined) delete process.env[k];
      else process.env[k] = v;
    }
    fn();
  } finally {
    process.env = saved;
  }
};

test('getProviderInfo reports OpenAI and whether the key is set', () => {
  withEnv({ OPENAI_API_KEY: undefined, OPENAI_MODEL: undefined }, () => {
    assert.deepEqual(getProviderInfo(), { name: 'openai', model: 'gpt-6-luna', configured: false });
  });
  withEnv({ OPENAI_API_KEY: '  ', OPENAI_MODEL: 'gpt-6.1-sol' }, () => {
    assert.deepEqual(getProviderInfo(), { name: 'openai', model: 'gpt-6.1-sol', configured: false });
  });
  withEnv({ OPENAI_API_KEY: 'sk-test' }, () => assert.equal(getProviderInfo().configured, true));
});

test('buildOpenAIRequest uses store:false, strict JSON schema and keeps message order', () => {
  withEnv({ OPENAI_MODEL: undefined, OPENAI_REASONING_EFFORT: undefined }, () => {
    const body = buildOpenAIRequest({
      system: 'SYSTEM',
      history: [
        { role: 'assistant', text: '안녕?' },
        { role: 'user', text: '피곤해' },
      ],
      userText: '학생의 메시지: "쉬고 싶어"',
    });
    assert.equal(body.model, 'gpt-6-luna');
    assert.equal(body.store, false);
    assert.deepEqual(body.reasoning, { effort: 'low' });
    assert.deepEqual(
      body.input.map((m) => m.role),
      ['system', 'assistant', 'user', 'user']
    );
    assert.equal(body.input[3].content, '학생의 메시지: "쉬고 싶어"');
    assert.equal(body.text.format.type, 'json_schema');
    assert.equal(body.text.format.strict, true);
  });
});

test('strict schema lists every property as required and forbids extras', () => {
  assert.deepEqual([...COUNSELOR_REPLY_SCHEMA.required].sort(), Object.keys(COUNSELOR_REPLY_SCHEMA.properties).sort());
  assert.equal(COUNSELOR_REPLY_SCHEMA.additionalProperties, false);
});

test('parseOpenAIResponse reads output_text parts and handles refusal, truncation and empty output', () => {
  const ok = {
    status: 'completed',
    output: [
      { type: 'reasoning', summary: [] },
      { type: 'message', content: [{ type: 'output_text', text: '{"message":"안녕"}' }] },
    ],
  };
  assert.equal(parseOpenAIResponse(ok), '{"message":"안녕"}');
  assert.equal(parseOpenAIResponse({ output: [], output_text: '{"a":1}' }), '{"a":1}');
  assert.throws(
    () => parseOpenAIResponse({ output: [{ type: 'message', content: [{ type: 'refusal', refusal: 'no' }] }] }),
    RefusalError
  );
  assert.throws(
    () => parseOpenAIResponse({ status: 'incomplete', incomplete_details: { reason: 'max_output_tokens' }, output: [] }),
    EmptyResponseError
  );
  assert.throws(() => parseOpenAIResponse({ output: [] }), EmptyResponseError);
});
