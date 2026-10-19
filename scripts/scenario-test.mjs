#!/usr/bin/env node
/**
 * 대화 시나리오 회귀 테스트
 *
 * 실제 배포(또는 로컬) 챗봇에 정해진 대화를 캐릭터별로 이어서 보내고,
 * 상담 규칙 위반으로 보이는 응답을 자동으로 표시합니다. 자동 판정은 키워드 기반의 "의심 표시"이므로
 * 결과 파일의 전체 대화를 사람이 함께 읽어 보고 판단하세요.
 *
 * 사용법:
 *   npm run scenarios                                   # 배포 사이트, 세 캐릭터, 모든 시나리오
 *   npm run scenarios -- --characters dog --scenarios S2,S3
 *   npm run scenarios -- --base http://localhost:3000 --delay 3000
 *
 * 주의: 실제 AI(OpenAI) 호출을 사용합니다(전체 실행 시 약 39회, 요금 발생). 비용을 고려해 하루에 여러 번 돌리지 마세요.
 * 결과: scripts/scenario-results/<시각>.md 와 .json (git에 올라가지 않음)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- 옵션 ----------
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = opt('base', 'https://youth-counsel-chatbot.vercel.app').replace(/\/$/, '');
const CHARACTERS = opt('characters', 'cat,dog,monkey').split(',');
const ONLY = opt('scenarios', '').split(',').filter(Boolean);
const DELAY_MS = Number(opt('delay', '12000'));

const GREETINGS = {
  cat: '안녕? 나는 냥이야. 오늘 하루 마음은 어땠어? 사소한 이야기라도 괜찮으니 편하게 들려줄래?',
  dog: '어서 와! 나는 멍이야. 오늘 어떤 일이 있었는지 궁금해. 네 마음 그대로 편하게 이야기해 줘!',
  monkey: '반가워! 나는 숭이야. 고민이 있으면 몇 가지 물어보면서 너한테 딱 맞는 방법을 같이 찾아볼게.',
};

import { checks, isAdvice, strategiesIn, SCENARIOS } from './scenario-checks.mjs';

// ---------- 실행 ----------
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const results = [];
let firstCall = true;

async function send(counselorId, userMessage, history) {
  if (!firstCall) await sleep(DELAY_MS);
  firstCall = false;
  const t0 = Date.now();
  const res = await fetch(`${BASE}/api/chat`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ counselorId, userMessage, conversationHistory: history }),
  });
  const body = await res.json();
  return { ...body, latency: (Date.now() - t0) / 1000 };
}

const health = await (await fetch(`${BASE}/api/health`)).json().catch(() => ({}));
console.log(`대상: ${BASE}  제공자: ${health.provider ?? '?'}  모델: ${health.model ?? '?'}  추론 강도: ${health.reasoningEffort ?? '?'}\n`);

for (const scenario of SCENARIOS.filter((s) => !ONLY.length || ONLY.includes(s.id))) {
  for (const counselorId of CHARACTERS) {
    console.log(`=== ${scenario.id} ${scenario.title} [${counselorId}] ===`);
    const history = [{ sender: 'counselor', text: GREETINGS[counselorId] }];
    const ctx = { usedStrategies: new Set() };
    for (const [userMessage, turnChecks] of scenario.turns) {
      ctx.userMessage = userMessage;
      const r = await send(counselorId, userMessage, history);
      const issues = [...turnChecks, checks.banmal(), checks.noClicheQuestion(), checks.noParrot(), checks.noBreathing()].map((c) => c(r, ctx)).filter(Boolean);
      if (['local_engine', 'fallback_recovery', 'rate_limited'].includes(r.source)) {
        issues.push(`AI가 아닌 내장 응답(source=${r.source}${r.fallbackReason ? '/' + r.fallbackReason : ''}) — 판정 제외 권장`);
      }
      if (isAdvice(r.message)) strategiesIn(r.message).forEach((s) => ctx.usedStrategies.add(s));
      results.push({ scenario: scenario.id, counselorId, userMessage, ...r, issues });
      console.log(`  학생: ${userMessage}`);
      console.log(`  → ${r.message}`);
      console.log(`    ${r.latency.toFixed(1)}s ${issues.length ? '⚠️ ' + issues.join(' / ') : '✅'}`);
      history.push({ sender: 'user', text: userMessage }, { sender: 'counselor', text: r.message });
    }
    console.log('');
  }
}

// ---------- 요약·저장 ----------
const flagged = results.filter((r) => r.issues.length);
const avgLatency = results.reduce((a, r) => a + r.latency, 0) / Math.max(results.length, 1);
const summary = `턴 ${results.length}개 중 의심 표시 ${flagged.length}개, 평균 응답 ${avgLatency.toFixed(1)}초 (제공자 ${health.provider ?? '?'}, 모델 ${health.model ?? '?'}, 추론 강도 ${health.reasoningEffort ?? '-'})`;
console.log(`요약: ${summary}`);

const outDir = path.join(__dirname, 'scenario-results');
fs.mkdirSync(outDir, { recursive: true });
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const md = [
  `# 시나리오 테스트 결과 ${stamp}`,
  '',
  `- 대상: ${BASE}`,
  `- ${summary}`,
  '',
  ...SCENARIOS.flatMap((s) =>
    CHARACTERS.flatMap((c) => {
      const rows = results.filter((r) => r.scenario === s.id && r.counselorId === c);
      if (!rows.length) return [];
      return [
        `## ${s.id} ${s.title} — ${c}`,
        '',
        ...rows.flatMap((r) => [
          `- **학생:** ${r.userMessage}`,
          `  - **${c}:** ${r.message}`,
          `  - ${r.latency.toFixed(1)}s · ${r.issues.length ? '⚠️ ' + r.issues.join(' / ') : '✅'}`,
        ]),
        '',
      ];
    })
  ),
].join('\n');
fs.writeFileSync(path.join(outDir, `${stamp}.md`), md);
fs.writeFileSync(path.join(outDir, `${stamp}.json`), JSON.stringify({ base: BASE, health, results }, null, 2));
console.log(`저장: scripts/scenario-results/${stamp}.md`);
