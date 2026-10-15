import React, { useState } from 'react';
import {
  Sparkles,
  ShieldCheck,
  MessageSquare,
  HeartHandshake,
  ArrowRight,
  ArrowLeft,
  X,
  AlertTriangle,
  Lock,
  Compass,
} from 'lucide-react';

interface OnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
}

export const OnboardingModal: React.FC<OnboardingModalProps> = ({
  isOpen,
  onClose,
  onComplete,
}) => {
  const [currentStep, setCurrentStep] = useState<number>(1);
  const totalSteps = 4;

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
    } else {
      onComplete();
    }
  };

  const handlePrev = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-[#D0E8F6] animate-in fade-in zoom-in-95 duration-150">
        {/* Top Progress Bar & Skip */}
        <div className="px-5 pt-4 pb-2 flex items-center justify-between border-b border-slate-100 bg-[#F9FCFE]">
          {/* Step dots */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4].map((step) => (
              <div
                key={step}
                className={`h-1.5 rounded-full transition-all duration-300 ${
                  step === currentStep
                    ? 'w-6 bg-[#5BB7E6]'
                    : step < currentStep
                    ? 'w-2 bg-[#A3D7F0]'
                    : 'w-2 bg-slate-200'
                }`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-[#6D8A9A]">
              {currentStep} / {totalSteps}
            </span>
            <button
              type="button"
              onClick={onComplete}
              className="text-xs text-[#829CA9] hover:text-[#253D4B] px-1.5 py-0.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              건너뛰기
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-5 sm:p-6 flex flex-col items-center text-center">
          {/* STEP 1: 마음의 첫 관문 & 역할과 한계 */}
          {currentStep === 1 && (
            <div className="flex flex-col items-center animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-[#E8F6FD] text-[#5BB7E6] flex items-center justify-center mb-4 shadow-xs">
                <Compass className="w-8 h-8" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E3F2FD] text-[#1976D2] text-[10px] font-bold mb-2">
                마음 쉼터의 첫 관문
              </span>
              <h3 className="text-lg font-bold text-[#1E3745] leading-snug">
                사소한 고민도 괜찮아요,<br />여기서 편하게 시작해요
              </h3>
              <p className="text-xs text-[#527081] mt-2.5 leading-relaxed">
                &ldquo;상담받을 정도의 문제가 아니라고 생각했어요&rdquo;라고 망설이지 마세요. 마음이 답답하거나 생각이 복잡할 때 혼자 끙끙 앓지 않고 생각을 차분히 정리하도록 돕는 공간입니다.
              </p>

              {/* Crucial Disclaimer */}
              <div className="mt-4 p-3 rounded-2xl bg-[#FFF9E6] border border-[#FFE7A3] text-left flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-[#C98B00] shrink-0 mt-0.5" />
                <p className="text-[11px] text-[#7A611B] leading-snug">
                  <strong>안내:</strong> 이 챗봇은 전문 상담사나 의사의 <strong>전문 진단 및 치료를 대신하지 않아요.</strong> 마음을 편안하게 털어놓고 정리하는 초기 도우미입니다.
                </p>
              </div>
            </div>
          )}

          {/* STEP 2: 철저한 익명성과 비밀 보장 */}
          {currentStep === 2 && (
            <div className="flex flex-col items-center animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-[#EAF7ED] text-[#2E7D32] flex items-center justify-center mb-4 shadow-xs">
                <ShieldCheck className="w-8 h-8" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E8F5E9] text-[#2E7D32] text-[10px] font-bold mb-2">
                100% 비대면 · 완전 익명
              </span>
              <h3 className="text-lg font-bold text-[#1E3745] leading-snug">
                이름도, 학교도 묻지 않아요<br />내 기기 안에만 안전 보관
              </h3>
              <p className="text-xs text-[#527081] mt-2.5 leading-relaxed">
                회원가입이나 로그인 없이 <strong>무작위 익명 ID</strong>로 작동합니다. 대화 내용은 오직 학생 본인의 기기에만 보관되며 관리자나 다른 사람은 볼 수 없어요.
              </p>

              <div className="mt-4 p-3 rounded-2xl bg-[#F0F8FD] border border-[#D5ECF8] text-left flex items-start gap-2 w-full">
                <Lock className="w-4 h-4 text-[#5BB7E6] shrink-0 mt-0.5" />
                <div className="text-[11px] text-[#345567] leading-snug">
                  <strong>앱 잠금(PIN) 지원:</strong> 친구나 가족이 내 휴대폰을 볼까 봐 걱정된다면 4자리 비밀번호로 앱을 안전하게 잠글 수 있어요.
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: 키워드 추천창과 대화 방법 */}
          {currentStep === 3 && (
            <div className="flex flex-col items-center animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-[#FFF6E3] text-[#F57F17] flex items-center justify-center mb-4 shadow-xs">
                <MessageSquare className="w-8 h-8" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF8E1] text-[#F57F17] text-[10px] font-bold mb-2">
                편리한 대화 인터페이스
              </span>
              <h3 className="text-lg font-bold text-[#1E3745] leading-snug">
                말문이 막힐 땐<br />3칸 추천 키워드를 톡!
              </h3>
              <p className="text-xs text-[#527081] mt-2 leading-relaxed">
                어떻게 말을 꺼내야 할지 막막할 때는 입력창 바로 위의 <strong>키워드 3칸</strong>을 눌러보세요. 대화 맥락에 맞춰 새로운 키워드가 계속 추천됩니다.
              </p>

              {/* Mini mockup illustration of the 3 keyword buttons */}
              <div className="mt-3.5 w-full bg-[#FFD966] rounded-xl p-1 shadow-2xs border border-[#F0C950]">
                <div className="grid grid-cols-3 divide-x divide-[#DEAF23] text-[11px] font-bold text-[#453603] py-1.5">
                  <span>고민이 있어</span>
                  <span>이야기 들어줘</span>
                  <span>요즘 힘들어</span>
                </div>
              </div>

              <p className="text-[11px] text-[#698596] mt-3">
                * 화면을 위로 스크롤하면 이전 대화 기록을 언제든 다시 읽을 수 있어요.
              </p>
            </div>
          )}

          {/* STEP 4: 단계적 상담사 연계 & 학생 동의 원칙 */}
          {currentStep === 4 && (
            <div className="flex flex-col items-center animate-in fade-in duration-200">
              <div className="w-16 h-16 rounded-3xl bg-[#F0F3FE] text-[#3F51B5] flex items-center justify-center mb-4 shadow-xs">
                <HeartHandshake className="w-8 h-8" />
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-[#E8EAF6] text-[#3F51B5] text-[10px] font-bold mb-2">
                사회적 지지망 연계
              </span>
              <h3 className="text-lg font-bold text-[#1E3745] leading-snug">
                혼자 감당하기 힘들 땐,<br />실제 전문 상담사와 연결
              </h3>
              <p className="text-xs text-[#527081] mt-2 leading-relaxed">
                AI 상담으로 부족할 때는 <strong>실제 전문 상담사와의 비대면 익명 채팅(2단계)</strong>이나 <strong>교내 Wee클래스 및 서초구 전문기관(3단계)</strong>으로 이어집니다.
              </p>

              <div className="mt-3.5 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-left w-full">
                <p className="text-[11px] text-emerald-800 leading-snug font-medium">
                  🔒 <strong>자발적 동의 원칙:</strong> 모든 연계는 학생 본인이 원하고 동의할 때만 진행되며, 학생 모르게 강제로 연결되지 않습니다.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation Buttons */}
        <div className="p-4 bg-[#F8FCFE] border-t border-slate-100 flex items-center justify-between gap-3">
          {currentStep > 1 ? (
            <button
              type="button"
              onClick={handlePrev}
              className="py-2.5 px-4 rounded-xl border border-slate-200 text-xs font-bold text-[#557383] hover:bg-slate-50 transition flex items-center gap-1 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>이전</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            className="py-2.5 px-5 rounded-xl bg-[#5BB7E6] hover:bg-[#48A7D8] text-xs font-bold text-white shadow-xs transition flex items-center gap-1 cursor-pointer ml-auto"
          >
            <span>{currentStep === totalSteps ? '이해했어요, 시작하기' : '다음'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
