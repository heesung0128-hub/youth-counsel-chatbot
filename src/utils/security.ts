/**
 * [보안 및 익명 계정 유틸리티]
 * 
 * * 원칙:
 *   - PIN은 원문으로 저장되지 않고, 기기마다 다른 무작위 솔트를 넣은 PBKDF2-SHA256 해시로만 보관
 *     (저장 형식: "pbkdf2-sha256$반복횟수$솔트(hex)$해시(hex)")
 *   - 이전 버전의 솔트 없는 SHA-256 해시도 검증되며, 잠금 해제에 성공하면 새 형식으로 자동 교체
 *   - 5회 오류 시 30초 대기 잠금 처리
 *   - 어떠한 개인정보(이름, 이메일, 전화번호 등)도 수집하지 않으며, 무작위 UUID로 기기 식별
 *   - 다른 기기 연동을 위한 8자리 전송 코드 생성 및 검증
 *
 * 참고: 4자리 PIN은 경우의 수가 1만 개뿐이라 해시만으로 완벽히 보호되지는 않습니다.
 *       PIN 잠금은 "기기를 잠깐 빌린 사람이 대화를 보는 것"을 막는 용도입니다.
 */

const PBKDF2_PREFIX = 'pbkdf2-sha256';
const PBKDF2_ITERATIONS = 200_000;
const SALT_BYTES = 16;

const toHex = (bytes: Uint8Array) => Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
const fromHex = (hex: string): Uint8Array<ArrayBuffer> =>
  new Uint8Array((hex.match(/.{2}/g) ?? []).map((h) => parseInt(h, 16)));

function getSubtle(): SubtleCrypto {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    // 브라우저(HTTPS/localhost)와 Node 20+에는 항상 있음. 없으면 안전하지 않은 대체 해시를 쓰지 않고 실패시킴
    throw new Error('Web Crypto API is not available');
  }
  return crypto.subtle;
}

async function pbkdf2(pin: string, salt: Uint8Array<ArrayBuffer>, iterations: number): Promise<Uint8Array> {
  const subtle = getSubtle();
  const key = await subtle.importKey('raw', new TextEncoder().encode(pin.trim()), 'PBKDF2', false, ['deriveBits']);
  const bits = await subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt, iterations }, key, 256);
  return new Uint8Array(bits);
}

async function legacySha256(pin: string): Promise<string> {
  const digest = await getSubtle().digest('SHA-256', new TextEncoder().encode(pin.trim()));
  return toHex(new Uint8Array(digest));
}

/** 길이가 같은 두 문자열을 시간 차이 없이 비교 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function hashPin(pin: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await pbkdf2(pin, salt, PBKDF2_ITERATIONS);
  return `${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$${toHex(salt)}$${toHex(hash)}`;
}

export async function verifyPin(pin: string, expectedHash: string): Promise<boolean> {
  if (!pin || !expectedHash) return false;

  if (expectedHash.startsWith(`${PBKDF2_PREFIX}$`)) {
    const [, iterText, saltHex, hashHex] = expectedHash.split('$');
    const iterations = Number(iterText);
    if (!Number.isInteger(iterations) || iterations <= 0 || !saltHex || !hashHex) return false;
    const actual = await pbkdf2(pin, fromHex(saltHex), iterations);
    return constantTimeEqual(toHex(actual), hashHex.toLowerCase());
  }

  // 이전 버전(솔트 없는 SHA-256) 호환
  return constantTimeEqual(await legacySha256(pin), expectedHash.toLowerCase());
}

/** 이전 형식 해시라 새 형식으로 다시 저장해야 하는지 */
export function needsRehash(storedHash: string | null | undefined): boolean {
  return !!storedHash && !storedHash.startsWith(`${PBKDF2_PREFIX}$${PBKDF2_ITERATIONS}$`);
}

/**
 * Generate cryptographically random Anonymous ID (UUID v4)
 */
export function generateAnonymousId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Generates an 8-character device transfer code from Anonymous ID (e.g. "SC-9824AB")
 */
export function generateTransferCode(anonymousId: string): string {
  const clean = anonymousId.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
  const segment = (clean.slice(0, 6) || 'SEOCHO').padEnd(6, 'X');
  return `SC-${segment}`;
}

export function validateTransferCode(code: string): boolean {
  if (!code) return false;
  const trimmed = code.trim().toUpperCase();
  return /^SC-[A-Z0-9]{6}$/.test(trimmed);
}

/**
 * Lockout check
 * After 5 failed attempts, 30 seconds lockout is applied.
 */
export function checkLockoutStatus(
  failedAttempts: number,
  lockedUntil: number | null,
  currentTime: number = Date.now()
): { isLocked: boolean; remainingSeconds: number } {
  if (lockedUntil && lockedUntil > currentTime) {
    const remaining = Math.max(1, Math.ceil((lockedUntil - currentTime) / 1000));
    return { isLocked: true, remainingSeconds: remaining };
  }
  return { isLocked: false, remainingSeconds: 0 };
}

export function getNextLockStateOnFailure(
  currentAttempts: number,
  currentTime: number = Date.now()
): { failedAttempts: number; lockedUntil: number | null } {
  const nextAttempts = currentAttempts + 1;
  if (nextAttempts >= 5) {
    return {
      failedAttempts: nextAttempts,
      lockedUntil: currentTime + 30 * 1000, // 30 seconds
    };
  }
  return {
    failedAttempts: nextAttempts,
    lockedUntil: null,
  };
}
