import React, { useState } from 'react';
import { X, ShieldCheck, HeartHandshake, Phone, Clock, MapPin, ExternalLink } from 'lucide-react';
import { REFERRAL_CONFIG } from '../config/referralConfig';
import { ReferralOrg } from '../types';
import { displayValue, isPlaceholder } from '../utils/referralDisplay';

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
  const stage2 = REFERRAL_CONFIG.stage2;

  if (!isOpen) return null;

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
            onClick={() => setSelectedStage(2)}
            className={`py-2 rounded-xl transition cursor-pointer ${
              selectedStage === 2
                ? 'bg-white text-[#1E3B4B] shadow-xs'
                : 'text-[#638497] hover:text-[#1E3B4B]'
            }`}
          >
            2단계: 1388 비대면 상담
          </button>
          <button
            type="button"
            onClick={() => setSelectedStage(3)}
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
            /* Stage 2 Content: 청소년상담 1388 이용 안내 */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#FFF9E6] border border-[#FFE7A3]">
                <span className="px-2 py-0.5 rounded-full bg-[#FFE082] text-[#694E03] text-[10px] font-bold">
                  2단계 비대면 연계 안내
                </span>
                <h3 className="text-sm font-bold text-[#2A2300] mt-1.5">{stage2.title}</h3>
                <p className="text-xs text-[#635520] mt-1 leading-relaxed">{stage2.description}</p>
              </div>

              <div className="p-3.5 rounded-2xl bg-[#F6FAFD] border border-[#E1EFF8] space-y-2.5">
                <h4 className="text-xs font-bold text-[#1E3A4B]">{stage2.serviceName} 이용 안내</h4>
                <div className="flex items-center gap-1.5 text-xs text-[#384E5B]">
                  <Clock className="w-3.5 h-3.5 text-[#5BB7E6] shrink-0" />
                  <span>{stage2.hours}</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {stage2.channels.map((channel) => (
                    <span
                      key={channel}
                      className="px-2 py-0.5 rounded-full bg-white border border-[#D5ECF8] text-[11px] text-[#2A4758]"
                    >
                      {channel}
                    </span>
                  ))}
                </div>
                <p className="text-xs text-[#527081] leading-relaxed">{stage2.howToUse}</p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#527081] flex gap-2">
                <ShieldCheck className="w-4 h-4 text-[#5BB7E6] shrink-0 mt-0.5" />
                <span>{stage2.confidentiality}</span>
              </div>

              {/* 동의 후 연결: 외부 사이트 이동 안내 확인 → 링크 활성화 (전화는 언제나 바로 가능) */}
              <div className="p-4 rounded-2xl bg-[#EAF5FC] border border-[#D5ECF8] space-y-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasAgreed}
                    onChange={(e) => setHasAgreed(e.target.checked)}
                    className="mt-0.5 w-4 h-4 rounded text-[#5BB7E6] focus:ring-[#7CC6EA]"
                  />
                  <span className="text-xs text-[#203D4E] font-medium leading-relaxed">{stage2.consentMessage}</span>
                </label>
                <a
                  href={hasAgreed ? stage2.siteUrl : undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-disabled={!hasAgreed}
                  onClick={(e) => {
                    if (!hasAgreed) e.preventDefault();
                  }}
                  className={`flex items-center justify-center gap-1.5 w-full py-2.5 px-4 rounded-xl font-bold text-xs text-white shadow-xs transition ${
                    hasAgreed ? 'bg-[#5BB7E6] hover:bg-[#48A8D8]' : 'bg-[#5BB7E6]/40 cursor-not-allowed'
                  }`}
                >
                  1388 온라인 상담 바로가기
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
                <a
                  href="tel:1388"
                  className="flex items-center justify-center gap-1.5 w-full py-2 px-4 rounded-xl font-bold text-xs text-[#2A4758] bg-white border border-[#D5ECF8] hover:bg-[#F6FAFD] transition"
                >
                  <Phone className="w-3.5 h-3.5 text-[#5BB7E6]" />
                  지금 바로 1388에 전화하기
                </a>
              </div>
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
