#!/usr/bin/env node
/**
 * 학생들이 남긴 앱 평가·피드백을 엑셀에서 열 수 있는 CSV로 내려받습니다. (교사용)
 *
 * 준비: Vercel 환경변수 FEEDBACK_ADMIN_TOKEN 에 아무도 모르는 긴 문자열을 넣고 재배포
 * 사용: FEEDBACK_ADMIN_TOKEN=그문자열 npm run feedback:export
 *       (Windows PowerShell: $env:FEEDBACK_ADMIN_TOKEN='그문자열'; npm run feedback:export)
 * 결과: scripts/feedback-results/feedback-<날짜>.csv (git에 올라가지 않음)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const BASE = opt('base', 'https://youth-counsel-chatbot.vercel.app').replace(/\/$/, '');
const TOKEN = opt('token', process.env.FEEDBACK_ADMIN_TOKEN);
if (!TOKEN) {
  console.error('FEEDBACK_ADMIN_TOKEN 이 필요해요. (파일 맨 위 사용법 참고)');
  process.exit(1);
}

const res = await fetch(`${BASE}/api/feedback`, { headers: { Authorization: `Bearer ${TOKEN}` } });
const body = await res.json().catch(() => ({}));
if (!res.ok) {
  console.error(`조회 실패 (${res.status}): ${body.error ?? ''}`);
  process.exit(1);
}

const CHARACTER = { cat: '냥이', dog: '멍이', monkey: '숭이' };
const cell = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
const lines = [
  ['시각', '종류', '별점', '캐릭터', '내용'].map(cell).join(','),
  ...body.entries.map((e) =>
    [new Date(e.at).toLocaleString('ko-KR'), e.kind === 'rating' ? '평가' : '피드백', e.rating ?? '', CHARACTER[e.counselorId] ?? '', e.text]
      .map(cell)
      .join(',')
  ),
];

const outDir = path.join(__dirname, 'feedback-results');
fs.mkdirSync(outDir, { recursive: true });
const file = path.join(outDir, `feedback-${new Date().toISOString().slice(0, 10)}.csv`);
fs.writeFileSync(file, '﻿' + lines.join('\r\n')); // BOM: 엑셀에서 한글이 깨지지 않게

const ratings = body.entries.filter((e) => e.rating);
const avg = ratings.length ? (ratings.reduce((a, e) => a + e.rating, 0) / ratings.length).toFixed(2) : '-';
console.log(`총 ${body.count}건 (평가 ${ratings.length}건, 평균 별점 ${avg})`);
console.log(`저장: ${path.relative(process.cwd(), file)}`);
