
import { CRISIS_KEYWORDS, CONCERN_KEYWORDS } from '../config/crisisConfig.ts';

export { CRISIS_KEYWORDS, CONCERN_KEYWORDS };

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
  if (!text || typeof text !== 'string') {
    return {
      riskLevel: 'safe',
      matchedKeywords: [],
      shouldPinEmergencyCard: false,
      priorityNotice: null,
    };
  }

  // 띄어쓰기 변형("죽고 싶" / "죽고싶")을 모두 잡기 위해 공백을 제거한 텍스트로 비교
  const normalized = text.toLowerCase().replace(/\s+/g, '');
  const matches = (keyword: string) =>
    normalized.includes(keyword.toLowerCase().replace(/\s+/g, ''));

  // 1. Check High-Risk Crisis Keywords
  const matchedCrisis: string[] = [];
  for (const keyword of CRISIS_KEYWORDS) {
    if (matches(keyword)) {
      matchedCrisis.push(keyword);
    }
  }

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
  const matchedConcern: string[] = [];
  for (const keyword of CONCERN_KEYWORDS) {
    if (matches(keyword)) {
      matchedConcern.push(keyword);
    }
  }

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
