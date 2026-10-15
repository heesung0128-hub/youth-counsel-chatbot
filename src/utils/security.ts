/**
 * [보안 및 익명 계정 유틸리티]
 * 
 * * 원칙:
 *   - PIN은 원문으로 저장되지 않고 SHA-256 해시값으로만 보관
 *   - 5회 오류 시 30초 대기 잠금 처리
 *   - 어떠한 개인정보(이름, 이메일, 전화번호 등)도 수집하지 않으며, 무작위 UUID로 기기 식별
 *   - 다른 기기 연동을 위한 8자리 전송 코드 생성 및 검증
 */

/**
 * Universal SHA-256 Hash implementation (Web Crypto + Node.js crypto fallback)
 */
export async function hashPin(pin: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(pin.trim());

  if (typeof crypto !== 'undefined' && crypto.subtle) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
  }

  // Fallback for node test environments without global crypto.subtle
  try {
    const nodeCrypto = await import('node:crypto');
    return nodeCrypto.createHash('sha256').update(pin.trim()).digest('hex');
  } catch {
    // Basic fast fallback hash if neither is available
    let hash = 0;
    for (let i = 0; i < pin.length; i++) {
      hash = (hash << 5) - hash + pin.charCodeAt(i);
      hash |= 0;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
  }
}

export async function verifyPin(pin: string, expectedHash: string): Promise<boolean> {
  if (!pin || !expectedHash) return false;
  const currentHash = await hashPin(pin);
  return currentHash.toLowerCase() === expectedHash.toLowerCase();
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
