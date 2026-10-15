import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Download,
  Share2,
  PlusSquare,
  X,
  Smartphone,
  ShieldCheck,
  Zap,
  Globe,
  CheckCircle2,
  Sparkles,
  ExternalLink,
} from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PWAInstallButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [isAndroid, setIsAndroid] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [activeTab, setActiveTab] = useState<'benefits' | 'howTo'>('benefits');

  useEffect(() => {
    // Detect standalone mode
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const ua = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(ua);
    const isAndroidDevice = /android/.test(ua);
    setIsIOS(isIOSDevice);
    setIsAndroid(isAndroidDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
      setShowInfoModal(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleButtonClick = async () => {
    // If browser prompt is directly ready, try it or show info
    if (deferredPrompt) {
      try {
        await deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
          setIsInstalled(true);
          setDeferredPrompt(null);
          return;
        }
      } catch (err) {
        console.error('PWA install prompt error:', err);
      }
    }
    // If not prompted directly or on iOS/Desktop/In-App browser, show info modal
    setShowInfoModal(true);
  };

  const handleDirectInstallFromModal = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setIsInstalled(true);
        setDeferredPrompt(null);
        setShowInfoModal(false);
      }
    } else {
      setActiveTab('howTo');
    }
  };

  if (isInstalled) return null;

  return (
    <>
      <button
        type="button"
        onClick={handleButtonClick}
        title="홈 화면에 앱으로 추가"
        aria-label="홈 화면에 앱 추가"
        className="px-2.5 py-1 rounded-full bg-white/70 hover:bg-white text-[11px] font-bold text-[#35586C] shadow-2xs border border-white/60 flex items-center gap-1 transition cursor-pointer"
      >
        <Download className="w-3.5 h-3.5 text-[#5BB7E6]" />
        <span>앱 설치</span>
      </button>

      {/* Comprehensive Install & Benefit Modal */}
      {showInfoModal && typeof document !== 'undefined' &&
        createPortal(
          <div className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-4 bg-black/55 backdrop-blur-xs">
            <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl border border-[#D5ECF8] overflow-hidden flex flex-col max-h-[88vh] animate-in fade-in zoom-in-95 duration-150">
              {/* Header */}
            <div className="p-3.5 sm:p-4 bg-gradient-to-r from-[#EBF6FC] to-[#F5FAFE] border-b border-[#E1F0F8] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-2xl bg-white shadow-xs flex items-center justify-center text-[#5BB7E6]">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#233A48]">홈 화면에 앱 추가하기</h3>
                  <p className="text-[11px] text-[#597484]">스토어 다운로드 없이 내 폰에 바로 설치</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInfoModal(false)}
                className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
                aria-label="닫기"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Sub-tabs */}
            <div className="grid grid-cols-2 p-1.5 bg-[#F0F7FB] border-b border-[#E1EFF7] text-xs font-semibold shrink-0">
              <button
                type="button"
                onClick={() => setActiveTab('benefits')}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  activeTab === 'benefits'
                    ? 'bg-white text-[#1E3B4B] shadow-xs'
                    : 'text-[#638497] hover:text-[#1E3B4B]'
                }`}
              >
                설치 시 좋은 점
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('howTo')}
                className={`py-2 rounded-xl transition cursor-pointer ${
                  activeTab === 'howTo'
                    ? 'bg-white text-[#1E3B4B] shadow-xs'
                    : 'text-[#638497] hover:text-[#1E3B4B]'
                }`}
              >
                기기별 설치 방법
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-3.5 text-xs text-[#3E5665] leading-relaxed">
              {activeTab === 'benefits' ? (
                <>
                  {/* PWA Explanation Banner */}
                  <div className="p-3 rounded-2xl bg-[#FFF9E6] border border-[#FFE7A3]">
                    <span className="px-2 py-0.5 rounded-full bg-[#FFE082] text-[#694E03] text-[10px] font-bold">
                      💡 정식 앱스토어 어플이 아니어도 가능한가요?
                    </span>
                    <p className="text-xs text-[#635520] mt-1.5 leading-relaxed font-medium">
                      <strong>네, 웹 표준 기술(PWA)로 100% 가능합니다.</strong><br />
                      구글 플레이스토어나 애플 앱스토어의 복잡한 계정 로그인이나 부모님 승인 없이, 브라우저가 내 휴대폰 홈 화면에 진짜 앱처럼 설치해 줍니다.
                    </p>
                  </div>

                  {/* Benefit 1 */}
                  <div className="p-3 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8] flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white shadow-2xs flex items-center justify-center text-[#5BB7E6] shrink-0 mt-0.5">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1E3745] text-xs">주소창 없는 전체 화면 독립 실행</h4>
                      <p className="text-[11px] text-[#557181] mt-0.5">
                        브라우저 상단 주소창, 탭 버튼이 사라져 카카오톡 앱처럼 시원하고 몰입감 있게 대화할 수 있어요.
                      </p>
                    </div>
                  </div>

                  {/* Benefit 2 */}
                  <div className="p-3 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8] flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white shadow-2xs flex items-center justify-center text-emerald-600 shrink-0 mt-0.5">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1E3745] text-xs">비밀 보장 & 프라이버시 보호</h4>
                      <p className="text-[11px] text-[#557181] mt-0.5">
                        인터넷 검색 기록이나 방문 목록에 남지 않고, 휴대폰 안의 안전한 독립 공간에만 보관돼요.
                      </p>
                    </div>
                  </div>

                  {/* Benefit 3 */}
                  <div className="p-3 rounded-2xl bg-[#F6FAFD] border border-[#E1F0F8] flex items-start gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-white shadow-2xs flex items-center justify-center text-amber-500 shrink-0 mt-0.5">
                      <Zap className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-bold text-[#1E3745] text-xs">홈 화면에서 터치 한 번으로 빠른 실행</h4>
                      <p className="text-[11px] text-[#557181] mt-0.5">
                        매번 링크를 찾을 필요 없이 바탕화면 아이콘을 누르면 1초 만에 바로 열립니다.
                      </p>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* How to on iOS */}
                  <div className="p-3.5 rounded-2xl bg-[#F4F9FD] border border-[#DFEFF8] space-y-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] text-[10px] font-bold">
                      아이폰 (Safari 사파리)
                    </span>
                    <div className="space-y-1.5 text-xs text-[#334E5F] pt-1">
                      <div className="flex items-center gap-2">
                        <Share2 className="w-4 h-4 text-[#5BB7E6] shrink-0" />
                        <span>1. 사파리 화면 하단 <strong>공유(Share)</strong> 아이콘 탭</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <PlusSquare className="w-4 h-4 text-[#5BB7E6] shrink-0" />
                        <span>2. 메뉴 목록에서 <strong>[홈 화면에 추가]</strong> 선택</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                        <span>3. 우측 상단 <strong>[추가]</strong>를 누르면 끝!</span>
                      </div>
                    </div>
                  </div>

                  {/* How to on Android */}
                  <div className="p-3.5 rounded-2xl bg-[#F4F9FD] border border-[#DFEFF8] space-y-2">
                    <span className="px-2 py-0.5 rounded-full bg-[#E0F2FE] text-[#0369A1] text-[10px] font-bold">
                      안드로이드 (삼성 갤럭시 / Chrome)
                    </span>
                    <div className="space-y-1.5 text-xs text-[#334E5F] pt-1">
                      <div className="flex items-center gap-2">
                        <Download className="w-4 h-4 text-[#5BB7E6] shrink-0" />
                        <span>1. 이 창 아래의 <strong>[원클릭 설치]</strong> 버튼 탭</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Smartphone className="w-4 h-4 text-[#5BB7E6] shrink-0" />
                        <span>2. 또는 브라우저 우측 상단 <strong>더보기(⋮)</strong> ➔ <strong>[앱 설치]</strong> 선택</span>
                      </div>
                    </div>
                  </div>

                  {/* In-app browser warning */}
                  <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                    <strong>⚠️ 카카오톡이나 인스타그램에서 열었나요?</strong><br />
                    우측 상단 또는 하단 더보기(⋮ 또는 ⋯)를 눌러 <strong>[다른 브라우저로 열기(사파리/크롬)]</strong>를 선택한 뒤 설치해 주세요.
                  </div>
                </>
              )}
            </div>

            {/* Footer Action */}
            <div className="p-4 bg-[#F8FCFE] border-t border-[#E1EFF7] flex items-center gap-2 shrink-0">
              {deferredPrompt ? (
                <button
                  type="button"
                  onClick={handleDirectInstallFromModal}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#5BB7E6] hover:bg-[#47A6D6] text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>지금 바로 원클릭 설치하기</span>
                </button>
              ) : activeTab === 'benefits' ? (
                <button
                  type="button"
                  onClick={() => setActiveTab('howTo')}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#5BB7E6] hover:bg-[#47A6D6] text-xs font-bold text-white shadow-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                >
                  <span>내 폰에 설치하는 방법 보기</span>
                  <PlusSquare className="w-4 h-4" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowInfoModal(false)}
                  className="flex-1 py-3 px-4 rounded-xl bg-[#5BB7E6] hover:bg-[#47A6D6] text-xs font-bold text-white shadow-xs text-center cursor-pointer"
                >
                  확인 완료
                </button>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </>
  );
};
