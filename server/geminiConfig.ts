/**
 * Gemini 호출 설정과 실패 사유 분류.
 *
 * 환경변수:
 *   GEMINI_MODEL           (기본 gemini-3.5-flash-lite: 무료 일일 한도가 넉넉하고 가장 빠름)
 *   GEMINI_THINKING_LEVEL  (기본 LOW. MINIMAL | LOW | MEDIUM | HIGH)
 *   GEMINI_TIMEOUT_MS      (기본 20000. Vercel 함수 제한 30초보다 짧게 유지)
 */
import { ThinkingLevel } from '@google/genai';

export const DEFAULT_GEMINI_MODEL = 'gemini-3.5-flash-lite';

export function getGeminiModel(): string {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

export function getThinkingLevel(): ThinkingLevel {
  const raw = (process.env.GEMINI_THINKING_LEVEL || '').trim().toUpperCase();
  switch (raw) {
    case 'MINIMAL':
      return ThinkingLevel.MINIMAL;
    case 'MEDIUM':
      return ThinkingLevel.MEDIUM;
    case 'HIGH':
      return ThinkingLevel.HIGH;
    default:
      return ThinkingLevel.LOW;
  }
}

export function getTimeoutMs(): number {
  const n = Number(process.env.GEMINI_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 1000 ? Math.floor(n) : 20000;
}

/**
 * 내장 응답으로 대체된 이유 (응답의 fallbackReason, 서버 로그에 기록)
 * - quota_exceeded : 429, 분당/일일 무료 한도 초과
 * - model_overloaded: 500/503, 구글 서버 과부하·일시 장애
 * - invalid_request : 400, 잘못된 모델명·요청 형식
 * - auth_error      : 401/403, API 키 문제
 * - model_not_found : 404, 존재하지 않거나 접근 불가한 모델
 * - timeout         : GEMINI_TIMEOUT_MS 초과
 * - empty_response  : 모델이 빈 응답을 반환
 * - parse_error     : 모델 응답 JSON 해석 실패
 * - unknown         : 그 외
 */
export type GeminiFailureReason =
  | 'quota_exceeded'
  | 'model_overloaded'
  | 'invalid_request'
  | 'auth_error'
  | 'model_not_found'
  | 'timeout'
  | 'empty_response'
  | 'parse_error'
  | 'unknown';

export class EmptyResponseError extends Error {}

export function classifyGeminiError(error: unknown): GeminiFailureReason {
  if (error instanceof EmptyResponseError) return 'empty_response';
  if (error instanceof SyntaxError) return 'parse_error';

  const err = error as { name?: string; status?: unknown; message?: unknown } | null;
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError') return 'timeout';

  const status = typeof err?.status === 'number' ? err.status : undefined;
  const message = typeof err?.message === 'string' ? err.message : '';
  // 잘못된 API 키는 400(INVALID_ARGUMENT)으로 오므로 메시지로 먼저 구분
  if (/API key (not valid|expired)|API_KEY_INVALID/i.test(message)) return 'auth_error';
  if (status === 429) return 'quota_exceeded';
  if (status === 401 || status === 403) return 'auth_error';
  if (status === 404) return 'model_not_found';
  if (status === 400) return 'invalid_request';
  if (status !== undefined && status >= 500) return 'model_overloaded';

  if (/RESOURCE_EXHAUSTED|quota/i.test(message)) return 'quota_exceeded';
  if (/UNAVAILABLE|overloaded/i.test(message)) return 'model_overloaded';
  if (/aborted|timed? ?out/i.test(message)) return 'timeout';
  return 'unknown';
}
