import React from 'react';
import { CounselorId } from '../types';

interface CounselorAvatarProps {
  counselorId: CounselorId;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  isAnimated?: boolean;
  isIdle?: boolean;
  isThinking?: boolean;
}

export const CounselorAvatar: React.FC<CounselorAvatarProps> = ({
  counselorId,
  size = 'md',
  className = '',
  isAnimated = false,
  isIdle = false,
  isThinking = false,
}) => {
  const sizeMap = {
    sm: 'w-10 h-10',
    md: 'w-16 h-16',
    lg: 'w-24 h-24',
    xl: 'w-32 h-32',
  };

  const dimension = sizeMap[size] || sizeMap.md;

  // Determine animation classes
  let animClass = '';
  if (isThinking) {
    animClass = 'animate-thinking-counselor';
  } else if (isAnimated) {
    animClass = 'animate-bounce';
  } else if (isIdle) {
    animClass = 'animate-idle-bob';
  }

  const thinkingRing = isThinking ? (
    <span className="absolute -inset-1 rounded-full bg-[#7CC6EA]/40 animate-thinking-ring pointer-events-none" />
  ) : null;

  if (counselorId === 'cat') {
    // 냥이: 뾰족한 귀의 고양이, 파스텔 살구/크림 톤, 사랑스러운 방울 카라
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${dimension} ${className}`}>
        {thinkingRing}
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full drop-shadow-sm transition-transform duration-300 ${animClass}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Soft Circle */}
          <circle cx="60" cy="60" r="56" fill="#FFF4E6" stroke="#FFE0B2" strokeWidth="3" />

          {/* Pointed Cat Ears (뾰족한 귀) */}
          <path d="M30 46 L38 20 L52 38 Z" fill="#FFA726" stroke="#E65100" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M36 40 L41 26 L48 37 Z" fill="#FFCCBC" />
          <path d="M90 46 L82 20 L68 38 Z" fill="#FFA726" stroke="#E65100" strokeWidth="2.5" strokeLinejoin="round" />
          <path d="M84 40 L79 26 L72 37 Z" fill="#FFCCBC" />

          {/* Upper Body / Shoulders */}
          <path d="M26 112 C28 88 42 78 60 78 C78 78 92 88 94 112 Z" fill="#FFB74D" stroke="#E65100" strokeWidth="2.5" />
          {/* Cozy Mint Scarf */}
          <path d="M38 78 C48 85 72 85 82 78 C80 88 74 94 60 94 C46 94 40 88 38 78 Z" fill="#80CBC4" stroke="#00796B" strokeWidth="2" />
          <circle cx="60" cy="88" r="4.5" fill="#FFE082" stroke="#FFA000" strokeWidth="1.5" />

          {/* Head */}
          <ellipse cx="60" cy="56" rx="34" ry="28" fill="#FFB74D" stroke="#E65100" strokeWidth="2.5" />
          {/* Face Cream Area */}
          <path d="M36 56 C36 72 46 80 60 80 C74 80 84 72 84 56 C84 46 76 42 60 42 C44 42 36 46 36 56 Z" fill="#FFF9E6" />

          {/* Cheerful Eyes */}
          <circle cx="48" cy="56" r="3.5" fill="#3E2723" />
          <circle cx="72" cy="56" r="3.5" fill="#3E2723" />
          <circle cx="49" cy="54.5" r="1.2" fill="#FFFFFF" />
          <circle cx="73" cy="54.5" r="1.2" fill="#FFFFFF" />

          {/* Cute Nose & Mouth */}
          <path d="M57 62 L63 62 L60 65 Z" fill="#FF8A80" />
          <path d="M60 65 Q56 70 52 68" stroke="#3E2723" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M60 65 Q64 70 68 68" stroke="#3E2723" strokeWidth="2" strokeLinecap="round" fill="none" />

          {/* Whiskers */}
          <line x1="30" y1="58" x2="40" y2="60" stroke="#BCAAA4" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="28" y1="65" x2="39" y2="65" stroke="#BCAAA4" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="90" y1="58" x2="80" y2="60" stroke="#BCAAA4" strokeWidth="1.8" strokeLinecap="round" />
          <line x1="92" y1="65" x2="81" y2="65" stroke="#BCAAA4" strokeWidth="1.8" strokeLinecap="round" />

          {/* Rosy Cheeks */}
          <ellipse cx="40" cy="64" rx="4" ry="2.5" fill="#FFAB91" opacity="0.6" />
          <ellipse cx="80" cy="64" rx="4" ry="2.5" fill="#FFAB91" opacity="0.6" />
        </svg>
      </div>
    );
  }

  if (counselorId === 'dog') {
    // 멍이: 길게 늘어진 귀의 강아지, 포근한 밀크티/골든 톤, 다정한 스마일
    return (
      <div className={`relative flex items-center justify-center shrink-0 ${dimension} ${className}`}>
        {thinkingRing}
        <svg
          viewBox="0 0 120 120"
          className={`w-full h-full drop-shadow-sm transition-transform duration-300 ${animClass}`}
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Background Soft Circle */}
          <circle cx="60" cy="60" r="56" fill="#E8F4FD" stroke="#BDE0FE" strokeWidth="3" />

          {/* Upper Body / Shoulders */}
          <path d="M26 112 C28 88 42 78 60 78 C78 78 92 88 94 112 Z" fill="#D7A97B" stroke="#7A4E2D" strokeWidth="2.5" />
          {/* Blue Bandana with Heart */}
          <path d="M40 78 L60 98 L80 78 C70 82 50 82 40 78 Z" fill="#64B5F6" stroke="#1976D2" strokeWidth="2" strokeLinejoin="round" />
          <path d="M60 88 C60 88 56 84 56 82 C56 80 58 79 59 80 C60 81 60 81 60 81 C60 81 60 81 61 80 C62 79 64 80 64 82 C64 84 60 88 60 88 Z" fill="#FFFFFF" />

          {/* Head Base */}
          <ellipse cx="60" cy="56" rx="32" ry="27" fill="#F4CF9E" stroke="#7A4E2D" strokeWidth="2.5" />

          {/* Long Drooping Floppy Ears (길게 늘어진 귀) */}
          <path d="M30 40 C20 45 16 68 22 84 C25 90 32 88 34 80 C36 70 34 50 34 40 Z" fill="#B88252" stroke="#7A4E2D" strokeWidth="2.5" />
          <path d="M90 40 C100 45 104 68 98 84 C95 90 88 88 86 80 C84 70 86 50 86 40 Z" fill="#B88252" stroke="#7A4E2D" strokeWidth="2.5" />

          {/* Friendly Snout Area */}
          <ellipse cx="60" cy="64" rx="16" ry="12" fill="#FFFDF7" />

          {/* Warm Eyes */}
          <ellipse cx="48" cy="52" rx="3.5" ry="4" fill="#3E2723" />
          <ellipse cx="72" cy="52" rx="3.5" ry="4" fill="#3E2723" />
          <circle cx="49" cy="50" r="1.3" fill="#FFFFFF" />
          <circle cx="73" cy="50" r="1.3" fill="#FFFFFF" />
          {/* Kind Eyebrow Marks */}
          <ellipse cx="48" cy="44" rx="2.5" ry="1.5" fill="#B88252" />
          <ellipse cx="72" cy="44" rx="2.5" ry="1.5" fill="#B88252" />

          {/* Dog Nose & Smile */}
          <ellipse cx="60" cy="60" rx="4.5" ry="3.5" fill="#3E2723" />
          <path d="M60 63.5 L60 68" stroke="#3E2723" strokeWidth="2" strokeLinecap="round" />
          <path d="M60 68 Q55 74 50 71" stroke="#3E2723" strokeWidth="2" strokeLinecap="round" fill="none" />
          <path d="M60 68 Q65 74 70 71" stroke="#3E2723" strokeWidth="2" strokeLinecap="round" fill="none" />
          {/* Playful Tongue */}
          <path d="M58 70 C58 74 62 74 62 70 Z" fill="#FF8A80" />

          {/* Rosy Cheeks */}
          <ellipse cx="38" cy="62" rx="4" ry="2.5" fill="#FFAB91" opacity="0.6" />
          <ellipse cx="82" cy="62" rx="4" ry="2.5" fill="#FFAB91" opacity="0.6" />
        </svg>
      </div>
    );
  }

  // 몽이: 둥근 귀와 말린 꼬리의 원숭이, 지혜롭고 밝은 파스텔 톤
  return (
    <div className={`relative flex items-center justify-center shrink-0 ${dimension} ${className}`}>
      {thinkingRing}
      <svg
        viewBox="0 0 120 120"
        className={`w-full h-full drop-shadow-sm transition-transform duration-300 ${animClass}`}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Background Soft Circle */}
        <circle cx="60" cy="60" r="56" fill="#FFF8E7" stroke="#FFE7A3" strokeWidth="3" />

        {/* Curled Tail peeking behind (말린 꼬리) */}
        <path
          d="M84 94 C96 90 106 82 104 70 C102 60 92 62 90 68 C88 74 94 76 96 72"
          stroke="#935E38"
          strokeWidth="4"
          strokeLinecap="round"
          fill="none"
        />

        {/* Big Round Ears (둥근 귀) */}
        <circle cx="28" cy="52" r="14" fill="#A86C41" stroke="#5D3A1A" strokeWidth="2.5" />
        <circle cx="28" cy="52" r="8" fill="#FFD1A4" />
        <circle cx="92" cy="52" r="14" fill="#A86C41" stroke="#5D3A1A" strokeWidth="2.5" />
        <circle cx="92" cy="52" r="8" fill="#FFD1A4" />

        {/* Upper Body / Shoulders */}
        <path d="M26 112 C28 88 42 78 60 78 C78 78 92 88 94 112 Z" fill="#A86C41" stroke="#5D3A1A" strokeWidth="2.5" />
        {/* Yellow Vest */}
        <path d="M42 78 L60 96 L78 78 C70 84 50 84 42 78 Z" fill="#FFE082" stroke="#FFB300" strokeWidth="2" strokeLinejoin="round" />

        {/* Head */}
        <ellipse cx="60" cy="54" rx="30" ry="26" fill="#A86C41" stroke="#5D3A1A" strokeWidth="2.5" />

        {/* Heart/Double-lobed Face Mask */}
        <path
          d="M44 42 C38 42 36 48 38 56 C40 68 50 74 60 74 C70 74 80 68 82 56 C84 48 82 42 76 42 C70 42 64 46 60 50 C56 46 50 42 44 42 Z"
          fill="#FFD1A4"
        />

        {/* Smart Sparkling Eyes */}
        <ellipse cx="48" cy="53" rx="3.5" ry="4" fill="#3E2723" />
        <ellipse cx="72" cy="53" rx="3.5" ry="4" fill="#3E2723" />
        <circle cx="49" cy="51" r="1.3" fill="#FFFFFF" />
        <circle cx="73" cy="51" r="1.3" fill="#FFFFFF" />

        {/* Cute Little Monkey Nose */}
        <circle cx="58" cy="60" r="1.5" fill="#5D3A1A" />
        <circle cx="62" cy="60" r="1.5" fill="#5D3A1A" />

        {/* Gentle Smiling Mouth */}
        <path d="M52 64 Q60 70 68 64" stroke="#5D3A1A" strokeWidth="2" strokeLinecap="round" fill="none" />

        {/* Sprout on head for fresh ideas */}
        <path d="M60 28 Q60 20 66 18 Q68 24 60 26" fill="#81C784" />
        <path d="M60 28 Q60 22 55 20 Q54 26 60 26" fill="#A5D6A7" />

        {/* Rosy Cheeks */}
        <ellipse cx="40" cy="62" rx="3.5" ry="2.2" fill="#FFAB91" opacity="0.6" />
        <ellipse cx="80" cy="62" rx="3.5" ry="2.2" fill="#FFAB91" opacity="0.6" />
      </svg>
    </div>
  );
};
