import React, { useState, useRef, useEffect } from 'react';
import {
  HelpCircle,
  Lock,
  Play,
  Phone,
  AlertTriangle,
  ChevronDown,
  X,
  ShieldCheck,
  HeartHandshake,
  ExternalLink,
  MessageSquare,
  Volume2,
  Star,
  VolumeX,
} from 'lucide-react';
import { CounselorId, ChatMessage, RiskLevel } from '../types';
import { COUNSELOR_PROFILES } from '../config/promptConfig';
import { EMERGENCY_HOTLINES, CRISIS_MESSAGES } from '../config/crisisConfig';
import { REFERRAL_CONFIG } from '../config/referralConfig';
import { detectPersonalInfo, PERSONAL_INFO_LABELS, type PersonalInfoKind } from '../utils/personalInfo';
import { CounselorAvatar } from './CounselorAvatar';
import { PWAInstallButton } from './PWAInstallButton';
import {
  playMessageBlipSound,
  playSendSoftSound,
  isSoundEnabled,
  setSoundEnabled,
} from '../utils/soundEffects';

interface ChatScreenProps {
  counselorId: CounselorId;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  isLoading: boolean;
  onOpenHelp: () => void;
  onLockApp: () => void;
  suggestedKeywords: [string, string, string];
  activeCrisisLevel: RiskLevel;
  onDismissCrisisBanner?: () => void;
  onOpenFeedback?: () => void;
  onOpenReferralDetails: (stage: 2 | 3) => void;
}

export const ChatScreen: React.FC<ChatScreenProps> = ({
  counselorId,
  messages,
  onSendMessage,
  isLoading,
  onOpenHelp,
  onLockApp,
  suggestedKeywords,
  activeCrisisLevel,
  onDismissCrisisBanner,
  onOpenFeedback,
  onOpenReferralDetails,
}) => {
  const [inputText, setInputText] = useState('');
  // 개인정보로 보이는 내용이 있을 때 보내기 전 확인 (확인한 문장은 그대로 보냄)
  const [privacyWarning, setPrivacyWarning] = useState<{ text: string; kinds: PersonalInfoKind[] } | null>(null);
  const [showCrisisDetails, setShowCrisisDetails] = useState(false);
  const [soundOn, setSoundOn] = useState<boolean>(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatScrollContainerRef = useRef<HTMLDivElement>(null);
  const prevMessagesCountRef = useRef<number>(messages.length);

  const counselorProfile = COUNSELOR_PROFILES[counselorId];

  useEffect(() => {
    setSoundOn(isSoundEnabled());
  }, []);

  const handleToggleSound = () => {
    const next = !soundOn;
    setSoundOn(next);
    setSoundEnabled(next);
  };

  // Play gentle blip sound when a new counselor message arrives
  useEffect(() => {
    if (messages.length > prevMessagesCountRef.current) {
      const lastMsg = messages[messages.length - 1];
      if (lastMsg && lastMsg.sender === 'counselor') {
        playMessageBlipSound();
      }
    }
    prevMessagesCountRef.current = messages.length;
  }, [messages]);

  // Auto-scroll to bottom on new messages or loading
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({ behavior });
  };

  useEffect(() => {
    scrollToBottom('smooth');
  }, [messages.length, isLoading]);

  const sendNow = (text: string) => {
    playSendSoftSound();
    onSendMessage(text);
    setInputText('');
    setPrivacyWarning(null);
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmed = inputText.trim();
    if (!trimmed || isLoading) return;
    const kinds = detectPersonalInfo(trimmed);
    if (kinds.length > 0 && privacyWarning?.text !== trimmed) {
      setPrivacyWarning({ text: trimmed, kinds });
      return;
    }
    sendNow(trimmed);
  };

  const handleKeywordClick = (keyword: string) => {
    if (isLoading) return;
    playSendSoftSound();
    onSendMessage(keyword);
  };

  return (
    <div className="h-full flex flex-col bg-[#BFE6F7] text-[#3A3A3A] relative overflow-hidden">
      {/* ========================================================
          1. 상단 바 (Header)
         ======================================================== */}
      <header className="shrink-0 h-16 bg-[#BFE6F7]/95 backdrop-blur-md px-3 sm:px-4 border-b border-[#A6D6EC] flex items-center justify-between z-20 shadow-2xs">
        {/* Left: Counselor circular profile avatar + name with subtle thinking animation when typing */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          <div className="relative">
            <CounselorAvatar counselorId={counselorId} size="sm" isThinking={isLoading} />
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full ring-2 ring-white transition-colors duration-300 ${
                isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500'
              }`}
            />
          </div>
          <div className="flex flex-col text-left">
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-sm sm:text-base text-[#1E3745] tracking-tight">
                {counselorProfile.name}
              </span>
              <span className="text-[10px] bg-white/70 text-[#43677A] px-1.5 py-0.2 rounded-full font-medium">
                {isLoading ? '생각하는 중…' : counselorProfile.badge}
              </span>
            </div>
            <span className="text-[11px] text-[#527385] leading-none mt-0.5 font-medium whitespace-nowrap truncate max-w-[9.5rem]">
              {isLoading ? '네 이야기를 소중히 정리하고 있어' : '항상 네 편에서 들어줄게'}
            </span>
          </div>
        </div>

        {/* Right: Sound toggle, Lock, PWA, and Circular "?" Help Button */}
        <div className="flex items-center gap-1 sm:gap-1.5">
          <button
            type="button"
            onClick={handleToggleSound}
            title={soundOn ? '효과음 켜짐 (클릭하여 끄기)' : '효과음 꺼짐 (클릭하여 켜기)'}
            aria-label={soundOn ? '효과음 끄기' : '효과음 켜기'}
            className="w-8.5 h-8.5 rounded-full bg-white/70 hover:bg-white text-[#476C7F] hover:text-[#1E3745] flex items-center justify-center shadow-2xs border border-white/60 transition cursor-pointer"
          >
            {soundOn ? <Volume2 className="w-3.5 h-3.5 text-[#5BB7E6]" /> : <VolumeX className="w-3.5 h-3.5 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={onLockApp}
            title="화면 잠금"
            aria-label="화면 잠금"
            className="w-8.5 h-8.5 rounded-full bg-white/70 hover:bg-white text-[#476C7F] hover:text-[#1E3745] flex items-center justify-center shadow-2xs border border-white/60 transition cursor-pointer"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>

          <PWAInstallButton />

          {/* ★ 피드백 (개선할 점·좋은 점) */}
          {onOpenFeedback && (
            <button
              type="button"
              onClick={onOpenFeedback}
              title="의견 보내기 (개선할 점 · 좋은 점)"
              aria-label="의견 보내기"
              className="w-8.5 h-8.5 rounded-full bg-white/70 hover:bg-white flex items-center justify-center shadow-2xs border border-white/60 transition cursor-pointer"
            >
              <Star className="w-4 h-4 text-[#F2B21B]" />
            </button>
          )}

          {/* Circular "?" Button */}
          <button
            type="button"
            onClick={onOpenHelp}
            title="도움말 및 안전 안내"
            aria-label="도움말 열기"
            className="w-8.5 h-8.5 rounded-full bg-white text-[#214355] hover:bg-[#FFF3B0] flex items-center justify-center shadow-xs border-2 border-[#7CC6EA] font-extrabold text-base transition-all hover:scale-105 active:scale-95 cursor-pointer"
          >
            <HelpCircle className="w-4.5 h-4.5 text-[#24526A]" />
          </button>
        </div>
      </header>

      {/* ========================================================
          고정 위기 지원 카드 (Pinned Top Crisis Card)
         ======================================================== */}
      {activeCrisisLevel === 'crisis' && (
        <div className="shrink-0 bg-gradient-to-r from-rose-500 to-amber-500 text-white px-3.5 py-2.5 shadow-md z-15 animate-in slide-in-from-top-2 duration-200">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-white shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold leading-tight">
                  {CRISIS_MESSAGES.bannerTitle}
                </p>
                <p className="text-[11px] text-rose-100 mt-0.5 leading-snug">
                  24시간 익명 무료 상담전화가 언제나 너를 기다리고 있어.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => setShowCrisisDetails(!showCrisisDetails)}
                className="px-2 py-1 rounded-lg bg-white/20 hover:bg-white/30 text-[11px] font-bold text-white cursor-pointer"
              >
                {showCrisisDetails ? '접기' : '긴급전화'}
              </button>
              {onDismissCrisisBanner && (
                <button
                  type="button"
                  onClick={() => {
                    setShowCrisisDetails(false);
                    onDismissCrisisBanner();
                  }}
                  aria-label="긴급 안내 닫기"
                  title="닫기 (도움말 ?에서 언제든 다시 볼 수 있어요)"
                  className="w-6 h-6 rounded-lg bg-white/20 hover:bg-white/30 flex items-center justify-center cursor-pointer"
                >
                  <X className="w-3.5 h-3.5 text-white" />
                </button>
              )}
            </div>
          </div>

          {/* Expandable Emergency Hotlines */}
          {showCrisisDetails && (
            <div className="mt-2.5 pt-2 border-t border-white/25 grid grid-cols-2 gap-2 text-xs">
              <a
                href="tel:1388"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white text-rose-700 font-bold shadow-xs hover:bg-rose-50 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>청소년 1388</span>
              </a>
              <a
                href="tel:109"
                className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-white text-rose-700 font-bold shadow-xs hover:bg-rose-50 transition"
              >
                <Phone className="w-3.5 h-3.5" />
                <span>위기상담 109</span>
              </a>
              <div className="col-span-2 text-[10px] text-rose-100 text-center">
                문자 상담 #1388 · 카카오톡 '청소년상담1388' (24시간 무료)
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========================================================
          2. 대화 영역 (Message Thread) - 중앙의 가장 넓은 부분
         ======================================================== */}
      <main
        ref={chatScrollContainerRef}
        tabIndex={0}
        aria-label="상담 대화 내용 목록"
        className="flex-1 overflow-y-auto px-3.5 sm:px-4 py-4 space-y-4 focus:outline-hidden"
      >
        {/* Subtle Top Notice for Trust */}
        <div className="flex justify-center my-1">
          <span className="px-3 py-1 rounded-full bg-white/50 backdrop-blur-xs text-[11px] text-[#4F6F81] font-medium shadow-2xs border border-white/40">
            🔒 이름·학교·연락처는 쓰지 마세요 · 기록은 이 기기에만 저장돼요
          </span>
        </div>

        {/* Message Bubbles */}
        {messages.map((msg) => {
          const isCounselor = msg.sender === 'counselor';

          if (isCounselor) {
            return (
              <div
                key={msg.id}
                className="flex items-start gap-2 max-w-[92%] sm:max-w-[85%] text-left animate-in fade-in slide-in-from-bottom-2 duration-150"
              >
                {/* Counselor Avatar */}
                <CounselorAvatar counselorId={counselorId} size="sm" className="mt-1" />

                {/* AI Speech Bubble: wide bubble, pastel yellow #FFF3B0, tail pointing to avatar */}
                <div className="relative group">
                  <div className="relative bg-[#FFF3B0] text-[#3A3A3A] text-sm sm:text-base leading-relaxed px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs border border-[#FFE785]">
                    {/* Tail pointing left */}
                    <div className="absolute top-3 -left-2 w-0 h-0 border-t-8 border-t-transparent border-r-8 border-r-[#FFF3B0] border-b-8 border-b-transparent" />

                    <p className="whitespace-pre-wrap">{msg.text}</p>

                    {/* 안전 확인 질문 턴: 큰 연계 카드 대신 조용한 안내 한 줄 */}
                    {msg.isSafetyCheck && !msg.isReferralOffer && (
                      <a
                        href="tel:1388"
                        className="mt-2.5 pt-2 border-t border-[#F2DE82]/80 flex items-center gap-1.5 text-[11px] text-[#7A6418] hover:text-[#574204]"
                      >
                        <Phone className="w-3 h-3 shrink-0" />
                        <span>대답하기 어렵다면, 청소년상담 1388(24시간)에서 익명으로 이야기할 수 있어.</span>
                      </a>
                    )}

                    {/* Step 2 / Step 3 Interactive Referral Offer Card */}
                    {msg.isReferralOffer && (
                      <div className="mt-3 pt-2.5 border-t border-[#F2DE82]/80 flex flex-col gap-2">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-[#6D5409]">
                          <HeartHandshake className="w-4 h-4 text-[#C98B00]" />
                          <span>청소년상담 1388 · Wee클래스 안내</span>
                        </div>
                        <p className="text-xs text-[#6B5512] leading-snug">
                          {REFERRAL_CONFIG.stage2.description} ({REFERRAL_CONFIG.stage2.serviceName},{' '}
                          {REFERRAL_CONFIG.stage2.hours}) 학교 안에서는 Wee클래스 선생님을 만날 수 있어요.
                        </p>
                        <button
                          type="button"
                          onClick={() => onOpenReferralDetails(2)}
                          className="mt-1 py-1.5 px-3 rounded-xl bg-white hover:bg-[#FFF9DB] text-xs font-bold text-[#574204] shadow-2xs border border-[#F0DC82] flex items-center justify-between transition cursor-pointer"
                        >
                          <span>자세히 보고 동의 후 연결하기</span>
                          <ExternalLink className="w-3.5 h-3.5 text-[#B8860B]" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Timestamp */}
                  <span className="text-[10px] text-[#5D7E8F] mt-1 ml-1 block">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              </div>
            );
          }

          /* User Message: right aligned bubble, white/light blue */
          return (
            <div
              key={msg.id}
              className="flex flex-col items-end max-w-[85%] ml-auto text-right animate-in fade-in slide-in-from-bottom-2 duration-150"
            >
              <div className="bg-white text-[#2B3E48] text-sm sm:text-base leading-relaxed px-4 py-2.5 rounded-2xl rounded-tr-xs shadow-xs border border-white/80">
                <p className="whitespace-pre-wrap">{msg.text}</p>
              </div>
              <span className="text-[10px] text-[#5D7E8F] mt-1 mr-1">
                {new Date(msg.timestamp).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          );
        })}

        {/* AI Typing Animation Dots */}
        {isLoading && (
          <div className="flex items-start gap-2 max-w-[85%] text-left animate-in fade-in">
            <CounselorAvatar counselorId={counselorId} size="sm" className="mt-1" isThinking={true} />
            <div className="relative bg-[#FFF3B0] text-[#3A3A3A] px-4 py-3 rounded-2xl rounded-tl-xs shadow-xs border border-[#FFE785]">
              <div className="flex items-center gap-1.5 h-5">
                <span className="w-2 h-2 rounded-full bg-[#B39824] animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#B39824] animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 rounded-full bg-[#B39824] animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </main>

      {/* ========================================================
          3. 키워드 추천창 (입력창 바로 위)
          - 가로로 긴 직사각형 영역을 세로선으로 3칸 나눈 버튼 묶음
         ======================================================== */}
      <div className="shrink-0 px-3.5 sm:px-4 pt-1 pb-2">
        <div className="w-full bg-[#FFD966] rounded-2xl shadow-xs border border-[#F2C84B] overflow-hidden">
          <div className="grid grid-cols-3 divide-x divide-[#DEAF23]">
            {suggestedKeywords.map((keyword, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleKeywordClick(keyword)}
                disabled={isLoading}
                className="py-2.5 px-2 text-center text-xs sm:text-[13px] font-bold text-[#3E3000] hover:bg-[#FFE38A] active:bg-[#F5CA44] active:scale-98 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer truncate flex items-center justify-center min-h-[44px]"
                title={keyword}
              >
                <span className="truncate">{keyword}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ========================================================
          4. 입력창 (화면 맨 아래)
          - 양 끝이 둥근 알약 모양의 긴 입력창
          - 안내 문구: "편하게 이야기해 주세요"
          - 오른쪽 끝 안쪽에 원형 전송 버튼(▶ 재생 모양 아이콘)
         ======================================================== */}
      <footer className="shrink-0 px-3.5 sm:px-4 pb-4 pt-0">
        {/* 개인정보 경고: 보내기 전에 한 번 확인 */}
        {privacyWarning && (
          <div role="alert" className="mb-2 p-3 rounded-2xl bg-[#FFF4E5] border border-[#FFD8A8] text-xs text-[#7A4B00] shadow-2xs">
            <p className="font-bold">
              {privacyWarning.kinds.map((k) => PERSONAL_INFO_LABELS[k]).join(', ')}처럼 보이는 내용이 있어요.
            </p>
            <p className="mt-0.5 text-[11px] text-[#8A5A0F]">
              개인정보는 지우고 보내는 게 안전해요. 전화번호·이메일은 서버에서도 가려져요.
            </p>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setPrivacyWarning(null)}
                className="flex-1 py-1.5 rounded-xl bg-white border border-[#FFD8A8] font-bold text-[#7A4B00] cursor-pointer"
              >
                고칠게요
              </button>
              <button
                type="button"
                onClick={() => sendNow(privacyWarning.text)}
                className="flex-1 py-1.5 rounded-xl bg-[#F2B21B]/20 hover:bg-[#F2B21B]/30 font-bold text-[#7A4B00] cursor-pointer"
              >
                그대로 보내기
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="relative flex items-center">
          <input
            type="text"
            value={inputText}
            onChange={(e) => {
              setInputText(e.target.value);
              if (privacyWarning) setPrivacyWarning(null);
            }}
            disabled={isLoading}
            placeholder="편하게 이야기해 주세요"
            className="w-full h-13 pl-5 pr-14 rounded-full bg-white text-[#3A3A3A] placeholder-[#8EA8B8] text-sm sm:text-base shadow-md border-2 border-white focus:outline-hidden focus:border-[#7CC6EA] transition disabled:bg-slate-50"
          />

          {/* Circular Send Button with ▶ Icon inside right */}
          <button
            type="submit"
            disabled={!inputText.trim() || isLoading}
            aria-label="메시지 전송"
            className="absolute right-1.5 w-10 h-10 rounded-full bg-[#7CC6EA] hover:bg-[#5BB7E6] active:scale-90 text-white flex items-center justify-center shadow-xs transition disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white ml-0.5" />
          </button>
        </form>
      </footer>
    </div>
  );
};
