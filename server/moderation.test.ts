import test from 'node:test';
import assert from 'node:assert/strict';
import { blockedOutputCategories, inputSignal, isModerationEnabled, moderate } from './moderation.ts';

const result = (cats: string[]) => ({ flagged: cats.length > 0, categories: Object.fromEntries(cats.map((c) => [c, true])) });

test('inputSignal maps self-harm categories to risk signals', () => {
  assert.equal(inputSignal(result(['self-harm/intent'])), 'crisis');
  assert.equal(inputSignal(result(['self-harm/instructions'])), 'crisis');
  assert.equal(inputSignal(result(['self-harm'])), 'safety_check');
  assert.equal(inputSignal(result(['sexual/minors'])), 'concern');
  // 학생이 화를 표현하는 것(괴롭힘·폭력 언급)만으로는 위험도를 올리지 않음
  assert.equal(inputSignal(result(['harassment', 'violence'])), null);
  assert.equal(inputSignal(null), null);
});

test('blockedOutputCategories blocks harmful replies but allows supportive crisis replies', () => {
  assert.deepEqual(blockedOutputCategories(result(['sexual'])), ['sexual']);
  assert.deepEqual(blockedOutputCategories(result(['self-harm/instructions', 'violence/graphic'])), ['self-harm/instructions', 'violence/graphic']);
  assert.deepEqual(blockedOutputCategories(result(['self-harm', 'self-harm/intent'])), []);
  assert.deepEqual(blockedOutputCategories(result(['harassment', 'violence'])), []);
  assert.deepEqual(blockedOutputCategories(null), []);
});

test('moderation is off without a key or when disabled, and moderate() then returns null', async () => {
  const saved = { ...process.env };
  try {
    delete process.env.OPENAI_API_KEY;
    assert.equal(isModerationEnabled(), false);
    assert.equal(await moderate('안녕'), null);
    process.env.OPENAI_API_KEY = 'sk-test';
    process.env.MODERATION_ENABLED = 'false';
    assert.equal(isModerationEnabled(), false);
    delete process.env.MODERATION_ENABLED;
    assert.equal(isModerationEnabled(), true);
  } finally {
    process.env = saved;
  }
});
