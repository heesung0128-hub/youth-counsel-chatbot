
export const CRISIS_KEYWORDS = [
  '죽고싶',
  '죽고 싶',
  '자살',
  '자해',
  '손목',
  '살기싫',
  '살기 싫',
  '사라지고 싶',
  '사라지고싶',
  '끝내고 싶',
  '끝내고싶',
  '때렸',
  '맞았',
  '학대',
  '폭행',
  '가정폭력',
  '성폭력',
  '괴롭힘',
  '유서',
  '목숨',
  '뛰어내리',
];

export const CONCERN_KEYWORDS = [
  '우울해',
  '불안해',
  '너무 힘들어',
  '숨이 안 쉬어',
  '공황',
  '패닉',
  '가슴이 답답',
  '눈물이 멈추지',
  '아무것도 못하겠',
  '외로워',
  '왕따',
  '은따',
];

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

  const normalized = text.toLowerCase().replace(/\s+/g, ' ');

  // 1. Check High-Risk Crisis Keywords
  const matchedCrisis: string[] = [];
  for (const keyword of CRISIS_KEYWORDS) {
    if (normalized.includes(keyword.toLowerCase())) {
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
    if (normalized.includes(keyword.toLowerCase())) {
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
