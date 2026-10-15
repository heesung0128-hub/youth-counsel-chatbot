/**
 * 모델 응답을 학생에게 보내기 전 서버에서 확정하는 규칙.
 * 프롬프트만으로는 매번 지켜지지 않는 부분을 결정적으로 보장합니다.
 */

export type RiskLevel = 'safe' | 'concern' | 'crisis';

const EMOJI = /\p{Extended_Pictographic}️?/gu;
const HAS_EMOJI = /\p{Extended_Pictographic}/u;

interface HistoryItem {
  sender?: unknown;
  text?: unknown;
}

/** 직전 캐릭터 답변에 이모지가 있었다면 이번 답변의 이모지는 제거 (연속 사용 방지) */
export function avoidConsecutiveEmoji(message: string, history: unknown): string {
  if (!Array.isArray(history)) return message;
  const lastCounselor = [...history]
    .reverse()
    .find((m: HistoryItem) => m && m.sender !== 'user' && typeof m.text === 'string') as HistoryItem | undefined;
  if (!lastCounselor || !HAS_EMOJI.test(String(lastCounselor.text))) return message;
  const stripped = message.replace(EMOJI, '').replace(/[ \t]{2,}/g, ' ').trim();
  return stripped || message;
}

/**
 * 안전 확인 질문(간접 위기 신호에 대한 1차 확인) 처리.
 * - 위기 키워드(규칙 기반)나 최종 판정이 crisis면 확인 질문 없이 즉시 위기 안내
 * - 확인 질문 턴에는 연계 카드 대신 화면의 작은 안내(1388)만 표시
 */
export function resolveSafetyCheck(input: {
  finalRiskLevel: RiskLevel;
  heuristicRiskLevel: RiskLevel;
  modelSafetyCheck: unknown;
  modelOfferReferral: unknown;
}): { safetyCheck: boolean; shouldOfferReferral: boolean } {
  const { finalRiskLevel, heuristicRiskLevel, modelSafetyCheck, modelOfferReferral } = input;

  if (finalRiskLevel === 'crisis' || heuristicRiskLevel === 'crisis') {
    return { safetyCheck: false, shouldOfferReferral: true };
  }
  if (modelSafetyCheck === true) {
    return { safetyCheck: true, shouldOfferReferral: false };
  }
  return {
    safetyCheck: false,
    shouldOfferReferral:
      typeof modelOfferReferral === 'boolean' ? modelOfferReferral : finalRiskLevel === 'concern',
  };
}

/**
 * 서버 규칙(위기 키워드·대화 흐름)으로 위기가 됐는데 모델은 위기로 보지 않은 턴은
 * 모델 답변(가벼운 말투일 수 있음) 대신 캐릭터별 차분한 위기 안내 문장을 사용.
 */
export function chooseCrisisSafeMessage(input: {
  modelRiskLevel: unknown;
  finalRiskLevel: RiskLevel;
  modelMessage: string;
  crisisMessage: string;
}): { message: string; overridden: boolean } {
  const { modelRiskLevel, finalRiskLevel, modelMessage, crisisMessage } = input;
  if (finalRiskLevel === 'crisis' && modelRiskLevel !== 'crisis') {
    return { message: crisisMessage, overridden: true };
  }
  return { message: modelMessage, overridden: false };
}
