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

/**
 * 구글 서버 과부하(500/503)일 때만 잠시 뒤 한 번 다시 시도.
 * - 두 번의 시도가 하나의 제한 시간(timeoutMs)을 함께 씀 → Vercel 함수 제한(30초)을 넘지 않음
 * - 남은 시간이 부족하면 재시도하지 않고 바로 실패(→ 내장 응답)
 * - 한도 초과(429)·키 오류 등은 다시 시도해도 같으므로 재시도하지 않음
 */
export async function withOverloadRetry<T>(
  call: (signal: AbortSignal) => Promise<T>,
  options: {
    timeoutMs: number;
    retryDelayMs?: number;
    minRemainingMs?: number;
    sleep?: (ms: number) => Promise<void>;
    now?: () => number;
  }
): Promise<T> {
  const {
    timeoutMs,
    retryDelayMs = 1200,
    minRemainingMs = 5000,
    sleep = (ms) => new Promise((r) => setTimeout(r, ms)),
    now = Date.now,
  } = options;
  const deadline = now() + timeoutMs;
  const signal = AbortSignal.timeout(timeoutMs);
  try {
    return await call(signal);
  } catch (error) {
    const remaining = deadline - now();
    if (classifyGeminiError(error) !== 'model_overloaded' || remaining < retryDelayMs + minRemainingMs) {
      throw error;
    }
    console.warn(`[gemini_retry] reason=model_overloaded remainingMs=${remaining}`);
    await sleep(retryDelayMs);
    return await call(signal);
  }
}
