/**
 * 연계 기관 정보 표시 유틸리티.
 *
 * referralConfig.ts 에서 대괄호 [ ] 로 감싼 값은 "아직 확정되지 않은 자리표시자"로 보고
 * 학생 화면에 표시하지 않습니다. 확정되면 대괄호 없이 실제 값을 입력하면 바로 표시됩니다.
 */
export function isPlaceholder(value: string | undefined | null): boolean {
  if (!value) return true;
  const trimmed = value.trim();
  return trimmed === '' || (trimmed.startsWith('[') && trimmed.endsWith(']'));
}

/** 표시 가능한 값이면 그대로, 자리표시자면 null */
export function displayValue(value: string | undefined | null): string | null {
  return isPlaceholder(value) ? null : (value as string).trim();
}

interface ReferralHistoryItem {
  sender: string;
  isReferralOffer?: boolean;
  referralStage?: 2 | 3;
}

/**
 * 연계 카드를 이번 답변에 붙일지 결정.
 * 같은 단계(또는 더 높은 단계)의 카드를 최근 캐릭터 답변 3개 안에서 이미 보여 줬다면 반복하지 않음.
 * 단계가 올라가면(2단계 → 3단계 위기) 다시 보여 줌.
 */
export function shouldShowReferralCard(
  previousMessages: ReferralHistoryItem[],
  offer: boolean,
  stage: 2 | 3
): boolean {
  if (!offer) return false;
  const recentCounselor = previousMessages.filter((m) => m.sender === 'counselor').slice(-3);
  return !recentCounselor.some((m) => m.isReferralOffer && (m.referralStage ?? 2) >= stage);
}
