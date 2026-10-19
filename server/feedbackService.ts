/**
 * 앱 평가·피드백 저장 (Upstash Redis)
 *
 * - POST: 학생이 남긴 별점(1~5)과 의견을 익명으로 저장합니다. IP·기기 ID는 저장하지 않습니다.
 * - GET : 교사용 조회. 환경변수 FEEDBACK_ADMIN_TOKEN 과 같은 값을 Authorization: Bearer 헤더로 보내야 합니다.
 *         (토큰을 설정하지 않으면 조회 기능은 꺼져 있음)
 * - 의견 글에 전화번호처럼 보이는 숫자가 있으면 가려서 저장합니다.
 */
import { Ratelimit } from '@upstash/ratelimit';
import type { Redis } from '@upstash/redis';
import { getRedis } from './rateLimit.ts';
import type { ServiceResult } from './chatService.ts';

export const FEEDBACK_KEY = 'maum-todak:feedback';
const MAX_TEXT = 500;
const MAX_STORED = 2000;
const COUNSELOR_IDS = ['cat', 'dog', 'monkey'];

export interface FeedbackEntry {
  kind: 'rating' | 'feedback';
  rating: number | null;
  text: string;
  counselorId: string | null;
  at: string;
}

/** 전화번호·긴 숫자열 가리기 (개인정보 보호) */
export function maskPersonalInfo(text: string): string {
  return text
    .replace(/0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}/g, '***')
    .replace(/\d{6,}/g, '***');
}

/** 입력 검증. 잘못된 값이면 오류 메시지 문자열 */
export function parseFeedback(raw: unknown, now = new Date()): FeedbackEntry | string {
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  const kind = body.kind === 'rating' || body.kind === 'feedback' ? body.kind : null;
  if (!kind) return 'kind must be rating or feedback';

  const ratingNum = Number(body.rating);
  const rating = Number.isInteger(ratingNum) && ratingNum >= 1 && ratingNum <= 5 ? ratingNum : null;
  const text = typeof body.text === 'string' ? maskPersonalInfo(body.text.trim().slice(0, MAX_TEXT)) : '';

  if (kind === 'rating' && rating === null) return 'rating must be 1~5';
  if (kind === 'feedback' && !text) return 'text is required';

  const counselorId = typeof body.counselorId === 'string' && COUNSELOR_IDS.includes(body.counselorId) ? body.counselorId : null;
  return { kind, rating, text, counselorId, at: now.toISOString() };
}

let limiter: Ratelimit | null | undefined;
function getFeedbackLimiter(redis: Redis): Ratelimit {
  if (!limiter) {
    limiter = new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 h'), prefix: 'maum-todak:feedback-limit' });
  }
  return limiter;
}

export async function saveFeedback(rawBody: unknown, clientIp: string): Promise<ServiceResult> {
  const parsed = parseFeedback(rawBody);
  if (typeof parsed === 'string') return { status: 400, body: { error: parsed } };

  const redis = getRedis();
  if (!redis) return { status: 503, body: { error: 'storage not configured' } };

  try {
    // IP는 같은 사람이 짧은 시간에 너무 많이 보내는 것을 막는 데만 쓰고 저장하지 않음
    if (!(await getFeedbackLimiter(redis).limit(`ip:${clientIp}`)).success) {
      return { status: 429, body: { error: 'too many requests' } };
    }
    await redis.lpush(FEEDBACK_KEY, JSON.stringify(parsed));
    await redis.ltrim(FEEDBACK_KEY, 0, MAX_STORED - 1);
    return { status: 200, body: { stored: true } };
  } catch (error) {
    console.error('Feedback save failed:', error);
    return { status: 503, body: { error: 'storage error' } };
  }
}

export async function listFeedback(authorization: string | undefined): Promise<ServiceResult> {
  const token = process.env.FEEDBACK_ADMIN_TOKEN;
  if (!token) return { status: 404, body: { error: 'not enabled' } };
  if (authorization !== `Bearer ${token}`) return { status: 401, body: { error: 'unauthorized' } };

  const redis = getRedis();
  if (!redis) return { status: 503, body: { error: 'storage not configured' } };
  const rows = await redis.lrange<FeedbackEntry | string>(FEEDBACK_KEY, 0, MAX_STORED - 1);
  const entries = rows.map((r) => (typeof r === 'string' ? JSON.parse(r) : r));
  return { status: 200, body: { count: entries.length, entries } };
}
