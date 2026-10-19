import React, { useEffect, useState } from 'react';
import { X, Star, Check } from 'lucide-react';
import { CounselorId } from '../types';

/**
 * 앱 평가(별점) 팝업과 ★ 피드백 창
 * - mode 'rating'  : 대화가 어느 정도 쌓이면 자동으로 뜨는 평가 요청 (별점 필수 + 한 줄 의견 선택)
 * - mode 'feedback': 상단 ★ 버튼으로 여는 의견 창 (개선할 점·좋은 점 자유 작성, 별점 선택)
 * 저장은 서버(/api/feedback)에 익명으로 합니다. 이름·연락처 같은 개인정보는 쓰지 않도록 안내합니다.
 */
interface FeedbackModalProps {
  isOpen: boolean;
  mode: 'rating' | 'feedback';
  counselorId: CounselorId;
  onClose: () => void;
  /** 평가 팝업에서 "나중에 할게"를 눌렀을 때 */
  onLater?: () => void;
  /** 저장에 성공했을 때 */
  onSubmitted?: (kind: 'rating' | 'feedback') => void;
}

const MAX_TEXT = 500;

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, mode, counselorId, onClose, onLater, onSubmitted }) => {
  const [rating, setRating] = useState(0);
  const [text, setText] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'done' | 'error'>('idle');

  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setText('');
      setStatus('idle');
    }
  }, [isOpen, mode]);

  if (!isOpen) return null;

  const isRating = mode === 'rating';
  const canSubmit = status !== 'sending' && (isRating ? rating > 0 : text.trim().length > 0);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus('sending');
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ kind: mode, rating: rating || undefined, text: text.trim(), counselorId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setStatus('done');
      onSubmitted?.(mode);
    } catch {
      setStatus('error');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/50 backdrop-blur-xs">
      <div className="w-full max-w-sm rounded-3xl bg-white shadow-2xl overflow-hidden border border-[#D5ECF8] animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 bg-gradient-to-r from-[#FFF8E1] to-[#FFFDF5] border-b border-[#FFE7A3] flex items-start justify-between">
          <div>
            <h2 className="text-base font-bold text-[#203744]">
              {isRating ? '마음토닥, 써 보니 어땠어?' : '의견 보내기'}
            </h2>
            <p className="text-[11px] text-[#7B6018] mt-0.5">
              {isRating
                ? '별점을 남겨 주면 앱을 더 좋게 만드는 데 쓸게.'
                : '개선할 점이나 좋았던 점을 자유롭게 적어 줘.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-slate-500 hover:text-slate-800 flex items-center justify-center transition cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {status === 'done' ? (
          <div className="p-6 text-center space-y-2">
            <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <Check className="w-5 h-5" />
            </div>
            <p className="text-sm font-bold text-[#203744]">고마워! 잘 전달됐어.</p>
            <button
              type="button"
              onClick={onClose}
              className="mt-2 py-2 px-5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#355364] transition cursor-pointer"
            >
              닫기
            </button>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {/* 별점: 평가 팝업에서는 필수, 의견 창에서는 선택 */}
            <div>
              <p className="text-xs font-bold text-[#2A4758] mb-1.5">
                별점 {isRating ? '' : '(선택)'}
              </p>
              <div className="flex gap-1" role="radiogroup" aria-label="별점">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    type="button"
                    role="radio"
                    aria-checked={rating === n}
                    aria-label={`별 ${n}개`}
                    onClick={() => setRating(rating === n && !isRating ? 0 : n)}
                    className="p-1 cursor-pointer"
                  >
                    <Star
                      className={`w-7 h-7 transition ${n <= rating ? 'fill-[#FFC93C] text-[#F2B21B]' : 'text-slate-300'}`}
                    />
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-[#2A4758] block mb-1.5" htmlFor="feedback-text">
                {isRating ? '한 줄 의견 (선택)' : '개선할 점 · 좋은 점'}
              </label>
              <textarea
                id="feedback-text"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_TEXT))}
                rows={isRating ? 2 : 4}
                placeholder={isRating ? '좋았던 점이나 아쉬운 점이 있으면 적어 줘' : '예: 답이 너무 길어요 / 캐릭터가 귀여워요'}
                className="w-full rounded-xl border border-[#D5ECF8] bg-[#F8FCFE] px-3 py-2 text-sm text-[#2A4758] focus:outline-none focus:ring-2 focus:ring-[#7CC6EA] resize-none"
              />
              <div className="flex justify-between mt-1 text-[10px] text-[#7896A6]">
                <span>이름·학번·연락처 같은 개인정보는 쓰지 말아 줘.</span>
                <span>
                  {text.length}/{MAX_TEXT}
                </span>
              </div>
            </div>

            {status === 'error' && (
              <p className="text-[11px] text-rose-600">지금은 보내지 못했어. 잠시 뒤에 다시 시도해 줘.</p>
            )}

            <div className="flex gap-2 pt-1">
              {isRating && (
                <button
                  type="button"
                  onClick={onLater ?? onClose}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-[#355364] transition cursor-pointer"
                >
                  나중에 할게
                </button>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!canSubmit}
                className="flex-1 py-2.5 rounded-xl bg-[#5BB7E6] hover:bg-[#48A8D8] disabled:opacity-40 disabled:cursor-not-allowed text-xs font-bold text-white transition cursor-pointer"
              >
                {status === 'sending' ? '보내는 중…' : '보내기'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
