import React, { useState, useEffect, useRef } from 'react';
import { CounselorId, ChatMessage, AppLockSettings, RiskLevel } from './types';
import { COUNSELOR_PROFILES, getLocalFallbackResponse } from './config/promptConfig';
import { evaluateConversationRisk } from './utils/conversationRisk';
import { shouldShowReferralCard } from './utils/referralDisplay';
import { loadRatingState, postponeRating, shouldPromptRating, type RatingPromptState } from './utils/ratingPrompt';
import { FeedbackModal } from './components/FeedbackModal';
import {
  generateAnonymousId,
  generateTransferCode,
  checkLockoutStatus,
} from './utils/security';
import { evaluateCrisisSignals } from './utils/crisisDetector';
import { StartScreen } from './components/StartScreen';
import { ChatScreen } from './components/ChatScreen';
import { HelpModal } from './components/HelpModal';
import { ReferralModal } from './components/ReferralModal';
import { PinSetupModal } from './components/PinSetupModal';
import { PinLockScreen } from './components/PinLockScreen';
import { OnboardingModal } from './components/OnboardingModal';

const STORAGE_KEYS = {
  ANONYMOUS_ID: 'seocho_anonymous_id',
  COUNSELOR_ID: 'seocho_counselor_selected',
  CHAT_MESSAGES: 'seocho_chat_messages',
  LOCK_SETTINGS: 'seocho_lock_settings',
  LAST_ACTIVE: 'seocho_last_active_timestamp',
  RATING_PROMPT: 'seocho_rating_prompt',
};

export default function App() {
  // 1. Anonymous identity
  const [anonymousId, setAnonymousId] = useState<string>('');
  const [transferCode, setTransferCode] = useState<string>('');

  // 2. Navigation & Counselor
  const [currentScreen, setCurrentScreen] = useState<'start' | 'chat'>('start');
  const [selectedCounselorId, setSelectedCounselorId] = useState<CounselorId | null>(null);
  const [isFirstVisit, setIsFirstVisit] = useState<boolean>(true);

  // 3. Chat Messages & Dynamic Keywords
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestedKeywords, setSuggestedKeywords] = useState<[string, string, string]>([
    '고민이 있어',
    '내 이야기 들어줄래?',
    '나 요즘 힘들어',
  ]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [activeCrisisLevel, setActiveCrisisLevel] = useState<RiskLevel>('safe');

  // 4. App Lock State
  const [lockSettings, setLockSettings] = useState<AppLockSettings>({
    isEnabled: false,
    pinHash: null,
    failedAttempts: 0,
    lockedUntil: null,
  });
  const [isAppLocked, setIsAppLocked] = useState<boolean>(false);

  // 5. Modals
  const [isHelpOpen, setIsHelpOpen] = useState<boolean>(false);
  // 앱 평가 팝업(rating) / ★ 의견 창(feedback)
  const [feedbackMode, setFeedbackMode] = useState<'rating' | 'feedback' | null>(null);
  const [ratingState, setRatingState] = useState<RatingPromptState>(() => {
    try {
      return loadRatingState(localStorage.getItem(STORAGE_KEYS.RATING_PROMPT));
    } catch {
      return { status: 'none' };
    }
  });
  const updateRatingState = (next: RatingPromptState) => {
    setRatingState(next);
    try {
      localStorage.setItem(STORAGE_KEYS.RATING_PROMPT, JSON.stringify(next));
    } catch {
      // 저장 공간을 쓸 수 없으면 이번 사용 동안만 기억
    }
  };
  const [isPinSetupOpen, setIsPinSetupOpen] = useState<boolean>(false);
  const [isReferralOpen, setIsReferralOpen] = useState<boolean>(false);
  const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
  const [referralInitialStage, setReferralInitialStage] = useState<2 | 3>(2);

  // Background inactivity tracker
  const lastActiveRef = useRef<number>(Date.now());

  // Initialization on mount
  useEffect(() => {
    // 1. Setup Anonymous ID
    let anonId = localStorage.getItem(STORAGE_KEYS.ANONYMOUS_ID);
    if (!anonId) {
      anonId = generateAnonymousId();
      localStorage.setItem(STORAGE_KEYS.ANONYMOUS_ID, anonId);
    }
    setAnonymousId(anonId);
    setTransferCode(generateTransferCode(anonId));

    // 2. Check Counselor and Visit status
    const savedCounselor = localStorage.getItem(STORAGE_KEYS.COUNSELOR_ID) as CounselorId | null;
    if (savedCounselor && ['cat', 'dog', 'monkey'].includes(savedCounselor)) {
      setSelectedCounselorId(savedCounselor);
      setIsFirstVisit(false);
      setSuggestedKeywords(COUNSELOR_PROFILES[savedCounselor].defaultKeywords);
    } else {
      setIsFirstVisit(true);
      setSelectedCounselorId(null);
    }

    // 3. Load Lock Settings
    const savedLock = localStorage.getItem(STORAGE_KEYS.LOCK_SETTINGS);
    if (savedLock) {
      try {
        const parsed = JSON.parse(savedLock);
        setLockSettings(parsed);
        // If locked on launch
        if (parsed.isEnabled && parsed.pinHash) {
          setIsAppLocked(true);
        }
      } catch (e) {
        console.error('Failed to parse lock settings:', e);
      }
    }

    // 4. Load Messages
    const savedMessages = localStorage.getItem(STORAGE_KEYS.CHAT_MESSAGES);
    if (savedMessages) {
      try {
        const parsed = JSON.parse(savedMessages);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          // Check if any message flagged crisis
          const lastMsg = parsed[parsed.length - 1];
          if (lastMsg && lastMsg.suggestedKeywords) {
            setSuggestedKeywords(lastMsg.suggestedKeywords);
          }
          if (lastMsg && lastMsg.riskLevel === 'crisis') {
            setActiveCrisisLevel('crisis');
          }
        }
      } catch (e) {
        console.error('Failed to parse saved chat messages:', e);
      }
    }
  }, []);

  // 대화가 어느 정도 쌓이면 앱 평가 팝업 (규칙: utils/ratingPrompt.ts)
  useEffect(() => {
    // 채팅 화면에서만, 다른 창이 떠 있지 않을 때만
    if (currentScreen !== 'chat' || isLoading || feedbackMode || isHelpOpen) return;
    const counselorReplies = messages.filter((m) => m.sender === 'counselor');
    const last = counselorReplies[counselorReplies.length - 1];
    if (!shouldPromptRating(ratingState, counselorReplies.length, last?.riskLevel)) return;
    const timer = setTimeout(() => setFeedbackMode('rating'), 1500);
    return () => clearTimeout(timer);
  }, [currentScreen, messages, isLoading, feedbackMode, isHelpOpen, ratingState]);

  // Save messages to localStorage whenever they change
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEYS.CHAT_MESSAGES, JSON.stringify(messages));
    }
  }, [messages]);

  // Handle visibilitychange & idle auto-lock (1 minute threshold)
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        lastActiveRef.current = Date.now();
      } else {
        const idleTime = Date.now() - lastActiveRef.current;
        // 1 minute = 60,000ms
        if (idleTime >= 60000 && lockSettings.isEnabled && lockSettings.pinHash) {
          setIsAppLocked(true);
        }
      }
    };

    const handleUserActivity = () => {
      lastActiveRef.current = Date.now();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('click', handleUserActivity);
    window.addEventListener('keydown', handleUserActivity);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('click', handleUserActivity);
      window.removeEventListener('keydown', handleUserActivity);
    };
  }, [lockSettings.isEnabled, lockSettings.pinHash]);

  // Handler: Select Counselor
  const handleSelectCounselor = (id: CounselorId) => {
    setSelectedCounselorId(id);
    localStorage.setItem(STORAGE_KEYS.COUNSELOR_ID, id);
    setSuggestedKeywords(COUNSELOR_PROFILES[id].defaultKeywords);
  };

  // Handler: Start Chat
  const handleStartChat = (counselorId?: CounselorId) => {
    const targetCounselor = counselorId || selectedCounselorId || 'cat';
    if (!selectedCounselorId || selectedCounselorId !== targetCounselor) {
      handleSelectCounselor(targetCounselor);
    }

    // If first visit, show the multi-step onboarding guide first
    if (isFirstVisit) {
      setIsOnboardingOpen(true);
      return;
    }

    proceedToChat(targetCounselor);
  };

  const handleOnboardingComplete = () => {
    setIsOnboardingOpen(false);
    // After onboarding, offer PIN lock setup if not set yet
    if (!lockSettings.pinHash) {
      setIsPinSetupOpen(true);
    } else {
      proceedToChat();
    }
  };

  const proceedToChat = (counselorId?: CounselorId) => {
    const counselor = counselorId || selectedCounselorId || 'cat';

    // Check if initial greeting needs to be added
    if (messages.length === 0) {
      const profile = COUNSELOR_PROFILES[counselor];
      const initialGreetingMsg: ChatMessage = {
        id: `msg-${Date.now()}-counselor-greeting`,
        sender: 'counselor',
        text: profile.greetingMessage,
        timestamp: Date.now(),
        riskLevel: 'safe',
        suggestedKeywords: profile.defaultKeywords,
      };
      setMessages([initialGreetingMsg]);
    }

    setIsFirstVisit(false);
    setCurrentScreen('chat');
  };

  // Handler: Complete PIN Setup
  const handlePinSetupComplete = (hashedPin: string | null) => {
    setIsPinSetupOpen(false);

    if (hashedPin) {
      const updated: AppLockSettings = {
        isEnabled: true,
        pinHash: hashedPin,
        failedAttempts: 0,
        lockedUntil: null,
      };
      setLockSettings(updated);
      localStorage.setItem(STORAGE_KEYS.LOCK_SETTINGS, JSON.stringify(updated));
    }

    proceedToChat();
  };

  // Handler: Send Message
  const handleSendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const counselor = selectedCounselorId || 'cat';

    // 1. Append User Message
    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-user`,
      sender: 'user',
      text: text.trim(),
      timestamp: Date.now(),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setIsLoading(true);

    // 2. Client-side heuristic crisis check immediately
    const clientCheck = evaluateCrisisSignals(text);
    if (clientCheck.riskLevel === 'crisis') {
      setActiveCrisisLevel('crisis');
    }

    try {
      // 3. Call server-side API (keeps API key secure on server)
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counselorId: counselor,
          userMessage: text.trim(),
          conversationHistory: newHistory,
          anonymousId,
        }),
      });

      if (!res.ok) {
        throw new Error(`Server returned ${res.status}`);
      }

      const data = await res.json();

      // Check risk level returned by AI / safety fallback
      const finalRisk: RiskLevel = clientCheck.riskLevel === 'crisis' ? 'crisis' : data.riskLevel;
      // 위기 턴에만 상단 긴급 배너를 띄우고, 대화가 위기가 아닌 쪽으로 넘어가면 내림
      setActiveCrisisLevel(finalRisk === 'crisis' ? 'crisis' : 'safe');

      // 4. Update suggested keywords
      if (data.suggestedKeywords && data.suggestedKeywords.length === 3) {
        setSuggestedKeywords(data.suggestedKeywords);
      }

      // 5. Append AI Counselor Response
      const counselorMsg: ChatMessage = {
        id: `msg-${Date.now()}-counselor`,
        sender: 'counselor',
        text: data.message,
        timestamp: Date.now(),
        riskLevel: finalRisk,
        suggestedKeywords: data.suggestedKeywords,
        // 같은 연계 카드가 매 턴 반복되지 않게 (최근 3개 답변에 같은 단계 카드가 있으면 생략)
        isReferralOffer: shouldShowReferralCard(
          messages,
          data.shouldOfferReferral === true,
          finalRisk === 'crisis' ? 3 : data.referralStage === 3 ? 3 : 2
        ),
        referralStage: data.referralStage || (finalRisk === 'crisis' ? 3 : 2),
        isSafetyCheck: data.safetyCheck === true && finalRisk !== 'crisis',
      };

      setMessages((prev) => [...prev, counselorMsg]);
    } catch (error) {
      console.error('Chat error:', error);

      // 서버에 닿지 못할 때(오프라인 등): 서버와 같은 대화 흐름 규칙 판단 + 내장 응답
      const risk = evaluateConversationRisk(text, messages);
      const fallback = getLocalFallbackResponse(counselor, text, risk.riskLevel, {
        safetyCheck: risk.needsSafetyCheck,
      });
      setActiveCrisisLevel(fallback.riskLevel === 'crisis' ? 'crisis' : 'safe');
      const fallbackStage: 2 | 3 = 'referralStage' in fallback && fallback.referralStage === 3 ? 3 : 2;

      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now()}-counselor-fallback`,
        sender: 'counselor',
        text: fallback.message,
        timestamp: Date.now(),
        riskLevel: fallback.riskLevel,
        suggestedKeywords: fallback.suggestedKeywords,
        isReferralOffer: shouldShowReferralCard(messages, fallback.shouldOfferReferral, fallbackStage),
        referralStage: fallbackStage,
        isSafetyCheck: 'safetyCheck' in fallback && fallback.safetyCheck === true,
      };

      setMessages((prev) => [...prev, fallbackMsg]);
      setSuggestedKeywords(fallback.suggestedKeywords);
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Change Counselor (from Help modal)
  const handleChangeCounselor = () => {
    setIsFirstVisit(true);
    setCurrentScreen('start');
  };

  // Handler: Clear All Chat History
  const handleClearChatHistory = () => {
    localStorage.removeItem(STORAGE_KEYS.CHAT_MESSAGES);
    setMessages([]);
    setActiveCrisisLevel('safe');
    if (selectedCounselorId) {
      setSuggestedKeywords(COUNSELOR_PROFILES[selectedCounselorId].defaultKeywords);
    }
  };

  // Handler: Reset Data & PIN (from lock screen)
  const handleResetDataAndPin = () => {
    handleClearChatHistory();
    const cleanLock: AppLockSettings = {
      isEnabled: false,
      pinHash: null,
      failedAttempts: 0,
      lockedUntil: null,
    };
    setLockSettings(cleanLock);
    localStorage.setItem(STORAGE_KEYS.LOCK_SETTINGS, JSON.stringify(cleanLock));
    setIsAppLocked(false);
  };

  // Handler: Open Referral Details Modal
  const handleOpenReferralDetails = (stage: 2 | 3) => {
    setReferralInitialStage(stage);
    setIsReferralOpen(true);
  };

  return (
    <div className="w-full min-h-screen bg-slate-200 sm:py-6 flex items-center justify-center font-['Gowun_Dodum',sans-serif]">
      {/* 
        Mobile First Container:
        Width 360px ~ 430px centered card on desktop, full screen on mobile.
      */}
      <div className="w-full max-w-[430px] h-screen sm:h-[860px] max-h-screen sm:rounded-[36px] bg-[#BFE6F7] shadow-2xl overflow-hidden flex flex-col relative border-0 sm:border-8 sm:border-white/70">
        {/* Screen Routing */}
        {currentScreen === 'start' ? (
          <StartScreen
            selectedCounselorId={selectedCounselorId}
            onSelectCounselor={handleSelectCounselor}
            onStartChat={handleStartChat}
            isFirstVisit={isFirstVisit}
            onOpenOnboarding={() => setIsOnboardingOpen(true)}
          />
        ) : (
          <ChatScreen
            counselorId={selectedCounselorId || 'cat'}
            messages={messages}
            onSendMessage={handleSendMessage}
            isLoading={isLoading}
            onOpenHelp={() => setIsHelpOpen(true)}
            onLockApp={() => setIsAppLocked(true)}
            suggestedKeywords={suggestedKeywords}
            activeCrisisLevel={activeCrisisLevel}
            onDismissCrisisBanner={() => setActiveCrisisLevel('safe')}
            onOpenFeedback={() => setFeedbackMode('feedback')}
            onOpenReferralDetails={handleOpenReferralDetails}
          />
        )}

        {/* Multi-step Onboarding Modal */}
        <OnboardingModal
          isOpen={isOnboardingOpen}
          onClose={() => setIsOnboardingOpen(false)}
          onComplete={handleOnboardingComplete}
        />

        {/* PIN Setup Modal */}
        <PinSetupModal
          isOpen={isPinSetupOpen}
          onComplete={handlePinSetupComplete}
          onClose={() => {
            setIsPinSetupOpen(false);
            proceedToChat();
          }}
        />

        {/* 앱 평가 팝업 · ★ 의견 창 */}
        <FeedbackModal
          isOpen={feedbackMode !== null}
          mode={feedbackMode ?? 'feedback'}
          counselorId={selectedCounselorId || 'cat'}
          onClose={() => {
            // 평가 팝업을 그냥 닫으면 "나중에"와 같게 처리
            if (feedbackMode === 'rating' && ratingState.status !== 'done') {
              updateRatingState(postponeRating(ratingState, messages.filter((m) => m.sender === 'counselor').length));
            }
            setFeedbackMode(null);
          }}
          onLater={() => {
            updateRatingState(postponeRating(ratingState, messages.filter((m) => m.sender === 'counselor').length));
            setFeedbackMode(null);
          }}
          onSubmitted={() => updateRatingState({ status: 'done' })}
        />

        {/* Help Modal ("?" Button) */}
        <HelpModal
          isOpen={isHelpOpen}
          onClose={() => setIsHelpOpen(false)}
          currentCounselorId={selectedCounselorId || 'cat'}
          onChangeCounselor={handleChangeCounselor}
          onOpenPinSetup={() => setIsPinSetupOpen(true)}
          onClearChatHistory={handleClearChatHistory}
          anonymousId={anonymousId}
          transferCode={transferCode}
          lockSettings={lockSettings}
          onOpenReferralDetails={handleOpenReferralDetails}
          onOpenOnboarding={() => {
            setIsHelpOpen(false);
            setIsOnboardingOpen(true);
          }}
        />

        {/* Stepped Referral Modal */}
        <ReferralModal
          isOpen={isReferralOpen}
          onClose={() => setIsReferralOpen(false)}
          initialStage={referralInitialStage}
        />

        {/* PIN Lock Screen Overlay */}
        {isAppLocked && lockSettings.isEnabled && lockSettings.pinHash && (
          <PinLockScreen
            lockSettings={lockSettings}
            onUnlockSuccess={() => setIsAppLocked(false)}
            onUpdateLockSettings={(newSettings) => {
              setLockSettings(newSettings);
              localStorage.setItem(STORAGE_KEYS.LOCK_SETTINGS, JSON.stringify(newSettings));
            }}
            onResetDataAndPin={handleResetDataAndPin}
          />
        )}
      </div>
    </div>
  );
}
