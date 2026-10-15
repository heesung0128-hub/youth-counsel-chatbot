import React, { useState } from 'react';
import { Lock, Shield, ArrowRight, X } from 'lucide-react';
import { hashPin } from '../utils/security';

interface PinSetupModalProps {
  isOpen: boolean;
  onComplete: (hashedPin: string | null) => void;
  onClose: () => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({
  isOpen,
  onComplete,
  onClose,
}) => {
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [step, setStep] = useState<'enter' | 'confirm'>('enter');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleNumberClick = async (digit: string) => {
    setErrorMsg(null);
    if (step === 'enter') {
      if (pin.length < 4) {
        const next = pin + digit;
        setPin(next);
        if (next.length === 4) {
          setTimeout(() => {
            setStep('confirm');
          }, 150);
        }
      }
    } else {
      if (confirmPin.length < 4) {
        const next = confirmPin + digit;
        setConfirmPin(next);
        if (next.length === 4) {
          if (next === pin) {
            const hashed = await hashPin(pin);
            onComplete(hashed);
          } else {
            setErrorMsg('비밀번호가 일치하지 않아요. 다시 시도해 주세요.');
            setConfirmPin('');
            setStep('enter');
            setPin('');
          }
        }
      }
    }
  };

  const handleDelete = () => {
    setErrorMsg(null);
    if (step === 'enter') {
      setPin((prev) => prev.slice(0, -1));
    } else {
      if (confirmPin.length === 0) {
        setStep('enter');
      } else {
        setConfirmPin((prev) => prev.slice(0, -1));
      }
    }
  };

  const handleSkip = () => {
    onComplete(null);
  };

  const currentDigits = step === 'enter' ? pin : confirmPin;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-2xl border border-[#D5ECF8] flex flex-col items-center animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="w-12 h-12 rounded-2xl bg-[#E8F5FD] flex items-center justify-center text-[#5BB7E6] mb-3">
          <Lock className="w-6 h-6" />
        </div>

        <h2 className="text-lg font-bold text-[#273B47] text-center">
          {step === 'enter' ? '앱 잠금 비밀번호 설정' : '비밀번호 확인'}
        </h2>
        <p className="text-xs text-[#5D7988] text-center mt-1 max-w-xs leading-relaxed">
          {step === 'enter'
            ? '다른 사람이 내 상담 대화를 볼 수 없도록 4자리 숫자를 입력해 주세요.'
            : '확인을 위해 설정할 비밀번호를 한 번 더 입력해 주세요.'}
        </p>

        {/* Dots Representation */}
        <div className="flex gap-4 my-6">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className={`w-3.5 h-3.5 rounded-full transition-all duration-150 ${
                i < currentDigits.length
                  ? 'bg-[#5BB7E6] scale-110'
                  : 'bg-slate-200 border border-slate-300'
              }`}
            />
          ))}
        </div>

        {errorMsg && (
          <p className="text-xs text-rose-500 font-medium mb-3 text-center animate-pulse">
            {errorMsg}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[240px] mb-4">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', 'del'].map((item, idx) => {
            if (item === '') {
              return <div key={idx} />;
            }
            if (item === 'del') {
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={handleDelete}
                  className="h-12 rounded-2xl flex items-center justify-center text-sm font-semibold text-[#5B7382] hover:bg-slate-100 active:bg-slate-200 transition"
                  aria-label="지우기"
                >
                  지움
                </button>
              );
            }
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleNumberClick(item)}
                className="h-12 rounded-2xl bg-[#F4F9FC] hover:bg-[#E7F3FA] active:bg-[#D5ECF8] active:scale-95 text-lg font-bold text-[#2A3F4C] shadow-2xs border border-[#E1F0FA] transition flex items-center justify-center"
              >
                {item}
              </button>
            );
          })}
        </div>

        {/* Skip & Notice */}
        <div className="w-full pt-2 border-t border-slate-100 flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="text-xs text-[#6C8594] hover:text-[#2A3F4C] underline underline-offset-4 py-1"
          >
            다음에 설정하기 (건너뛰기)
          </button>
          <p className="text-[10px] text-[#8EA3B0] text-center">
            * 나중에 도움말(?) 메뉴에서 언제든 비밀번호를 켜거나 바꿀 수 있어요.
          </p>
        </div>
      </div>
    </div>
  );
};
