import { ReferralOrg } from '../types';

/**
 * [상담 연계 기관 및 비대면 상담 안내 설정]
 * 
 * * 연구 배경: 동덕여고 학생 연구 「서초구 청소년 정신건강 원인과 사회적 지지망 확대 정책 제안」
 * * 1단계(AI 초기 상담) → 2단계(실제 상담사 익명 비대면 상담) → 3단계(교내 Wee클래스 및 서초구 전문기관)
 * 
 * * 안내:
 *   시범 운영 단계 전, 학교 Wee클래스 담당 교사 및 서초구 청소년 유관 기관 협의에 따라
 *   아래 연락처, 운영시간, 상담 방식 정보를 수정하여 반영할 수 있도록 비워두거나 템플릿화되어 있습니다.
 *   (임의의 허위 전화번호나 운영시간은 포함하지 않았습니다.)
 *
 * * 입력 규칙:
 *   - 대괄호 [ ] 로 감싼 값(예: '[기관 공식 협약 연락처 시범운영 시 입력]')은 학생 화면에 표시되지 않습니다.
 *     확정되면 대괄호 없이 실제 값을 넣으면 바로 표시됩니다.
 *   - 2단계는 청소년상담 1388(비대면 상담)로 안내합니다. 링크·운영시간·상담 방법은 stage2에서 바꿀 수 있습니다.
 */

export interface SteppedReferralInfo {
  stage1: {
    title: string;
    description: string;
    privacy: string;
  };
  stage2: {
    title: string;
    description: string;
    serviceName: string;
    siteUrl: string;
    hours: string;
    channels: string[];
    howToUse: string;
    confidentiality: string;
    consentMessage: string;
  };
  stage3: {
    title: string;
    description: string;
    consentMessage: string;
    organizations: ReferralOrg[];
  };
}

export const REFERRAL_CONFIG: SteppedReferralInfo = {
  stage1: {
    title: '1단계: AI 초기 마음 정리',
    description: '가벼운 일상 고민부터 마음이 답답할 때, 24시간 언제든 익명으로 감정을 털어놓고 생각을 정리할 수 있는 첫 관문입니다.',
    privacy: '이름이나 학번 없이 기기 내에서 안전하게 익명으로 보호됩니다.',
  },
  stage2: {
    title: '2단계: 청소년상담 1388 비대면 상담',
    description: '청소년의 다양한 고민을 전문 상담자와 비대면으로 상담할 수 있는 창구예요.',
    serviceName: '청소년상담 1388',
    siteUrl: 'https://www.1388.go.kr/cco/YTOSP_SC_CCI_01',
    hours: '365일 24시간 연중무휴',
    channels: ['사이트 내 상담실', '전화 1388', '문자 #1388', '카카오톡', '페이스북', '라인', '인스타그램'],
    howToUse: '아래 버튼으로 1388 사이트에 들어가 상담실에서 상담을 시작하거나, 전화·문자·카카오톡 등 편한 방법을 골라 연락하면 돼요.',
    confidentiality: '상담 내용은 비밀이 보장돼요. 다만 자살 등 생명이 위험한 상황이라고 판단되면, 너를 지키기 위해 관련 기관과 연계될 수 있어요.',
    consentMessage: '버튼을 누르면 청소년상담 1388 공식 사이트(외부)로 이동해요. 이 앱에서 나눈 대화는 전달되지 않아요.',
  },
  stage3: {
    title: '3단계: 교내 Wee클래스 및 서초구 전문기관 연계',
    description: '지속적인 대면 상담, 심리검사, 전문 치료 및 심리 지원이 필요할 때 서초구 내 전문기관과 연계합니다.',
    consentMessage: '모든 기관 연계는 학생의 자발적 동의와 선택을 존중하여 진행됩니다.',
    organizations: [
      {
        id: 'wee-class',
        name: '교내 Wee클래스 (상담실)',
        category: 'school',
        description: '학교 안에서 가장 가까운 마음 쉼터. 편안한 공간에서 상담 선생님과 일대일 대면 상담을 진행합니다.',
        targetAudience: '본교 재학생 누구나',
        contact: '[시범 운영 시 교내 Wee클래스 직통 내선번호 입력]',
        hours: '[학기 중 평일 08:30 ~ 16:30 / 방학 중 별도 공지]',
        location: '[교내 본관 ○층 Wee클래스]',
        howToUse: '쉬는 시간·점심시간 자유 방문 또는 사전 비밀 신청서 접수',
        isCustomizableNotice: true,
      },
      {
        id: 'seocho-youth-center',
        name: '서초구 청소년상담복지센터',
        category: 'community',
        description: '서초구 청소년과 학부모를 위한 전문 심리상담, 정서 지원 및 위기 청소년 통합 지원 전문기관입니다.',
        targetAudience: '서초구 거주 또는 관내 학교 재학 만 9세~24세 청소년',
        contact: '[기관 공식 협약 연락처 시범운영 시 입력]',
        hours: '[평일 09:00 ~ 18:00]',
        location: '서울특별시 서초구 반포대로 (서초유스센터 내)',
        howToUse: '사전 전화 예약 및 온라인 접수 / Wee클래스 연계 의뢰 가능',
        isCustomizableNotice: true,
      },
      {
        id: 'seocho-mental-health',
        name: '서초구 정신건강복지센터',
        category: 'mental_health',
        description: '우울, 불안, 스트레스 등 청소년 정신건강 평가 및 전문의 상담, 치료비 지원을 연계하는 공공 센터입니다.',
        targetAudience: '서초구 청소년 및 구민',
        contact: '[기관 공식 협약 연락처 시범운영 시 입력]',
        hours: '[평일 09:00 ~ 18:00]',
        location: '서울특별시 서초구 보건소 및 정신건강복지센터',
        howToUse: '마음건강 스크리닝 후 심층 상담 및 전문의 연계',
        isCustomizableNotice: true,
      },
      {
        id: 'counseling-itta',
        name: '고위기 청소년 심리클리닉 「상담잇다」',
        category: 'clinic',
        description: '심리적 고위기(자해, 극심한 우울, 심리적 외상 등) 청소년을 위한 집중 종합 심리평가 및 전문 클리닉입니다.',
        targetAudience: '전문 심층 지원이 시급한 고위기 청소년',
        contact: '[서초구 청소년 안전망 연계 전용 회선 입력]',
        hours: '[사전 예약제 운영]',
        location: '[서초구 청소년 안전망 지정 클리닉]',
        howToUse: 'Wee클래스 또는 청소년상담복지센터 사례회의를 통한 전문 의뢰 연계',
        isCustomizableNotice: true,
      },
    ],
  },
};
