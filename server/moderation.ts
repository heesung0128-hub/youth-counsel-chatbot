/**
 * 콘텐츠 필터: OpenAI Moderation API (무료)
 *
 * - 학생 입력: 자해 관련 신호를 위험도 판단에 더함 (자해 의도·방법 → 위기, 자해 → 안전 확인 질문)
 * - AI 답변: 학생에게 부적절한 내용이 감지되면 보내지 않고 안전한 내장 응답으로 바꿈
 * - 필터 호출이 실패해도 상담은 계속 진행 (fail-open, 로그만 남김)
 *
 * 환경변수:
 *   MODERATION_ENABLED         (기본 켜짐. "false"면 끔)
 *   OPENAI_MODERATION_MODEL    (기본 omni-moderation-latest)
 */
import { getOpenAIBaseUrl } from './aiConfig.ts';

export type ModerationCategories = Record<string, boolean>;

export interface ModerationResult {
  flagged: boolean;
  categories: ModerationCategories;
}

export function isModerationEnabled(): boolean {
  return (process.env.MODERATION_ENABLED || '').trim().toLowerCase() !== 'false' && !!process.env.OPENAI_API_KEY?.trim();
}

/** 학생 입력의 자해 신호 → 위험도 판단에 더할 값 */
export function inputSignal(result: ModerationResult | null): 'crisis' | 'safety_check' | 'concern' | null {
  if (!result) return null;
  const c = result.categories;
  if (c['self-harm/intent'] || c['self-harm/instructions']) return 'crisis';
  if (c['self-harm']) return 'safety_check';
  // 미성년자 대상 성적 내용은 피해 사실을 털어놓는 경우일 수 있어 연계 안내가 필요한 '우려'로 봄
  if (c['sexual/minors']) return 'concern';
  return null;
}

/**
 * AI 답변에서 학생에게 보내면 안 되는 범주.
 * 위기 안내 답변은 자살·자해를 언급할 수 있으므로 self-harm, self-harm/intent 는 막지 않음.
 */
export const BLOCKED_OUTPUT_CATEGORIES = [
  'sexual',
  'sexual/minors',
  'harassment/threatening',
  'hate',
  'hate/threatening',
  'illicit',
  'illicit/violent',
  'self-harm/instructions',
  'violence/graphic',
] as const;

export function blockedOutputCategories(result: ModerationResult | null): string[] {
  if (!result) return [];
  return BLOCKED_OUTPUT_CATEGORIES.filter((k) => result.categories[k]);
}

/** Moderation API 호출. 실패하면 null (상담은 계속) */
export async function moderate(text: string, timeoutMs = 5000): Promise<ModerationResult | null> {
  if (!isModerationEnabled() || !text.trim()) return null;
  try {
    const res = await fetch(`${getOpenAIBaseUrl()}/moderations`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY?.trim() ?? ''}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: (process.env.OPENAI_MODERATION_MODEL || '').trim() || 'omni-moderation-latest',
        input: text,
      }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.error(`[moderation_error] status=${res.status}`);
      return null;
    }
    const data: any = await res.json();
    const r = data?.results?.[0];
    if (!r) return null;
    return { flagged: !!r.flagged, categories: (r.categories ?? {}) as ModerationCategories };
  } catch (error) {
    console.error('[moderation_error]', error instanceof Error ? error.message : error);
    return null;
  }
}
