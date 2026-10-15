import test from 'node:test';
import assert from 'node:assert/strict';
import { ThinkingLevel } from '@google/genai';
import {
  classifyGeminiError,
  EmptyResponseError,
  getGeminiModel,
  getThinkingLevel,
  getTimeoutMs,
} from './geminiConfig.ts';

test('classifyGeminiError maps HTTP status codes', () => {
  assert.equal(classifyGeminiError({ status: 429 }), 'quota_exceeded');
  assert.equal(classifyGeminiError({ status: 503 }), 'model_overloaded');
  assert.equal(classifyGeminiError({ status: 500 }), 'model_overloaded');
  assert.equal(classifyGeminiError({ status: 400 }), 'invalid_request');
  assert.equal(classifyGeminiError({ status: 403 }), 'auth_error');
  assert.equal(classifyGeminiError({ status: 404 }), 'model_not_found');
  assert.equal(
    classifyGeminiError({ status: 400, message: '{"error":{"message":"API key not valid. Please pass a valid API key."}}' }),
    'auth_error'
  );
});

test('classifyGeminiError handles timeouts, parsing and empty responses', () => {
  assert.equal(classifyGeminiError(Object.assign(new Error('x'), { name: 'AbortError' })), 'timeout');
  assert.equal(classifyGeminiError(Object.assign(new Error('x'), { name: 'TimeoutError' })), 'timeout');
  assert.equal(classifyGeminiError(new SyntaxError('Unexpected token')), 'parse_error');
  assert.equal(classifyGeminiError(new EmptyResponseError('empty')), 'empty_response');
});

test('classifyGeminiError falls back to message text, then unknown', () => {
  assert.equal(classifyGeminiError(new Error('{"status":"RESOURCE_EXHAUSTED"}')), 'quota_exceeded');
  assert.equal(classifyGeminiError(new Error('The model is overloaded')), 'model_overloaded');
  assert.equal(classifyGeminiError(new Error('fetch failed')), 'unknown');
  assert.equal(classifyGeminiError(null), 'unknown');
});

test('Gemini settings default to flash-lite with LOW thinking and read env overrides', () => {
  const saved = { ...process.env };
  delete process.env.GEMINI_MODEL;
  delete process.env.GEMINI_THINKING_LEVEL;
  delete process.env.GEMINI_TIMEOUT_MS;
  assert.equal(getGeminiModel(), 'gemini-3.5-flash-lite');
  assert.equal(getThinkingLevel(), ThinkingLevel.LOW);
  assert.equal(getTimeoutMs(), 20000);

  process.env.GEMINI_MODEL = 'gemini-3.6-flash';
  process.env.GEMINI_THINKING_LEVEL = 'minimal';
  process.env.GEMINI_TIMEOUT_MS = '15000';
  assert.equal(getGeminiModel(), 'gemini-3.6-flash');
  assert.equal(getThinkingLevel(), ThinkingLevel.MINIMAL);
  assert.equal(getTimeoutMs(), 15000);

  process.env.GEMINI_THINKING_LEVEL = 'nonsense';
  process.env.GEMINI_TIMEOUT_MS = 'abc';
  assert.equal(getThinkingLevel(), ThinkingLevel.LOW);
  assert.equal(getTimeoutMs(), 20000);
  process.env = saved;
});
