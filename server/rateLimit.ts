/**
 * 요청 횟수 제한 (Upstash Redis).
 *
 * - Gemini 무료 쿼터를 보호하기 위해 IP별(분/일) + 전체(일) 한도를 둡니다.
 * - 한도를 넘어도 오류를 내지 않고, 호출 측(chatService)이 Gemini 대신 내장 응답을 반환합니다.
 *   (위기 감지는 서버 내 규칙 기반이라 한도와 무관하게 항상 동작)
 * - Upstash 환경변수가 없거나 Redis 오류가 나면 제한 없이 통과(fail-open)시켜 상담이 끊기지 않게 합니다.
 *
 * 환경변수 (Vercel Marketplace의 Upstash 연동 시 자동 주입):
 *   KV_REST_API_URL / KV_REST_API_TOKEN  (또는 UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN)
 * 선택 환경변수 (숫자):
 *   RATE_LIMIT_PER_MIN (기본 20), RATE_LIMIT_PER_DAY (기본 300), RATE_LIMIT_GLOBAL_PER_DAY (기본 1000)
 *
 * 참고: 학교 Wi-Fi는 여러 학생이 같은 IP를 공유하므로 IP별 한도를 너무 낮게 잡지 마세요.
 */
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export interface LimiterLike {
  limit(key: string): Promise<{ success: boolean }>;
}

export interface Limiters {
  perMin: LimiterLike;
  perDay: LimiterLike;
  global: LimiterLike;
}

export interface RateLimitResult {
  limited: boolean;
  reason?: 'per_minute' | 'per_day' | 'global_daily';
}

function numEnv(name: string, fallback: number): number {
  const n = Number(process.env[name]);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

let cached: Limiters | null | undefined;
let redisClient: Redis | null = null;

/** Upstash 연결 정보가 없으면 null (제한 비활성) */
export function getLimiters(): Limiters | null {
  if (cached !== undefined) return cached;

  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    cached = null;
    return cached;
  }

  const redis = new Redis({ url, token });
  redisClient = redis;
  const make = (count: number, window: '1 m' | '1 d', prefix: string) =>
    new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(count, window),
      prefix: `maum-todak:${prefix}`,
    });

  cached = {
    perMin: make(numEnv('RATE_LIMIT_PER_MIN', 20), '1 m', 'min'),
    perDay: make(numEnv('RATE_LIMIT_PER_DAY', 300), '1 d', 'day'),
    global: make(numEnv('RATE_LIMIT_GLOBAL_PER_DAY', 1000), '1 d', 'global'),
  };
  return cached;
}

export async function checkRateLimit(
  ip: string,
  limiters: Limiters | null = getLimiters()
): Promise<RateLimitResult> {
  if (!limiters) return { limited: false };

  try {
    if (!(await limiters.perMin.limit(`ip:${ip}`)).success) {
      return { limited: true, reason: 'per_minute' };
    }
    if (!(await limiters.perDay.limit(`ip:${ip}`)).success) {
      return { limited: true, reason: 'per_day' };
    }
    if (!(await limiters.global.limit('all')).success) {
      return { limited: true, reason: 'global_daily' };
    }
    return { limited: false };
  } catch (error) {
    console.error('Rate limit check failed (fail-open):', error);
    return { limited: false };
  }
}

/** /api/health 에서 Upstash 연결 상태 확인용 (disabled: 환경변수 없음) */
export async function getRateLimitStatus(): Promise<'disabled' | 'ok' | 'error'> {
  if (!getLimiters() || !redisClient) return 'disabled';
  try {
    return (await redisClient.ping()) === 'PONG' ? 'ok' : 'error';
  } catch (error) {
    console.error('Upstash ping failed:', error);
    return 'error';
  }
}

/** Vercel/프록시 뒤의 실제 클라이언트 IP 추출 */
export function getClientIp(headers: Record<string, string | string[] | undefined> = {}): string {
  const pick = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
  const forwarded = pick(headers['x-forwarded-for']);
  if (forwarded) return forwarded.split(',')[0].trim();
  return pick(headers['x-real-ip'])?.trim() || 'unknown';
}
