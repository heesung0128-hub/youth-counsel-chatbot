import React, { useState } from 'react';
import { X, ShieldCheck, HeartHandshake, Phone, Clock, MapPin, Check, AlertCircle, Sparkles } from 'lucide-react';
import { REFERRAL_CONFIG } from '../config/referralConfig';
import { ReferralOrg } from '../types';
import { displayValue, isPlaceholder } from '../utils/referralDisplay';

// 2단계 익명 상담 창구가 실제 운영 중일 때만 연결 동의/요청 버튼을 노출
const isStage2Active = REFERRAL_CONFIG.stage2.status === 'active';

interface ReferralModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialStage?: 2 | 3;
}

export const ReferralModal: React.FC<ReferralModalProps> = ({
  isOpen,
  onClose,
  initialStage = 2,
}) => {
  const [selectedStage, setSelectedStage] = useState<2 | 3>(initialStage);
  const [hasAgreed, setHasAgreed] = useState(false);
  const [connectionRequested, setConnectionRequested] = useState(false);

  if (!isOpen) return null;

  const handleAgreeAndConnect = () => {
    if (!hasAgreed) return;
    setConnectionRequested(true);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-md max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-[#D5ECF8] animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-4 bg-gradient-to-r from-[#EBF6FC] to-[#F5FAFE] border-b border-[#E1F0F8] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-2xl bg-white shadow-xs flex items-center justify-center text-[#5BB7E6]">
              <HeartHandshake className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#203744]">상담사 & 전문기관 연계 안내</h2>
              <p className="text-[11px] text-[#608092]">학생의 자발적 동의로만 안전하게 이어집니다</p>
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

        {/* Stage Toggle */}
        <div className="grid grid-cols-2 p-1.5 bg-[#F0F7FB] border-b border-[#E1EFF7] text-xs font-semibold shrink-0">
          <button
            type="button"
            onClick={() => {
              setSelectedStage(2);
              setConnectionRequested(false);
            }}
            className={`py-2 rounded-xl transition cursor-pointer ${
              selectedStage === 2
                ? 'bg-white text-[#1E3B4B] shadow-xs'
                : 'text-[#638497] hover:text-[#1E3B4B]'
            }`}
          >
            2단계: 비대면 익명 상담
          </button>
          <button
            type="button"
            onClick={() => {
              setSelectedStage(3);
              setConnectionRequested(false);
            }}
            className={`py-2 rounded-xl transition cursor-pointer ${
              selectedStage === 3
                ? 'bg-white text-[#1E3B4B] shadow-xs'
                : 'text-[#638497] hover:text-[#1E3B4B]'
            }`}
          >
            3단계: Wee클래스 · 전문기관
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#384E5B] leading-relaxed">
          {selectedStage === 2 ? (
            /* Stage 2 Content */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#FFF9E6] border border-[#FFE7A3]">
                <span className="px-2 py-0.5 rounded-full bg-[#FFE082] text-[#694E03] text-[10px] font-bold">
                  2단계 비대면 연계
                </span>
                <h3 className="text-sm font-bold text-[#2A2300] mt-1.5">
                  {REFERRAL_CONFIG.stage2.title}
                </h3>
                <p className="text-xs text-[#635520] mt-1 leading-relaxed">
                  {REFERRAL_CONFIG.stage2.description}
                </p>
              </div>

              {isStage2Active && (
                <div className="p-3.5 rounded-2xl bg-[#F6FAFD] border border-[#E1EFF8] space-y-2">
                  <h4 className="text-xs font-bold text-[#1E3A4B] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#5BB7E6]" />
                    안내 및 개인정보 처리 원칙
                  </h4>
                  <ul className="text-xs text-[#527081] space-y-1 list-disc list-inside">
                    <li>학생의 이름, 연락처, 학번을 요구하지 않는 <strong>익명 채팅</strong>으로 진행됩니다.</li>
                    <li>상담사는 청소년 전문 상담 자격을 갖춘 선생님이 배정됩니다.</li>
                    <li>대화 중 언제든 학생이 원할 때 상담을 종료할 수 있습니다.</li>
                  </ul>
                </div>
              )}

              {/* Status Notice */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#527081]">
                <strong className="block text-[#273E4D] mb-0.5">
                  {REFERRAL_CONFIG.stage2.anonymousChannelTitle}
                </strong>
                {REFERRAL_CONFIG.stage2.anonymousChannelNotice}
              </div>

              {!isStage2Active ? (
                /* 운영 전: 가짜 "연결 요청 완료" 대신 지금 바로 이용 가능한 익명 상담 안내 */
                <div className="p-4 rounded-2xl bg-[#EAF5FC] border border-[#D5ECF8] space-y-2.5">
                  <h4 className="text-sm font-bold text-[#1E3A4B]">
                    지금 바로 익명으로 상담받고 싶다면
                  </h4>
                  <p className="text-xs text-[#527081] leading-relaxed">
                    이 창구는 아직 열리지 않았어요. 대신 <strong>청소년상담 1388</strong>에서 이름을 밝히지 않고
                    24시간 전문 상담 선생님과 이야기할 수 있어요.
                  </p>
                  <ul className="text-xs text-[#384E5B] space-y-1">
                    <li>📞 전화: 1388</li>
                    <li>💬 문자: #1388</li>
                    <li>🟡 카카오톡: 채널 [청소년상담1388] 검색</li>
                  </ul>
                  <a
                    href="tel:1388"
                    className="block w-full py-2.5 px-4 rounded-xl font-bold text-xs text-center text-white bg-[#5BB7E6] hover:bg-[#48A8D8] shadow-xs transition"
                  >
                    1388에 전화하기
                  </a>
                </div>
              ) : connectionRequested ? (
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-center animate-in fade-in">
                  <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2">
                    <Check className="w-5 h-5" />
                  </div>
                  <h4 className="text-sm font-bold text-emerald-900">익명 상담 연결 요청 완료</h4>
                  <p className="text-xs text-emerald-700 mt-1">
                    시범 운영 준비가 완료되면 이 창구를 통해 실제 상담 선생님과의 1:1 익명 대화방으로 연결됩니다.
                  </p>
                </div>
              ) : (
                /* Consent Agreement Section */
                <div className="p-4 rounded-2xl bg-[#EAF5FC] border border-[#D5ECF8] space-y-3">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={hasAgreed}
                      onChange={(e) => setHasAgreed(e.target.checked)}
                      className="mt-0.5 w-4 h-4 rounded text-[#5BB7E6] focus:ring-[#7CC6EA]"
                    />
                    <span className="text-xs text-[#203D4E] font-medium leading-relaxed">
                      [필수 동의] 상담의 목적과 익명 처리 방식을 확인하였으며, 실제 전문 상담사와의 비대면 익명 상담 연결에 동의합니다.
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={handleAgreeAndConnect}
                    disabled={!hasAgreed}
                    className="w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white bg-[#5BB7E6] hover:bg-[#48A8D8] disabled:opacity-40 disabled:cursor-not-allowed shadow-xs transition cursor-pointer"
                  >
                    전문 상담사와 익명 상담 시작하기
                  </button>
                </div>
              )}
            </div>
          ) : (
            /* Stage 3 Content: Organizations list */
            <div className="space-y-3.5">
              <div className="p-3.5 rounded-2xl bg-[#F0F8F2] border border-[#C8E6C9]">
                <span className="px-2 py-0.5 rounded-full bg-[#C8E6C9] text-[#1B5E20] text-[10px] font-bold">
                  3단계 전문기관 연계
                </span>
                <h3 className="text-sm font-bold text-[#1B4D20] mt-1">
                  교내 Wee클래스 및 서초구 전문 지원 기관
                </h3>
                <p className="text-xs text-[#2E7D32] mt-0.5">
                  필요한 경우 전문 검사, 대면 상담, 심리 치료 지원을 받을 수 있습니다.
                </p>
              </div>

              {/* Organization Cards */}
              <div className="space-y-3">
                {REFERRAL_CONFIG.stage3.organizations.map((org: ReferralOrg) => (
                  <div
                    key={org.id}
                    className="p-3.5 rounded-2xl bg-white border border-[#E0EEF6] shadow-xs space-y-2 hover:border-[#BFE6F7] transition"
                  >
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-sm text-[#1E3847]">{org.name}</h4>
                      <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] font-medium text-[#527081]">
                        {org.targetAudience}
                      </span>
                    </div>

                    <p className="text-xs text-[#527081]">{org.description}</p>

                    {/* 대괄호 자리표시자 값은 숨김 (referralConfig.ts에서 확정 시 표시) */}
                    {(displayValue(org.contact) || displayValue(org.hours) || displayValue(org.location)) && (
                      <div className="pt-2 border-t border-slate-100 grid grid-cols-1 gap-1 text-[11px] text-[#5A7888]">
                        {displayValue(org.contact) && (
                          <div className="flex items-center gap-1.5">
                            <Phone className="w-3 h-3 text-[#5BB7E6]" />
                            <span>연락처: {displayValue(org.contact)}</span>
                          </div>
                        )}
                        {displayValue(org.hours) && (
                          <div className="flex items-center gap-1.5">
                            <Clock className="w-3 h-3 text-[#5BB7E6]" />
                            <span>운영시간: {displayValue(org.hours)}</span>
                          </div>
                        )}
                        {displayValue(org.location) && (
                          <div className="flex items-center gap-1.5">
                            <MapPin className="w-3 h-3 text-[#5BB7E6]" />
                            <span>위치: {displayValue(org.location)}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {org.isCustomizableNotice && (
                      <div className="text-[10px] text-[#7896A6] bg-slate-50 p-1.5 rounded-lg">
                        💡 {org.howToUse}
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {REFERRAL_CONFIG.stage3.organizations.some(
                (org) => isPlaceholder(org.contact) || isPlaceholder(org.hours) || isPlaceholder(org.location)
              ) && (
                <div className="p-3 rounded-xl bg-[#FFF9E6] border border-[#FFE7A3] text-xs text-[#7B6018]">
                  ※ 일부 기관의 연락처·운영시간은 협의 후 추가될 예정이에요. 지금 도움이 필요하면 담임 선생님이나
                  Wee클래스 선생님께 직접 말하거나, 청소년상담 1388(24시간)에 연락해 주세요.
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-[#F8FCFE] border-t border-[#E1EFF7] flex justify-end shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="py-2 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#355364] transition cursor-pointer"
          >
            확인
          </button>
        </div>
      </div>
    </div>
  );
};
