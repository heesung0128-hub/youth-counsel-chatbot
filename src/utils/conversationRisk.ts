/**
 * 대화 흐름 기반 규칙 위험 판단 (AI 응답을 쓸 수 없을 때의 안전망).
 *
 * 현재 메시지 하나만 보는 evaluateCrisisSignals와 달리, 최근 학생 메시지까지 함께 봅니다.
 * - 현재 메시지에 위기 키워드              → crisis
 * - 간접 신호가 최근에 이미 있었는데 또 나옴 → crisis (확인 질문 없이 바로 안내)
 * - 현재 메시지에 간접 신호만 있음          → concern + 안전 확인 질문
 * - 최근 메시지에 위기 키워드가 있었음       → concern (계속 주의)
 * - 우려 신호가 현재 또는 최근에 2번 이상    → concern
 */
import { CONCERN_KEYWORDS, CRISIS_KEYWORDS, INDIRECT_SIGNAL_KEYWORDS } from '../config/crisisConfig.ts';
import { findKeywords } from './crisisDetector.ts';

export type ConversationRiskLevel = 'safe' | 'concern' | 'crisis';

export interface ConversationRiskResult {
  riskLevel: ConversationRiskLevel;
  /** 간접 신호에 대해 안전 확인 질문을 해야 하는지 */
  needsSafetyCheck: boolean;
}

/** 최근 몇 개의 학생 메시지까지 볼지 */
const RECENT_USER_MESSAGES = 4;

export function evaluateConversationRisk(current: string, history: unknown): ConversationRiskResult {
  const recentUserTexts = (Array.isArray(history) ? history : [])
    .filter((m: any) => m && m.sender === 'user' && typeof m.text === 'string')
    .map((m: any) => m.text as string)
    .slice(-RECENT_USER_MESSAGES);

  const has = (text: string, list: readonly string[]) => findKeywords(text, list).length > 0;

  if (has(current, CRISIS_KEYWORDS)) {
    return { riskLevel: 'crisis', needsSafetyCheck: false };
  }

  const indirectNow = has(current, INDIRECT_SIGNAL_KEYWORDS);
  const indirectBefore = recentUserTexts.some((t) => has(t, INDIRECT_SIGNAL_KEYWORDS));
  const crisisBefore = recentUserTexts.some((t) => has(t, CRISIS_KEYWORDS));

  if (indirectNow && (indirectBefore || crisisBefore)) {
    return { riskLevel: 'crisis', needsSafetyCheck: false };
  }
  if (indirectNow) {
    return { riskLevel: 'concern', needsSafetyCheck: true };
  }
  if (crisisBefore) {
    return { riskLevel: 'concern', needsSafetyCheck: false };
  }

  const concernCount =
    (has(current, CONCERN_KEYWORDS) ? 1 : 0) +
    recentUserTexts.filter((t) => has(t, CONCERN_KEYWORDS) || has(t, INDIRECT_SIGNAL_KEYWORDS)).length;
  if (has(current, CONCERN_KEYWORDS) || concernCount >= 2) {
    return { riskLevel: 'concern', needsSafetyCheck: false };
  }

  return { riskLevel: 'safe', needsSafetyCheck: false };
}
