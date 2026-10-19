/**
 * 개인정보 감지·가리기
 *
 * - detectPersonalInfo: 학생이 보내기 전에 "개인정보 같아 보여요" 경고를 띄우는 데 사용 (앱)
 * - maskPersonalInfo  : AI 서비스로 보내기 전, 저장하기 전에 확실한 형태(전화번호·이메일·긴 숫자·동호수)를 가림 (서버)
 *
 * 이름·학교명은 모양만으로 확실히 가려낼 수 없어 가리지는 않고, 감지되면 학생에게 확인만 받습니다.
 */

export type PersonalInfoKind = 'phone' | 'email' | 'number' | 'address' | 'school' | 'classInfo' | 'name';

export const PERSONAL_INFO_LABELS: Record<PersonalInfoKind, string> = {
  phone: '전화번호',
  email: '이메일',
  number: '학번·긴 숫자',
  address: '집 주소(동·호수)',
  school: '학교 이름',
  classInfo: '학년·반',
  name: '이름',
};

const PATTERNS: Array<[PersonalInfoKind, RegExp]> = [
  ['phone', /0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}/],
  ['email', /[\w.+-]+@[\w-]+\.[\w.-]+/],
  ['address', /\d+\s*동\s*\d+\s*호/],
  ['number', /\d{6,}/],
  ['school', /[가-힣]{1,10}(고등학교|중학교|초등학교|여자고|여고|여중|남고|남중)(?![가-힣])/],
  ['classInfo', /\d\s*학년\s*\d{1,2}\s*반/],
  ['name', /(내|제|나의|저의)\s*이름은\s*[가-힣]{2,4}/],
];

/** 메시지에서 개인정보로 보이는 종류 목록 (중복 없이) */
export function detectPersonalInfo(text: string): PersonalInfoKind[] {
  if (!text) return [];
  const found: PersonalInfoKind[] = [];
  for (const [kind, re] of PATTERNS) {
    if (re.test(text) && !(kind === 'number' && found.includes('phone'))) found.push(kind);
  }
  return found;
}

/** 확실한 형태의 개인정보를 [가림]으로 바꿈 */
export function maskPersonalInfo(text: string): string {
  if (!text) return text;
  return text
    .replace(/0\d{1,2}[-\s.]?\d{3,4}[-\s.]?\d{4}/g, '[가림]')
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, '[가림]')
    .replace(/\d+\s*동\s*\d+\s*호/g, '[가림]')
    .replace(/\d{6,}/g, '[가림]');
}
