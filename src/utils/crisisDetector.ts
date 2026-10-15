import { CRISIS_KEYWORDS, CONCERN_KEYWORDS } from '../config/crisisConfig.ts';

export { CRISIS_KEYWORDS, CONCERN_KEYWORDS };

/** 공백·대소문자를 무시하고 text에 포함된 키워드 목록을 반환 ("죽고 싶" / "죽고싶" 모두 일치) */
export function findKeywords(text: string, keywords: readonly string[]): string[] {
  if (!text || typeof text !== 'string') return [];
  const normalized = text.toLowerCase().replace(/\s+/g, '');
  return keywords.filter((k) => normalized.includes(k.toLowerCase().replace(/\s+/g, '')));
}

export interface CrisisEvaluationResult {
  riskLevel: 'safe' | 'concern' | 'crisis';
  matchedKeywords: string[];
  shouldPinEmergencyCard: boolean;
  priorityNotice: string | null;
}

/**
 * Pure function to evaluate text for crisis or concern signals.
 * Operates deterministically without relying on network or LLM availability.
 */
export function evaluateCrisisSignals(text: string): CrisisEvaluationResult {
  // 1. Check High-Risk Crisis Keywords
  const matchedCrisis = findKeywords(text, CRISIS_KEYWORDS);
  if (matchedCrisis.length > 0) {
    return {
      riskLevel: 'crisis',
      matchedKeywords: matchedCrisis,
      shouldPinEmergencyCard: true,
      priorityNotice:
        '지금 많이 힘들고 위험한 상황일 수 있어요. 24시간 언제나 열려 있는 안전 상담망(1388, 109)에 즉시 도움을 요청할 수 있어요.',
    };
  }

  // 2. Check Moderate Concern Keywords
  const matchedConcern = findKeywords(text, CONCERN_KEYWORDS);
  if (matchedConcern.length > 0) {
    return {
      riskLevel: 'concern',
      matchedKeywords: matchedConcern,
      shouldPinEmergencyCard: false,
      priorityNotice:
        '마음이 많이 무거워 보여요. 편안히 이야기를 나누고, 필요하면 실제 전문 상담사와도 익명으로 이야기해볼 수 있어요.',
    };
  }

  return {
    riskLevel: 'safe',
    matchedKeywords: [],
    shouldPinEmergencyCard: false,
    priorityNotice: null,
  };
}
