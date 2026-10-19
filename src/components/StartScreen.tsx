import React, { useState, useEffect } from 'react';
import { CounselorId } from '../types';
import { COUNSELOR_PROFILES } from '../config/promptConfig';
import { CounselorAvatar } from './CounselorAvatar';
import { Sparkles, ShieldCheck, Heart } from 'lucide-react';

interface StartScreenProps {
  selectedCounselorId: CounselorId | null;
  onSelectCounselor: (id: CounselorId) => void;
  onStartChat: (id?: CounselorId) => void;
  isFirstVisit: boolean;
  onOpenOnboarding: () => void;
}

export const StartScreen: React.FC<StartScreenProps> = ({
  selectedCounselorId,
  onSelectCounselor,
  onStartChat,
  isFirstVisit,
  onOpenOnboarding,
}) => {
  // Temporary selection state for first-time visitors before clicking "시작하기"
  const [tentativeSelection, setTentativeSelection] = useState<CounselorId>(
    selectedCounselorId || 'cat'
  );

  useEffect(() => {
    if (selectedCounselorId) {
      setTentativeSelection(selectedCounselorId);
    }
  }, [selectedCounselorId]);

  // 선택 화면 순서: 멍이 → 냥이 → 숭이
  const counselorList: CounselorId[] = ['dog', 'cat', 'monkey'];

  const handleCharacterClick = (id: CounselorId) => {
    setTentativeSelection(id);
    onSelectCounselor(id);
  };

  const currentProfile = selectedCounselorId
    ? COUNSELOR_PROFILES[selectedCounselorId]
    : tentativeSelection
    ? COUNSELOR_PROFILES[tentativeSelection]
    : COUNSELOR_PROFILES.cat;

  return (
    <div className="min-h-full flex flex-col justify-between items-center text-center px-4 py-8 relative">
      {/* Background Soft Glow Elements */}
      <div className="absolute top-10 left-6 w-20 h-20 rounded-full bg-white/40 blur-xl pointer-events-none" />
      <div className="absolute bottom-16 right-6 w-24 h-24 rounded-full bg-[#FFE79A]/30 blur-2xl pointer-events-none" />

      {/* [상단~중앙] 인사 문구 */}
      <div className="w-full pt-4 pb-2 flex flex-col items-center">
        <button
          type="button"
          onClick={onOpenOnboarding}
          className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/70 hover:bg-white text-xs text-[#5B8296] hover:text-[#28495A] font-medium mb-3 shadow-xs border border-white/50 transition cursor-pointer"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-[#5BB7E6]" />
          <span>서초구 청소년 비대면·익명 마음쉼터</span>
          <span className="text-[10px] bg-[#E8F5FD] text-[#347B9E] px-1.5 py-0.2 rounded-full font-bold ml-0.5">안내</span>
        </button>

        <h1 className="font-gaegu text-4xl sm:text-5xl font-bold tracking-tight text-[#2B3A42] leading-tight">
          안녕하세요?
        </h1>
        <p className="font-gaegu text-2xl sm:text-3xl text-[#526874] mt-1 font-medium">
          어서오세요…
        </p>
      </div>

      {/* Main Content: First Visit vs Return Visit */}
      {isFirstVisit ? (
        /* FIRST VISIT MODE: 3 Characters in a row */
        <div className="w-full flex flex-col items-center my-auto py-4">
          {/* [중앙] 안내 문구 영역 */}
          <div className="mb-6 px-4 py-2 rounded-2xl bg-white/60 backdrop-blur-xs border border-white/60 shadow-xs max-w-xs">
            <p className="text-sm sm:text-base font-medium text-[#415560]">
              함께 이야기 나눌 마음 친구를 골라 주세요
            </p>
            <p className="text-xs text-[#758E9B] mt-0.5">
              사소한 고민도 언제든 편하게 들어줄게요
            </p>
          </div>

          {/* [하단] 캐릭터 3개 가로 한 줄에 같은 간격으로 나란히 배치 */}
          <div className="w-full max-w-sm px-2">
            <div className="grid grid-cols-3 gap-2 sm:gap-3 items-center justify-items-center">
              {counselorList.map((id) => {
                const profile = COUNSELOR_PROFILES[id];
                const isSelected = tentativeSelection === id;

                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleCharacterClick(id)}
                    aria-label={`마음 친구 ${profile.name} 선택`}
                    className={`group relative flex flex-col items-center p-2 rounded-2xl transition-all duration-200 cursor-pointer w-full focus:outline-hidden ${
                      isSelected
                        ? 'bg-white/95 scale-105 shadow-md ring-3 ring-[#FFD966] ring-offset-2 ring-offset-[#BFE6F7]'
                        : 'bg-white/40 hover:bg-white/70 hover:scale-102 border border-white/40 shadow-xs'
                    }`}
                  >
                    {/* Selected Badge */}
                    {isSelected && (
                      <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#FFD966] text-[#4A3B00] text-[10px] font-bold px-2 py-0.5 rounded-full shadow-xs flex items-center gap-0.5 z-10">
                        <Heart className="w-2.5 h-2.5 fill-current" />
                        선택
                      </span>
                    )}

                    <CounselorAvatar
                      counselorId={id}
                      size="md"
                      isIdle={isSelected}
                    />

                    <span className="mt-2 text-xs sm:text-sm font-bold text-[#33444D] tracking-tight">
                      {profile.name}
                    </span>
                    <span className="text-[10px] text-[#69808C] leading-none mt-0.5">
                      {profile.badge}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* "< 마음 친구 선택 >" Label */}
            <div className="mt-4 text-xs font-semibold text-[#547383] tracking-widest">
              &lt; 마음 친구 선택 &gt;
            </div>

            {/* Description of currently picked counselor */}
            <div className="mt-3 min-h-[44px] flex items-center justify-center">
              <p className="text-xs text-[#526B77] px-3 py-1.5 bg-white/40 rounded-xl border border-white/40 inline-block">
                &ldquo;{currentProfile.personality}&rdquo;
              </p>
            </div>
          </div>
        </div>
      ) : (
        /* RETURN VISIT MODE: Single previously chosen character displayed large with gentle idle bob animation */
        <div className="w-full flex flex-col items-center my-auto py-2">
          {/* Greeting from saved counselor with gentle idle animation */}
          <div className="relative mb-2">
            <CounselorAvatar counselorId={currentProfile.id} size="xl" isIdle={true} />
            <div className="absolute -bottom-2 -right-1 bg-white px-2.5 py-1 rounded-full shadow-md border border-[#E0F2FE] text-xs font-bold text-[#3B5462] flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-[#FFA000]" />
              <span>{currentProfile.name}</span>
            </div>
          </div>

          <div className="mt-4 max-w-xs px-4 py-3 rounded-2xl bg-white/80 backdrop-blur-xs border border-white/80 shadow-xs">
            <p className="text-sm font-medium text-[#2E414B]">
              다시 와줘서 반가워요!
            </p>
            <p className="text-xs text-[#5E7987] mt-1 leading-relaxed">
              오늘 하루는 어땠어? 어떤 이야기든 네 편에서 들어줄 준비가 되어 있어.
            </p>
          </div>

          <div className="mt-3 text-[11px] text-[#63808F]">
            마음 친구는 도움말(?) 메뉴에서 언제든 바꿀 수 있어요
          </div>
        </div>
      )}

      {/* Bottom Action Area */}
      <div className="w-full max-w-xs mt-auto pt-4 flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={() => {
            const chosen = tentativeSelection || selectedCounselorId || 'cat';
            if (isFirstVisit) {
              onSelectCounselor(chosen);
            }
            onStartChat(chosen);
          }}
          disabled={!tentativeSelection && !selectedCounselorId}
          className="w-full py-3.5 px-6 rounded-full font-bold text-base text-[#1E3A4A] bg-[#FFD966] hover:bg-[#FFCE3A] active:scale-98 shadow-md hover:shadow-lg transition-all duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed border-2 border-white/60 flex items-center justify-center gap-2"
        >
          <span>{isFirstVisit ? '시작하기' : '이야기 시작하기'}</span>
          <span className="text-lg">→</span>
        </button>

        {/* Confidentiality Reminder Banner */}
        <div className="text-[11px] text-[#4E6B7A] flex items-center justify-center gap-1.5 opacity-90">
          <span>🔒 로그인 없는 완전 익명</span>
          <span>·</span>
          <span>기기 내 안전 보관</span>
        </div>
      </div>
    </div>
  );
};
