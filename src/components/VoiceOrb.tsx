import React from 'react';
import { AgentState } from '../types/grok';
import { Mic, MicOff, Volume2, Sparkles, Loader2 } from 'lucide-react';

interface VoiceOrbProps {
  state: AgentState;
  audioEnergy: number; // 0 to 1
  isMuted?: boolean;
  onToggleMic?: () => void;
  disabled?: boolean;
}

export const VoiceOrb: React.FC<VoiceOrbProps> = ({
  state,
  audioEnergy,
  isMuted = false,
  onToggleMic,
  disabled = false,
}) => {
  // Scale based on audio energy
  const scale = 1 + audioEnergy * 0.35;
  const outerScale = 1 + audioEnergy * 0.7;

  // Colors based on state
  let glowColor = 'rgba(56, 189, 248, 0.4)'; // cyan
  let coreGradient = 'from-cyan-500 via-blue-600 to-indigo-700';
  let statusText = 'آماده گفتگو';
  let statusSubtext = 'روی میکروفون کلیک کنید یا شروع به صحبت کنید';

  if (state === 'listening') {
    glowColor = 'rgba(16, 185, 129, 0.6)'; // emerald
    coreGradient = 'from-emerald-400 via-teal-500 to-cyan-600';
    statusText = 'در حال گوش دادن...';
    statusSubtext = 'صدای شما به صورت مستقیم به ایجنت ارسال می‌شود';
  } else if (state === 'thinking') {
    glowColor = 'rgba(234, 179, 8, 0.6)'; // amber
    coreGradient = 'from-amber-400 via-orange-500 to-indigo-600';
    statusText = 'در حال تفکر و پردازش...';
    statusSubtext = 'منتظر پاسخ از سرور Grok Realtime';
  } else if (state === 'speaking') {
    glowColor = 'rgba(168, 85, 247, 0.7)'; // purple/fuchsia
    coreGradient = 'from-fuchsia-500 via-purple-600 to-cyan-500';
    statusText = 'ایجنت در حال پاسخ صوتی...';
    statusSubtext = 'پخش بلادرنگ داده‌های PCM با تاخیر کم';
  }

  return (
    <div className="flex flex-col items-center justify-center p-6 select-none">
      {/* Outer Glow & Particle Ripple Rings */}
      <div className="relative flex items-center justify-center w-64 h-64 md:w-80 md:h-80">
        {/* Expanding Ring 1 */}
        <div
          className="absolute inset-0 rounded-full border border-cyan-500/20 transition-all duration-100 ease-out"
          style={{
            transform: `scale(${outerScale * 1.05})`,
            opacity: state === 'idle' ? 0.2 : 0.4 + audioEnergy * 0.5,
            borderColor: state === 'speaking' ? '#a855f7' : state === 'listening' ? '#10b981' : '#38bdf8',
          }}
        />

        {/* Expanding Ring 2 */}
        <div
          className="absolute inset-4 rounded-full border border-indigo-500/30 transition-all duration-150 ease-out"
          style={{
            transform: `scale(${outerScale * 0.95})`,
            opacity: state === 'idle' ? 0.3 : 0.6 + audioEnergy * 0.4,
          }}
        />

        {/* Rotating dash orbital ring for 'thinking' */}
        {state === 'thinking' && (
          <div className="absolute inset-2 rounded-full border-2 border-dashed border-amber-400/70 animate-spin duration-1000" />
        )}

        {/* Ambient Back Glow */}
        <div
          className="absolute inset-10 rounded-full blur-2xl transition-all duration-200"
          style={{
            backgroundColor: glowColor,
            transform: `scale(${scale * 1.1})`,
          }}
        />

        {/* The Core Orb Button */}
        <button
          onClick={onToggleMic}
          disabled={disabled}
          type="button"
          aria-label={statusText}
          className={`relative z-10 w-44 h-44 md:w-52 md:h-52 rounded-full bg-gradient-to-tr ${coreGradient} 
            shadow-[0_0_50px_rgba(0,0,0,0.5)] flex flex-col items-center justify-center text-white 
            cursor-pointer focus:outline-none focus:ring-4 focus:ring-cyan-500/50 transition-transform 
            duration-150 active:scale-95 group overflow-hidden ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
          style={{
            transform: `scale(${scale})`,
          }}
        >
          {/* Surface Gloss & Reflections */}
          <div className="absolute -top-12 -left-12 w-36 h-36 bg-white/25 rounded-full blur-xl pointer-events-none" />
          <div className="absolute -bottom-8 -right-8 w-28 h-28 bg-indigo-950/40 rounded-full blur-md pointer-events-none" />

          {/* Dynamic inner sound ripples */}
          <div className="flex items-center justify-center z-10 flex-col gap-2">
            {state === 'idle' && (
              <Mic className="w-12 h-12 text-white/90 drop-shadow group-hover:scale-110 transition-transform" />
            )}
            {state === 'listening' && (
              <Mic className="w-14 h-14 text-white drop-shadow animate-pulse" />
            )}
            {state === 'thinking' && (
              <Loader2 className="w-12 h-12 text-white animate-spin drop-shadow" />
            )}
            {state === 'speaking' && (
              <Volume2 className="w-14 h-14 text-white drop-shadow animate-bounce" />
            )}

            <span className="text-xs font-semibold tracking-wide uppercase px-2.5 py-0.5 rounded-full bg-black/25 backdrop-blur-sm border border-white/10">
              {state === 'idle' ? 'شروع گفتگو' : state === 'listening' ? 'میکروفون فعال' : state === 'thinking' ? 'پردازش' : 'ایجنت در حال صحبت'}
            </span>
          </div>
        </button>
      </div>

      {/* Status indicator badge & Persian text */}
      <div className="mt-4 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-900/80 border border-slate-800 text-sm font-medium mb-1">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              state === 'listening'
                ? 'bg-emerald-400 animate-ping'
                : state === 'thinking'
                ? 'bg-amber-400 animate-pulse'
                : state === 'speaking'
                ? 'bg-fuchsia-400 animate-pulse'
                : 'bg-slate-500'
            }`}
          />
          <span className="text-slate-200">{statusText}</span>
        </div>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">{statusSubtext}</p>
      </div>
    </div>
  );
};
