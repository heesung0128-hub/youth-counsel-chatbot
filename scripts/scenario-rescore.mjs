#!/usr/bin/env node
/**
 * 저장된 시나리오 결과(JSON)를 AI를 다시 부르지 않고 현재 판정 규칙으로 다시 채점합니다.
 * 판정 규칙(scenario-checks.mjs)을 고친 뒤 확인용으로 사용하세요.
 *   node scripts/scenario-rescore.mjs scripts/scenario-results/<파일>.json
 */
import fs from 'node:fs';
import { checks, isAdvice, strategiesIn, SCENARIOS } from './scenario-checks.mjs';

const file = process.argv[2];
if (!file) throw new Error('결과 JSON 파일 경로를 넣어 주세요.');
const { results } = JSON.parse(fs.readFileSync(file, 'utf8'));
let flagged = 0;
for (const scenario of SCENARIOS) {
  for (const counselorId of [...new Set(results.map((r) => r.counselorId))]) {
    const rows = results.filter((r) => r.scenario === scenario.id && r.counselorId === counselorId);
    if (!rows.length) continue;
    console.log(`=== ${scenario.id} [${counselorId}] ===`);
    const ctx = { usedStrategies: new Set() };
    rows.forEach((r, i) => {
      ctx.userMessage = r.userMessage;
      const turnChecks = scenario.turns[i]?.[1] ?? [];
      const issues = [...turnChecks, checks.banmal(), checks.noClicheQuestion(), checks.noParrot(), checks.noBreathing()].map((c) => c(r, ctx)).filter(Boolean);
      if (isAdvice(r.message)) strategiesIn(r.message).forEach((s) => ctx.usedStrategies.add(s));
      if (issues.length) flagged++;
      console.log(`  ${r.userMessage} → ${issues.length ? '⚠️ ' + issues.join(' / ') : '✅'}`);
    });
  }
}
console.log(`\n의심 표시 ${flagged}/${results.length}`);
