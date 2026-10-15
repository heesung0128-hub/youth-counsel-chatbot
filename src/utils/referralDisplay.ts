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
