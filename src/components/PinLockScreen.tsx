import React, { useState, useEffect } from 'react';
import { Lock, ShieldAlert, KeyRound, AlertCircle } from 'lucide-react';
import {
  verifyPin,
  hashPin,
  needsRehash,
  checkLockoutStatus,
  getNextLockStateOnFailure,
} from '../utils/security';
import { AppLockSettings } from '../types';

interface PinLockScreenProps {
  lockSettings: AppLockSettings;
  onUnlockSuccess: () => void;
  onUpdateLockSettings: (settings: AppLockSettings) => void;
  onResetDataAndPin: () => void;
}

export const PinLockScreen: React.FC<PinLockScreenProps> = ({
  lockSettings,
  onUnlockSuccess,
  onUpdateLockSettings,
  onResetDataAndPin,
}) => {
  const [pin, setPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [remainingLockSeconds, setRemainingLockSeconds] = useState(0);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Check lockout status every second
  useEffect(() => {
    const updateCountdown = () => {
      const status = checkLockoutStatus(
        lockSettings.failedAttempts,
        lockSettings.lockedUntil,
        Date.now()
      );
      setRemainingLockSeconds(status.remainingSeconds);
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [lockSettings.lockedUntil, lockSettings.failedAttempts]);

  const handleDigit = async (digit: string) => {
    if (remainingLockSeconds > 0) return;
    if (pin.length >= 4) return;

    setErrorMsg(null);
    const nextPin = pin + digit;
    setPin(nextPin);

    if (nextPin.length === 4) {
      if (!lockSettings.pinHash) {
        onUnlockSuccess();
        return;
      }

      const isValid = await verifyPin(nextPin, lockSettings.pinHash);
      if (isValid) {
        // Reset failed count on success (이전 형식 해시면 솔트 있는 새 형식으로 교체)
        onUpdateLockSettings({
          ...lockSettings,
          pinHash: needsRehash(lockSettings.pinHash) ? await hashPin(nextPin) : lockSettings.pinHash,
          failedAttempts: 0,
          lockedUntil: null,
        });
        setPin('');
        onUnlockSuccess();
      } else {
        const nextState = getNextLockStateOnFailure(lockSettings.failedAttempts, Date.now());
        onUpdateLockSettings({
          ...lockSettings,
          failedAttempts: nextState.failedAttempts,
          lockedUntil: nextState.lockedUntil,
        });

        if (nextState.lockedUntil) {
          setErrorMsg('비밀번호를 5회 연속 잘못 입력하여 30초 동안 잠깁니다.');
        } else {
          setErrorMsg(
            `비밀번호가 올바르지 않아요. (${nextState.failedAttempts}/5회 오류)`
          );
        }
        setPin('');
      }
    }
  };

  const handleDelete = () => {
    if (remainingLockSeconds > 0) return;
    setErrorMsg(null);
    setPin((prev) => prev.slice(0, -1));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-between p-6 bg-gradient-to-b from-[#BFE6F7] to-[#E9F5FD]">
      {/* Top Header */}
      <div className="flex flex-col items-center mt-6 text-center">
        <div className="w-16 h-16 rounded-3xl bg-white shadow-md flex items-center justify-center text-[#5BB7E6] mb-4 border border-white/60">
          <Lock className="w-8 h-8" />
        </div>
        <h1 className="font-gaegu text-3xl font-bold text-[#203744]">
          마음 토닥 잠금 화면
        </h1>
        <p className="text-xs text-[#527080] mt-1 max-w-xs">
          소중한 상담 대화를 안전하게 지키고 있어요.
        </p>
      </div>

      {/* Center: PIN Dots & Keypad */}
      <div className="w-full max-w-xs flex flex-col items-center my-auto">
        {/* Lockout Notice */}
        {remainingLockSeconds > 0 ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-600 text-xs font-semibold mb-6 shadow-xs animate-pulse">
            <ShieldAlert className="w-4 h-4 shrink-0" />
            <span>잠시 기다려 주세요: {remainingLockSeconds}초 남음</span>
          </div>
        ) : (
          /* Dots */
          <div className="flex gap-4 my-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-150 ${
                  i < pin.length
                    ? 'bg-[#5BB7E6] scale-110 shadow-xs'
                    : 'bg-white border-2 border-[#A8D8F0]'
                }`}
              />
            ))}
          </div>
        )}

        {/* Error Message */}
        {errorMsg && remainingLockSeconds === 0 && (
          <p className="text-xs text-rose-500 font-medium mb-4 text-center">
            {errorMsg}
          </p>
        )}

        {/* Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[260px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((item, idx) => {
            if (item === '') return <div key={idx} />;
            if (item === 'del') {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={handleDelete}
                  disabled={remainingLockSeconds > 0}
                  className="h-14 rounded-2xl flex items-center justify-center text-sm font-semibold text-[#547383] hover:bg-white/60 active:bg-white/90 disabled:opacity-30 transition cursor-pointer"
                  aria-label="한 글자 지우기"
                >
                  지움
                </button>
              );
            }
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleDigit(item)}
                disabled={remainingLockSeconds > 0}
                className="h-14 rounded-2xl bg-white/80 hover:bg-white active:bg-white active:scale-95 text-xl font-bold text-[#233A48] shadow-xs border border-white/80 disabled:opacity-30 disabled:pointer-events-none transition flex items-center justify-center cursor-pointer"
              >
                {item}
              </button>
            );
          })}
        </div>
      </div>

      {/* Bottom Emergency / Reset options */}
      <div className="flex flex-col items-center gap-2 mb-2 text-center">
        <button
          type="button"
          onClick={() => setShowResetConfirm(true)}
          className="text-xs text-[#527385] hover:text-[#203744] underline underline-offset-4 py-1"
        >
          비밀번호를 잊으셨나요?
        </button>
        <span className="text-[11px] text-[#718F9F]">
          * 비밀번호는 본인 기기에만 암호화되어 있어 타인은 볼 수 없어요.
        </span>
      </div>

      {/* Reset Confirmation Modal */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="w-full max-w-xs rounded-3xl bg-white p-6 shadow-2xl border border-rose-100 flex flex-col items-center text-center">
            <AlertCircle className="w-10 h-10 text-rose-500 mb-2" />
            <h3 className="text-base font-bold text-[#233A48]">비밀번호 초기화</h3>
            <p className="text-xs text-[#5C7786] mt-1.5 leading-relaxed">
              비밀 보장을 위해 비밀번호를 재설정하면 <strong>이 기기에 저장된 기존 대화 기록이 안전하게 함께 삭제</strong>됩니다. 초기화하시겠어요?
            </p>
            <div className="flex gap-2 w-full mt-5">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="flex-1 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-[#54707F] hover:bg-slate-50 cursor-pointer"
              >
                취소
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  onResetDataAndPin();
                }}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-600 text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                초기화하고 열기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
