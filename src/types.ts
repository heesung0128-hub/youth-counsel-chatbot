export type CounselorId = 'cat' | 'dog' | 'monkey';

export type RiskLevel = 'safe' | 'concern' | 'crisis';

export interface CounselorProfile {
  id: CounselorId;
  name: string;
  species: string;
  tagline: string;
  personality: string;
  greetingMessage: string;
  avatarBg: string;
  accentColor: string;
  badge: string;
  defaultKeywords: [string, string, string];
  /** 이 캐릭터만의 말투 규칙 (시스템 프롬프트에 현재 캐릭터 것만 주입) */
  voiceGuide: string[];
  /** 말투 예시 한 문장 */
  sampleLine: string;
}

export interface ChatMessage {
  id: string;
  sender: 'counselor' | 'user' | 'system';
  text: string;
  timestamp: number;
  riskLevel?: RiskLevel;
  suggestedKeywords?: [string, string, string];
  isReferralOffer?: boolean;
  referralStage?: 2 | 3;
  /** 간접 위기 신호에 대한 안전 확인 질문 답변 (연계 카드 대신 작은 1388 안내 표시) */
  isSafetyCheck?: boolean;
}

export interface AppLockSettings {
  isEnabled: boolean;
  pinHash: string | null;
  failedAttempts: number;
  lockedUntil: number | null;
}

export interface ReferralOrg {
  id: string;
  name: string;
  category: 'school' | 'community' | 'mental_health' | 'clinic';
  description: string;
  targetAudience: string;
  contact: string;
  hours: string;
  location: string;
  howToUse: string;
  isCustomizableNotice: boolean;
}

export interface CounselorApiResponse {
  message: string;
  suggestedKeywords: [string, string, string];
  riskLevel: RiskLevel;
  counselorNote?: string;
  shouldOfferReferral?: boolean;
  referralStage?: 2 | 3;
}
