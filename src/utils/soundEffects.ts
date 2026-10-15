/**
 * [부드러운 음향 효과 (Web Audio API 기반)]
 * 
 * * 특징:
 *   - 외부 mp3 파일 없이 브라우저 내장 Web Audio API로 가볍고 포근한 사운드 합성
 *   - 교실, 독서실, 대중교통 등 조용한 환경을 고려해 음소거(Mute) 상태 영구 보관
 *   - 볼륨은 귀에 거슬리지 않는 아주 부드러운 0.08 레벨
 */

const STORAGE_SOUND_KEY = 'seocho_sound_effects_enabled';

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!audioCtx) {
    const AudioContextClass =
      window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

export function isSoundEnabled(): boolean {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(STORAGE_SOUND_KEY);
  return saved === null ? true : saved === 'true';
}

export function setSoundEnabled(enabled: boolean): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_SOUND_KEY, String(enabled));
}

/**
 * 부드러운 마림바/물방울 느낌의 '블립' 알림음 (새 상담사 메시지 도착 시)
 */
export function playMessageBlipSound(): void {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;

    // Dual-tone soft chime (Harmonic warm chord)
    const osc1 = ctx.createOscillator();
    const osc2 = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc1.type = 'sine';
    osc2.type = 'sine';

    // Soft frequency rise from 659Hz (E5) to 880Hz (A5)
    osc1.frequency.setValueAtTime(659, now);
    osc1.frequency.exponentialRampToValueAtTime(880, now + 0.12);

    osc2.frequency.setValueAtTime(1318, now);
    osc2.frequency.exponentialRampToValueAtTime(1760, now + 0.12);

    // Warm, gentle decay envelope
    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.07, now + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);

    osc1.connect(gainNode);
    osc2.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.25);
    osc2.stop(now + 0.25);
  } catch (e) {
    // Gracefully ignore audio autoplay restrictions
  }
}

/**
 * 전송 시 아주 부드러운 터치 클릭음
 */
export function playSendSoftSound(): void {
  if (!isSoundEnabled()) return;

  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(520, now);
    osc.frequency.exponentialRampToValueAtTime(350, now + 0.08);

    gainNode.gain.setValueAtTime(0.001, now);
    gainNode.gain.linearRampToValueAtTime(0.04, now + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 0.09);

    osc.connect(gainNode);
    gainNode.connect(ctx.destination);

    osc.start(now);
    osc.stop(now + 0.1);
  } catch (e) {
    // Ignore audio errors
  }
}
