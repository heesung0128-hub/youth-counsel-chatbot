/**
 * AI(OpenAI) 호출 설정과 실패 사유 분류.
 *
 * 환경변수:
 *   OPENAI_API_KEY           (필수) OpenAI API 키. 없으면 내장 응답으로만 동작
 *   OPENAI_MODEL             (기본 gpt-6-luna: 가장 저렴하고 빠른 모델)
 *   OPENAI_REASONING_EFFORT  (기본 low. none | low | medium | high) 높을수록 규칙을 잘 지키지만 느리고 비쌈
 *   OPENAI_BASE_URL          (기본 https://api.openai.com/v1) 지역 엔드포인트를 쓸 때만 변경
 *   AI_TIMEOUT_MS            (기본 20000. Vercel 함수 제한 30초보다 짧게 유지)
 */

export const DEFAULT_OPENAI_MODEL = 'gpt-6-luna';
export type ReasoningEffort = 'none' | 'low' | 'medium' | 'high';

export function getOpenAIModel(): string {
  return (process.env.OPENAI_MODEL || '').trim() || DEFAULT_OPENAI_MODEL;
}

export function getReasoningEffort(): ReasoningEffort {
  const raw = (process.env.OPENAI_REASONING_EFFORT || '').trim().toLowerCase();
  return raw === 'none' || raw === 'medium' || raw === 'high' ? raw : 'low';
}

export function getOpenAIBaseUrl(): string {
  return ((process.env.OPENAI_BASE_URL || '').trim() || 'https://api.openai.com/v1').replace(/\/$/, '');
}

export function getTimeoutMs(): number {
  const n = Number(process.env.AI_TIMEOUT_MS);
  return Number.isFinite(n) && n >= 1000 ? Math.floor(n) : 20000;
}

/**
 * 내장 응답으로 대체된 이유 (응답의 fallbackReason, 서버 로그에 기록)
 * - quota_exceeded  : 429, 분당 한도 초과 또는 결제 크레딧 부족(insufficient_quota)
 * - model_overloaded: 500/503, OpenAI 서버 과부하·일시 장애
 * - invalid_request : 400, 잘못된 모델명·요청 형식
 * - auth_error      : 401/403, API 키 문제
 * - model_not_found : 404, 존재하지 않거나 접근 권한이 없는 모델
 * - timeout         : AI_TIMEOUT_MS 초과
 * - refused         : 모델이 안전 정책으로 답변을 거절
 * - empty_response  : 모델이 빈 응답을 반환(또는 길이 제한으로 잘림)
 * - parse_error     : 모델 응답 JSON 해석 실패
 * - unknown         : 그 외
 */
export type AiFailureReason =
  | 'quota_exceeded'
  | 'model_overloaded'
  | 'invalid_request'
  | 'auth_error'
  | 'model_not_found'
  | 'timeout'
  | 'refused'
  | 'empty_response'
  | 'parse_error'
  | 'unknown';

export class EmptyResponseError extends Error {}
export class RefusalError extends Error {}

export function classifyAiError(error: unknown): AiFailureReason {
  if (error instanceof EmptyResponseError) return 'empty_response';
  if (error instanceof RefusalError) return 'refused';
  if (error instanceof SyntaxError) return 'parse_error';

  const err = error as { name?: string; status?: unknown; message?: unknown } | null;
  if (err?.name === 'AbortError' || err?.name === 'TimeoutError') return 'timeout';

  const status = typeof err?.status === 'number' ? err.status : undefined;
  const message = typeof err?.message === 'string' ? err.message : '';
  if (/invalid_api_key|Incorrect API key/i.test(message)) return 'auth_error';
  if (/insufficient_quota/i.test(message)) return 'quota_exceeded';
  if (status === 429) return 'quota_exceeded';
  if (status === 401 || status === 403) return 'auth_error';
  if (status === 404 || /model_not_found/i.test(message)) return 'model_not_found';
  if (status === 400) return 'invalid_request';
  if (status !== undefined && status >= 500) return 'model_overloaded';

  if (/overloaded|server_error|service unavailable/i.test(message)) return 'model_overloaded';
  if (/aborted|timed? ?out/i.test(message)) return 'timeout';
  return 'unknown';
}

/**
 * OpenAI 서버 과부하(500/503)일 때만 잠시 뒤 한 번 다시 시도.
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
    if (classifyAiError(error) !== 'model_overloaded' || remaining < retryDelayMs + minRemainingMs) {
      throw error;
    }
    console.warn(`[ai_retry] reason=model_overloaded remainingMs=${remaining}`);
    await sleep(retryDelayMs);
    return await call(signal);
  }
}
