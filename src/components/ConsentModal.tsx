import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';

/**
 * 첫 실행 안내·동의 화면
 * 학생이 앱의 한계와 정보 처리 방식을 알고 시작하도록, 확인해야 대화를 시작할 수 있습니다.
 * 문구는 보호자 안내·동의서 문서의 "학생 안내·동의 문구"와 같게 유지하세요.
 * 내용을 크게 바꾸면 CONSENT_VERSION 을 올려 기존 학생에게도 다시 보여 주세요.
 */
export const CONSENT_VERSION = '2026-10-19';

export const CONSENT_ITEMS = [
  '마음토닥의 캐릭터는 AI예요. 전문 상담 선생님을 대신하지 않고, 답이 틀릴 수도 있어요.',
  '쓴 내용은 답을 만들기 위해 외부 AI 서비스로 보내져요. 학교·선생님은 대화를 볼 수 없고, 대화 기록은 이 기기에만 저장돼요.',
  '이름·학교·반·전화번호·친구 이름 같은 개인정보는 쓰지 마세요. 전화번호·이메일처럼 보이는 내용은 보내기 전에 한 번 더 확인하고, 서버에서도 가려져요.',
  '위험한 상황이면 청소년상담 1388·자살예방 상담전화 109·Wee클래스를 안내해요. 하지만 앱이 누군가에게 자동으로 알리지는 않아요. 지금 위험하다면 바로 112·119·1388에 연락하세요.',
  '대화 기록은 언제든 지울 수 있고, 화면 잠금(PIN)도 걸 수 있어요.',
];

interface ConsentModalProps {
  isOpen: boolean;
  onAgree: () => void;
  onCancel: () => void;
}

export const ConsentModal: React.FC<ConsentModalProps> = ({ isOpen, onAgree, onCancel }) => {
  const [checked, setChecked] = useState(false);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="consent-title"
        className="w-full max-w-md max-h-[90vh] rounded-3xl bg-white shadow-2xl flex flex-col overflow-hidden border border-[#D5ECF8] animate-in fade-in zoom-in-95 duration-150"
      >
        <div className="p-4 bg-gradient-to-r from-[#EBF6FC] to-[#F5FAFE] border-b border-[#E1F0F8] flex items-center gap-2 shrink-0">
          <div className="w-9 h-9 rounded-2xl bg-white shadow-xs flex items-center justify-center text-[#5BB7E6]">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 id="consent-title" className="text-base font-bold text-[#203744]">
              시작하기 전에 꼭 읽어 주세요
            </h2>
            <p className="text-[11px] text-[#608092]">처음 한 번만 확인하면 돼요</p>
          </div>
        </div>

        <ol className="p-4 sm:p-5 overflow-y-auto space-y-2.5 text-xs sm:text-sm text-[#384E5B] leading-relaxed list-none">
          {CONSENT_ITEMS.map((item, i) => (
            <li key={i} className="flex gap-2">
              <span className="w-5 h-5 shrink-0 rounded-full bg-[#EAF5FC] text-[#2E6A8E] text-[11px] font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ol>

        <div className="p-4 border-t border-[#E1EFF7] bg-[#F8FCFE] space-y-3 shrink-0">
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded text-[#5BB7E6] focus:ring-[#7CC6EA]"
            />
            <span className="text-xs text-[#203D4E] font-medium">위 내용을 읽고 이해했어요.</span>
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#355364] transition cursor-pointer"
            >
              나중에
            </button>
            <button
              type="button"
              onClick={onAgree}
              disabled={!checked}
              className="flex-[2] py-2.5 rounded-xl bg-[#5BB7E6] hover:bg-[#48A8D8] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition cursor-pointer"
            >
              확인하고 시작하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
