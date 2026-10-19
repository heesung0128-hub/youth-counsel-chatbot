import React, { useState } from 'react';
import {
  X,
  HelpCircle,
  Shield,
  Layers,
  BookOpen,
  RefreshCw,
  Lock,
  Trash2,
  Smartphone,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Copy,
  ExternalLink,
} from 'lucide-react';
import { CounselorId, AppLockSettings } from '../types';
import { COUNSELOR_PROFILES } from '../config/promptConfig';
import { REFERRAL_CONFIG } from '../config/referralConfig';

interface HelpModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentCounselorId: CounselorId;
  onChangeCounselor: () => void;
  onOpenPinSetup: () => void;
  onClearChatHistory: () => void;
  anonymousId: string;
  transferCode: string;
  lockSettings: AppLockSettings;
  onOpenReferralDetails: (stage: 2 | 3) => void;
  onOpenOnboarding: () => void;
}

export const HelpModal: React.FC<HelpModalProps> = ({
  isOpen,
  onClose,
  currentCounselorId,
  onChangeCounselor,
  onOpenPinSetup,
  onClearChatHistory,
  anonymousId,
  transferCode,
  lockSettings,
  onOpenReferralDetails,
  onOpenOnboarding,
}) => {
  const [activeTab, setActiveTab] = useState<'guide' | 'referral' | 'privacy'>('guide');
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showTransferInfo, setShowTransferInfo] = useState(false);
  const [isCopied, setIsCopied] = useState(false);

  if (!isOpen) return null;

  const currentProfile = COUNSELOR_PROFILES[currentCounselorId];

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(transferCode);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/45 backdrop-blur-xs">
      <div className="w-full max-w-md max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-[#D0E8F6] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Disclaimer Header */}
        <div className="bg-[#FFF4D4] px-4 py-2 text-center text-xs font-semibold text-[#8C6D1F] border-b border-[#FFE9A7] flex items-center justify-center gap-1.5 shrink-0">
          <AlertTriangle className="w-3.5 h-3.5 text-[#D49E00]" />
          <span>이 챗봇은 전문 상담이나 의학적 진단을 대신하지 않아요.</span>
        </div>

        {/* Modal Main Bar */}
        <div className="p-4 bg-gradient-to-r from-[#EBF6FC] to-[#F3FAFE] border-b border-[#E1F0F8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-white shadow-xs flex items-center justify-center text-[#5BB7E6]">
              <HelpCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#233B49]">도움말 & 안전 가이드</h2>
              <p className="text-[11px] text-[#638294]">
                함께하는 마음 친구: <strong className="text-[#3A5D71]">{currentProfile.name}</strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
            aria-label="닫기"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="grid grid-cols-3 p-1.5 bg-[#F0F7FB] border-b border-[#E1EFF7] text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('guide')}
            className={`py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'guide'
                ? 'bg-white text-[#203D4D] shadow-xs'
                : 'text-[#648496] hover:text-[#203D4D]'
            }`}
          >
            1. 이용 방법
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('referral')}
            className={`py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'referral'
                ? 'bg-white text-[#203D4D] shadow-xs'
                : 'text-[#648496] hover:text-[#203D4D]'
            }`}
          >
            2. 상담사 연계
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('privacy')}
            className={`py-2 rounded-xl transition cursor-pointer ${
              activeTab === 'privacy'
                ? 'bg-white text-[#203D4D] shadow-xs'
                : 'text-[#648496] hover:text-[#203D4D]'
            }`}
          >
            3. 비밀 보장
          </button>
        </div>

        {/* Tab Body (Scrollable) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#384E5B] leading-relaxed">
          {/* TAB 1: 이용 방법 */}
          {activeTab === 'guide' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8]">
                <h3 className="font-bold text-[#1E3745] flex items-center gap-1.5 mb-1 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#FFD966] text-[#4A3B00] text-xs flex items-center justify-center font-bold">1</span>
                  키워드 추천창 이용하기
                </h3>
                <p className="text-xs text-[#527080]">
                  입력창 바로 위의 3칸 키워드 버튼을 누르면 해당 문장이 즉시 전송돼요. 대화 맥락에 따라 다음 키워드가 자동으로 새롭게 바뀝니다.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8]">
                <h3 className="font-bold text-[#1E3745] flex items-center gap-1.5 mb-1 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#FFD966] text-[#4A3B00] text-xs flex items-center justify-center font-bold">2</span>
                  직접 입력 & 전송
                </h3>
                <p className="text-xs text-[#527080]">
                  알약 모양의 입력창에 원하는 생각을 자유롭게 적고, 오른쪽 안쪽의 원형 전송(▶) 버튼이나 키보드의 Enter 키를 누르면 돼요.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8]">
                <h3 className="font-bold text-[#1E3745] flex items-center gap-1.5 mb-1 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#FFD966] text-[#4A3B00] text-xs flex items-center justify-center font-bold">3</span>
                  이전 대화 스크롤 열람
                </h3>
                <p className="text-xs text-[#527080]">
                  화면을 위로 스크롤하면 과거에 나눈 대화를 언제든 다시 읽어볼 수 있어요. 앱을 껐다 켜도 내 기기에 안전하게 남아 있습니다.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8]">
                <h3 className="font-bold text-[#1E3745] flex items-center gap-1.5 mb-1 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#FFD966] text-[#4A3B00] text-xs flex items-center justify-center font-bold">4</span>
                  앱 잠금 및 마음 친구 변경
                </h3>
                <p className="text-xs text-[#527080]">
                  상단 바의 자물쇠 아이콘으로 즉시 화면을 잠글 수 있으며, 하단 버튼에서 다른 동물 친구(멍이/냥이/숭이)로 언제든 변경할 수 있어요.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8]">
                <h3 className="font-bold text-[#1E3745] flex items-center gap-1.5 mb-1 text-sm">
                  <span className="w-5 h-5 rounded-full bg-[#FFD966] text-[#4A3B00] text-xs flex items-center justify-center font-bold">5</span>
                  홈 화면에 앱 설치하기 (PWA)
                </h3>
                <p className="text-xs text-[#527080] leading-relaxed">
                  스토어 다운로드 없이 브라우저의 <strong>[앱 설치]</strong> 버튼을 누르면 휴대폰 바탕화면에 즉시 설치돼요. 주소창 없는 전체 화면으로 작동하여 더 안전하고 빠르게 이용할 수 있습니다.
                </p>
              </div>
            </div>
          )}

          {/* TAB 2: 상담사 연계 절차 (3단계 도식화) */}
          {activeTab === 'referral' && (
            <div className="space-y-4">
              <div className="p-3 rounded-2xl bg-[#EAF5FC] border border-[#D5ECF8] text-xs text-[#305163]">
                <strong className="block text-[#1D3A4B] font-bold mb-0.5">
                  ✨ 서초 청소년 3단계 심리지원 체계
                </strong>
                동덕여고 학생 연구의 제안을 반영하여, AI 초기 상담에서 끝나지 않고 실제 상담 선생님 및 전문기관으로 안전하게 이어집니다.
              </div>

              {/* 3 Steps Visual Flow */}
              <div className="space-y-2.5">
                {/* Step 1 Card */}
                <div className="p-3.5 rounded-2xl bg-white border-2 border-[#BFE6F7] shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-[#E3F2FD] text-[#1976D2] font-bold text-[10px]">
                      1단계
                    </span>
                    <span className="text-[11px] font-semibold text-[#547385]">현재 이용 중</span>
                  </div>
                  <h4 className="font-bold text-[#1D3543] text-sm">{REFERRAL_CONFIG.stage1.title}</h4>
                  <p className="text-xs text-[#527080] mt-1 leading-relaxed">
                    {REFERRAL_CONFIG.stage1.description}
                  </p>
                </div>

                <div className="flex justify-center text-[#7CC6EA]">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                {/* Step 2 Card */}
                <div
                  onClick={() => onOpenReferralDetails(2)}
                  className="p-3.5 rounded-2xl bg-white border-2 border-[#FFE082] shadow-xs hover:border-[#FFD54F] transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-[#FFF8E1] text-[#F57F17] font-bold text-[10px]">
                      2단계
                    </span>
                    <span className="text-[11px] text-[#7E5700] underline font-medium group-hover:text-[#F57F17] flex items-center gap-0.5">
                      자세히 보기 <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                  <h4 className="font-bold text-[#1D3543] text-sm">{REFERRAL_CONFIG.stage2.title}</h4>
                  <p className="text-xs text-[#527080] mt-1 leading-relaxed">
                    {REFERRAL_CONFIG.stage2.description}
                  </p>
                  <div className="mt-2 text-[10px] bg-[#FFF9E6] p-1.5 rounded-lg text-[#8D6E18] font-medium">
                    {REFERRAL_CONFIG.stage2.hours} · {REFERRAL_CONFIG.stage2.channels.join(' · ')}
                  </div>
                </div>

                <div className="flex justify-center text-[#7CC6EA]">
                  <ArrowRight className="w-4 h-4 rotate-90" />
                </div>

                {/* Step 3 Card */}
                <div
                  onClick={() => onOpenReferralDetails(3)}
                  className="p-3.5 rounded-2xl bg-white border-2 border-[#A5D6A7] shadow-xs hover:border-[#81C784] transition cursor-pointer group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] font-bold text-[10px]">
                      3단계
                    </span>
                    <span className="text-[11px] text-[#1B5E20] underline font-medium group-hover:text-[#2E7D32] flex items-center gap-0.5">
                      기관 목록 보기 <ExternalLink className="w-3 h-3" />
                    </span>
                  </div>
                  <h4 className="font-bold text-[#1D3543] text-sm">{REFERRAL_CONFIG.stage3.title}</h4>
                  <p className="text-xs text-[#527080] mt-1 leading-relaxed">
                    교내 Wee클래스, 서초구청소년상담복지센터, 서초구정신건강복지센터, 고위기 심리클리닉 '상담잇다'
                  </p>
                  <div className="mt-2 text-[10px] bg-[#F1F8F2] p-1.5 rounded-lg text-[#2E7D32] font-medium">
                    {REFERRAL_CONFIG.stage3.consentMessage}
                  </div>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-[#FFF9E6] border border-[#FFE7A3] text-xs text-[#7B6018]">
                <strong>🔒 학생 동의 원칙</strong>: 2단계 및 3단계 연결은 <strong>학생 본인이 원하고 동의할 때만</strong> 진행되며, 원치 않는 상태에서 강제로 연결되지 않습니다.
              </div>
            </div>
          )}

          {/* TAB 3: 비밀 보장 방법 */}
          {activeTab === 'privacy' && (
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8]">
                <h4 className="font-bold text-[#1E3745] flex items-center gap-1.5 mb-1 text-sm">
                  <Shield className="w-4 h-4 text-[#5BB7E6]" />
                  개인정보를 전혀 받지 않아요
                </h4>
                <p className="text-xs text-[#527080] leading-relaxed">
                  회원가입, 로그인, 이름, 전화번호, 학교, 학번 등 어떠한 개인 식별 정보도 요구하거나 수집하지 않습니다.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8]">
                <h4 className="font-bold text-[#1E3745] flex items-center gap-1.5 mb-1 text-sm">
                  <Lock className="w-4 h-4 text-[#5BB7E6]" />
                  대화는 내 휴대폰(기기) 안에만 저장돼요
                </h4>
                <p className="text-xs text-[#527080] leading-relaxed">
                  상담 대화 내용은 외부 데이터베이스에 이름과 함께 저장되지 않고, 오직 학생의 기기 로컬 저장소에만 남습니다. 앱 잠금 비밀번호 역시 암호화 해시로 저장됩니다.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8]">
                <h4 className="font-bold text-[#1E3745] flex items-center gap-1.5 mb-1 text-sm">
                  <Trash2 className="w-4 h-4 text-[#5BB7E6]" />
                  언제든 기록을 지울 수 있어요
                </h4>
                <p className="text-xs text-[#527080] leading-relaxed">
                  기기에서 대화 흔적을 남기고 싶지 않다면 아래 '대화 기록 모두 지우기' 버튼을 눌러 즉시 흔적 없이 삭제할 수 있습니다.
                </p>
              </div>

              {/* 비밀 보장의 예외 투명 안내 */}
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200">
                <h4 className="font-bold text-amber-900 flex items-center gap-1.5 mb-1 text-sm">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  비밀 보장의 예외 (소중한 생명과 안전 보호)
                </h4>
                <p className="text-xs text-amber-800 leading-relaxed">
                  상담 윤리와 법령에 따라 <strong>자해나 극단적 선택 위험, 심각한 폭력이나 학대 피해</strong>처럼 학생의 생명과 안전이 급박하게 위험한 상황에서는 학생을 보호하기 위해 국가 전문 위기 지원 기관(1388, 109)이나 보호 절차가 연계될 수 있습니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Actions Section */}
        <div className="p-4 bg-[#F8FCFE] border-t border-[#E1EFF7] space-y-2 shrink-0">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenOnboarding();
            }}
            className="w-full py-2.5 px-3 rounded-xl bg-[#EAF5FC] hover:bg-[#DEEFF9] border border-[#CBE5F5] text-xs font-bold text-[#234B62] shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
          >
            <BookOpen className="w-3.5 h-3.5 text-[#5BB7E6]" />
            처음 이용 안내(온보딩) 다시보기
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onChangeCounselor();
              }}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-[#D5E8F3] text-xs font-bold text-[#2A4758] shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#5BB7E6]" />
              마음 친구 바꾸기
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenPinSetup();
              }}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-[#D5E8F3] text-xs font-bold text-[#2A4758] shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5 text-[#5BB7E6]" />
              {lockSettings.isEnabled ? '잠금번호 변경' : '앱 잠금 설정'}
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setShowTransferInfo(true)}
              className="py-2.5 px-3 rounded-xl bg-white hover:bg-slate-50 border border-[#D5E8F3] text-xs font-bold text-[#2A4758] shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5 text-[#7CC6EA]" />
              기기 연동 코드
            </button>

            <button
              type="button"
              onClick={() => setShowClearConfirm(true)}
              className="py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-xs font-bold text-rose-700 shadow-2xs flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5 text-rose-500" />
              대화 기록 모두 지우기
            </button>
          </div>
        </div>
      </div>

      {/* Clear Chat History Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white p-5 shadow-2xl border border-rose-100 text-center animate-in fade-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto mb-3">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-[#203744]">대화 기록 삭제</h3>
            <p className="text-xs text-[#577281] mt-2 leading-relaxed">
              기기에 보관된 모든 상담 대화 내용이 영구적으로 지워집니다. 계속 진행할까요?
            </p>
            <div className="flex gap-2 w-full mt-5">
              <button
                type="button"
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#527080] hover:bg-slate-50 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowClearConfirm(false);
                  onClearChatHistory();
                  onClose();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                삭제하기
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Code Modal */}
      {showTransferInfo && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#D5ECF8] text-center animate-in fade-in zoom-in-95 duration-150">
            <Smartphone className="w-10 h-10 text-[#5BB7E6] mx-auto mb-2" />
            <h3 className="text-base font-bold text-[#203744]">기기 연동 코드</h3>
            <p className="text-xs text-[#5A7685] mt-1.5 leading-relaxed">
              휴대폰을 바꾸거나 PC 브라우저와 익명 상태를 연동할 때 사용하는 8자리 코드예요.
            </p>

            <div className="my-4 p-3.5 rounded-2xl bg-[#F0F8FD] border border-[#CDE5F4] flex items-center justify-between">
              <span className="font-mono text-lg font-bold tracking-wider text-[#1C3A4B]">
                {transferCode}
              </span>
              <button
                type="button"
                onClick={handleCopyCode}
                className="px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-xs font-bold text-[#35576A] shadow-xs border border-[#CDE5F4] flex items-center gap-1 cursor-pointer"
              >
                {isCopied ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5 text-[#5BB7E6]" />}
                {isCopied ? '복사됨' : '복사'}
              </button>
            </div>

            <p className="text-[11px] text-[#7893A2] leading-normal text-left bg-slate-50 p-2.5 rounded-xl">
              * 개인정보가 없기 때문에 이 연동 코드만 있으면 다른 기기에서 내 익명 설정을 불러올 수 있어요.
            </p>

            <button
              type="button"
              onClick={() => setShowTransferInfo(false)}
              className="w-full mt-4 py-2.5 rounded-xl bg-[#7CC6EA] hover:bg-[#68B7DD] text-xs font-bold text-white shadow-xs cursor-pointer"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
