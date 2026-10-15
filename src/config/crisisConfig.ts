/**
 * [위기 상황 긴급 연락처 및 안전 절차 설정]
 * 
 * * 필수 안전 원칙:
 *   학생이 자해, 극단적 선택 생각, 신체적 폭력 및 학대 등 위험에 직면했을 때
 *   AI 응답 여부나 네트워크 상태와 무관하게 즉각적이고 확고한 안전 지원망을 제공합니다.
 * 
 * * 검토 안내:
 *   교내 Wee클래스 담당 선생님 및 청소년 상담 전문가가 이 파일의 위기 대응 문구와
 *   안내 연락처를 직접 검토하고 수정할 수 있도록 분리되어 있습니다.
 */

export interface EmergencyContact {
  name: string;
  number: string;
  description: string;
  badge: string;
  isCallAvailable: boolean;
  smsAvailable?: string;
  kakaoAvailable?: string;
}

export const EMERGENCY_HOTLINES: EmergencyContact[] = [
  {
    name: '자살예방 상담전화',
    number: '109',
    description: '24시간 언제나 통화 가능한 국가 자살예방 및 심리위기 핫라인',
    badge: '24시간 무료',
    isCallAvailable: true,
  },
  {
    name: '청소년상담 1388',
    number: '1388',
    description: '청소년만을 위한 24시간 전문 상담전화 (문자, 카카오톡 상담 가능)',
    badge: '청소년 전용',
    isCallAvailable: true,
    smsAvailable: '#1388 (무료 문자)',
    kakaoAvailable: '카카오톡 채널 [청소년상담1388]',
  },
  {
    name: '경찰청 긴급신고',
    number: '112',
    description: '신체적 위험, 폭력, 범죄 피해 시 즉시 경찰의 보호를 요청합니다.',
    badge: '긴급 출동',
    isCallAvailable: true,
  },
  {
    name: '소방청 응급구조',
    number: '119',
    description: '생명 구조 및 응급 의료 처치가 필요할 때 즉시 요청합니다.',
    badge: '응급 의료',
    isCallAvailable: true,
  },
];

export const CRISIS_MESSAGES = {
  bannerTitle: '네 마음이 너무 아프고 지쳤구나… 혼자 견디지 않아도 돼.',
  bannerSubtext: '지금 이 순간 너의 안전과 생명이 가장 소중해. 비밀이 보장되는 전문 선생님들이 언제나 기다리고 있어.',
  confidentialityNotice: '※ 긴급 위기 상황에서는 너를 지키기 위해 안전 기관과 보호 조치가 함께 연결될 수 있어요.',
  schoolCounselorNotice: '학교 안에서도 언제든 편하게 Wee클래스 상담 선생님을 찾아와도 좋아.',
};

/**
 * 클라이언트 측 독립 위기 키워드 감지 사전
 * LLM API 장애나 오프라인 상황에서도 즉각 작동하도록 클라이언트에서 1차 검사합니다.
 */
export const CRISIS_KEYWORDS = [
  '죽고싶',
  '죽고 싶',
  '자살',
  '자해',
  '손목',
  '살기싫',
  '살기 싫',
  '사라지고 싶',
  '사라지고싶',
  '끝내고 싶',
  '끝내고싶',
  '때렸',
  '맞았',
  '학대',
  '폭행',
  '가정폭력',
  '성폭력',
  '괴롭힘',
  '유서',
  '목숨',
  '뛰어내리',
  '죽어버리',
  '죽을래',
  '죽을까',
  '없어지고 싶',
  '살고 싶지 않',
  '극단적 선택',
];

export const CONCERN_KEYWORDS = [
  '우울해',
  '불안해',
  '너무 힘들어',
  '숨이 안 쉬어',
  '공황',
  '패닉',
  '가슴이 답답',
  '눈물이 멈추지',
  '아무것도 못하겠',
  '외로워',
  '왕따',
  '은따',
];

/**
 * 간접·모호한 위기 신호 (자살·자해를 직접 말하지 않았지만 그런 뜻일 수도 있는 표현)
 * AI 응답이 불가능할 때(내장 응답) 바로 위기 안내 대신 안전 확인 질문을 하는 데 사용합니다.
 * 같은 대화의 최근 메시지에서 다시 나오면 위기로 안내합니다.
 */
export const INDIRECT_SIGNAL_KEYWORDS = [
  '다 그만하고 싶',
  '모든 걸 그만하고 싶',
  '내가 없어져도',
  '내가 없어지면',
  '내가 사라져도',
  '내가 사라지면',
  '사는 게 의미 없',
  '살아도 의미 없',
  '다 의미 없',
  '다 놓고 싶',
  '다 포기하고 싶',
  '살 이유',
  '태어나지 말',
  '안 깨어났으면',
];
