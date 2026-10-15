import React, { useState, useEffect, useRef } from 'react';
import { CounselorId, ChatMessage, AppLockSettings, RiskLevel } from './types';
import { COUNSELOR_PROFILES } from './config/promptConfig';
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
      if (finalRisk === 'crisis') {
        setActiveCrisisLevel('crisis');
      }

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
        isReferralOffer: data.shouldOfferReferral,
        referralStage: data.referralStage || (finalRisk === 'crisis' ? 3 : 2),
      };

      setMessages((prev) => [...prev, counselorMsg]);
    } catch (error) {
      console.error('Chat error:', error);

      // Safe local fallback on unexpected network failure
      const fallbackMsg: ChatMessage = {
        id: `msg-${Date.now()}-counselor-fallback`,
        sender: 'counselor',
        text: `${COUNSELOR_PROFILES[counselor].name}이 네 곁에서 이야기 잘 듣고 있어. 지금 마음이 많이 복잡하고 지쳤을 텐데, 천천히 깊게 숨을 한번 쉬어볼까? 네 편에서 항상 함께할게.`,
        timestamp: Date.now(),
        riskLevel: clientCheck.riskLevel,
        suggestedKeywords: ['숨 한번 깊게 쉴게', '마음이 조금 답답해', '이야기 들어줘서 고마워'],
        isReferralOffer: clientCheck.riskLevel !== 'safe',
        referralStage: clientCheck.riskLevel === 'crisis' ? 3 : 2,
      };

      setMessages((prev) => [...prev, fallbackMsg]);
      setSuggestedKeywords(['숨 한번 깊게 쉴게', '마음이 조금 답답해', '이야기 들어줘서 고마워']);
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
