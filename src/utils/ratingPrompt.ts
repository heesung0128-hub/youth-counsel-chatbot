/**
 * 앱 평가 팝업을 띄울 때를 정하는 규칙
 * - 캐릭터 답변이 6개 이상 쌓였을 때 한 번
 * - "나중에"를 누르면 답변 12개 뒤에 한 번만 더 (그 뒤로는 묻지 않음)
 * - 평가를 마쳤으면 다시 묻지 않음
 * - 학생이 힘든 이야기를 하는 중(마지막 답변이 우려·위기)에는 띄우지 않음
 */
export type RatingPromptState =
  | { status: 'none' }
  | { status: 'later'; atCount: number }
  | { status: 'done' };

export const FIRST_PROMPT_AT = 6;
export const RETRY_AFTER = 12;

export function shouldPromptRating(
  state: RatingPromptState,
  counselorReplyCount: number,
  lastRiskLevel: 'safe' | 'concern' | 'crisis' | undefined
): boolean {
  if (lastRiskLevel && lastRiskLevel !== 'safe') return false;
  if (state.status === 'done') return false;
  if (state.status === 'later') return counselorReplyCount >= state.atCount + RETRY_AFTER;
  return counselorReplyCount >= FIRST_PROMPT_AT;
}

/** "나중에"를 누른 뒤 상태. 이미 한 번 미뤘다면 더는 묻지 않음 */
export function postponeRating(state: RatingPromptState, counselorReplyCount: number): RatingPromptState {
  return state.status === 'later' ? { status: 'done' } : { status: 'later', atCount: counselorReplyCount };
}

export function loadRatingState(raw: string | null): RatingPromptState {
  try {
    const parsed = raw ? JSON.parse(raw) : null;
    if (parsed?.status === 'done') return { status: 'done' };
    if (parsed?.status === 'later' && Number.isFinite(parsed.atCount)) return { status: 'later', atCount: parsed.atCount };
  } catch {
    // 손상된 값은 처음 상태로
  }
  return { status: 'none' };
}
