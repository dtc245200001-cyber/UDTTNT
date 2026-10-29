cimport React, { useState, useEffect, useRef } from 'react';
import {
  Volume2,
  VolumeX,
  Pause,
  Play,
  Square,
  Settings2,
  Check,
  AlertTriangle,
  Sparkles
} from 'lucide-react';
import {
  narrator,
  getAllVietnameseVoices,
  getBestVietnameseVoice,
  isVietnameseVoiceAvailable,
} from '@/lib/vietnameseTts';
import { toGuideNarration } from '@/lib/narrationScript';

export { narrator };

/**
 * Storage helpers for Auto-narrate & Settings
 */
export function getAutoNarrateSetting() {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem('museum_auto_narrate') === 'true';
  } catch {
    return false;
  }
}

export function setAutoNarrateSetting(value) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('museum_auto_narrate', String(value));
  } catch {
    // ignore
  }
}

/**
 * Custom React hook subscribing to narrator state
 */
export function useNarrator() {
  const [state, setState] = useState({
    status: narrator.status,
    currentId: narrator.currentId,
    noVietnameseVoice: !isVietnameseVoiceAvailable(),
    rate: narrator.rate,
    voiceURI: narrator.voiceURI,
  });

  useEffect(() => {
    const unsubscribe = narrator.subscribe((newState) => {
      setState({ ...newState });
    });
    return unsubscribe;
  }, []);

  return {
    ...state,
    speak: (text, options) => narrator.speak(text, options),
    enqueue: (chunk, options) => narrator.enqueue(chunk, options),
    pause: () => narrator.pause(),
    resume: () => narrator.resume(),
    stop: () => narrator.stop(),
    setRate: (r) => narrator.setRate(r),
    setVoiceURI: (v) => narrator.setVoiceURI(v),
    voices: getAllVietnameseVoices(),
  };
}

/**
 * Audio wave animation indicator with prefers-reduced-motion support
 */
export const AudioWaveIndicator = ({ className = 'h-3.5', isPlaying = true }) => (
  <span
    className={`inline-flex items-center gap-[2px] px-1 ${className}`}
    aria-hidden="true"
  >
    <span
      className={`w-[2.5px] h-3 bg-museum-gold rounded-full ${isPlaying ? 'animate-pulse motion-reduce:animate-none' : 'h-1.5 opacity-60'
        }`}
      style={{ animationDuration: '0.6s' }}
    />
    <span
      className={`w-[2.5px] h-4 bg-museum-brown rounded-full ${isPlaying ? 'animate-pulse motion-reduce:animate-none' : 'h-2 opacity-60'
        }`}
      style={{ animationDuration: '0.4s', animationDelay: '0.15s' }}
    />
    <span
      className={`w-[2.5px] h-2.5 bg-museum-gold rounded-full ${isPlaying ? 'animate-pulse motion-reduce:animate-none' : 'h-1.5 opacity-60'
        }`}
      style={{ animationDuration: '0.7s', animationDelay: '0.3s' }}
    />
    <span
      className={`w-[2.5px] h-3.5 bg-museum-brown rounded-full ${isPlaying ? 'animate-pulse motion-reduce:animate-none' : 'h-2 opacity-60'
        }`}
      style={{ animationDuration: '0.5s', animationDelay: '0.1s' }}
    />
  </span>
);

/**
 * Banner shown when system lacks Vietnamese speech voice
 */
export const NoVoiceBanner = ({ onClose }) => {
  return (
    <div
      role="status"
      className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 flex items-start gap-2.5 shadow-xs my-2 animate-fadeIn"
    >
      <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
      <div className="flex-1 leading-relaxed">
        <p className="font-bold text-emerald-950">Đang bật Giọng Thuyết Minh Trực Tuyến HD</p>
        <p className="text-[11px] text-emerald-800 mt-0.5">
          Hệ thống tự động kích hoạt máy chủ giọng đọc tiếng Việt chất lượng cao để đảm bảo âm thanh luôn rõ ràng, mượt mà trên thiết bị của bạn.
        </p>
      </div>
      {onClose && (
        <button
          onClick={onClose}
          aria-label="Đóng thông báo"
          className="text-emerald-600 hover:text-emerald-900 p-1 text-sm font-bold cursor-pointer"
        >
          ✕
        </button>
      )}
    </div>
  );
};

/**
 * Control button for each AI message bubble
 */
export const NarrationMessageButton = ({
  messageId,
  text,
  artifacts = [],
  className = '',
}) => {
  const { status, currentId, speak, pause, resume, stop } = useNarrator();
  const isThisMessage = currentId === messageId;
  const isSpeaking = isThisMessage && status === 'speaking';
  const isPaused = isThisMessage && status === 'paused';
  const isLoading = isThisMessage && status === 'loading';

  const handleToggleSpeak = () => {
    if (isSpeaking) {
      pause();
    } else if (isPaused) {
      resume();
    } else {
      const dominantArtifact = artifacts && artifacts.length > 0 ? artifacts[0] : null;
      const formattedText = toGuideNarration(text, {
        artifactName: dominantArtifact?.name,
        hasArtifacts: artifacts && artifacts.length > 0,
      });
      speak(formattedText, { id: messageId });
    }
  };

  const handleStop = (e) => {
    e.stopPropagation();
    stop();
  };

  return (
    <div className={`inline-flex items-center gap-1 ${className}`}>
      {/* Nút bấm chính: Nghe / Tạm dừng / Tiếp tục */}
      <button
        onClick={handleToggleSpeak}
        aria-label={
          isSpeaking
            ? 'Tạm dừng đọc câu trả lời'
            : isPaused
              ? 'Tiếp tục đọc câu trả lời'
              : 'Nghe thuyết minh câu trả lời'
        }
        aria-pressed={isSpeaking}
        className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-semibold transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs select-none ${isSpeaking
            ? 'bg-museum-gold text-white shadow-xs scale-102 ring-2 ring-museum-gold/30'
            : isPaused
              ? 'bg-amber-100 text-amber-900 border border-amber-300'
              : 'text-museum-brown hover:text-museum-gold hover:bg-museum-cream/60'
          }`}
      >
        {isLoading ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-museum-gold border-t-transparent rounded-full animate-spin" />
            <span>Đang chuẩn bị...</span>
          </>
        ) : isSpeaking ? (
          <>
            <Pause className="w-3.5 h-3.5" />
            <AudioWaveIndicator isPlaying={true} />
            <span className="hidden sm:inline">Tạm dừng</span>
          </>
        ) : isPaused ? (
          <>
            <Play className="w-3.5 h-3.5 fill-current" />
            <AudioWaveIndicator isPlaying={false} />
            <span className="hidden sm:inline">Tiếp tục</span>
          </>
        ) : (
          <>
            <Volume2 className="w-3.5 h-3.5 text-museum-gold" />
            <span>Nghe</span>
          </>
        )}
      </button>

      {/* Nút Dừng khi đang phát hoặc tạm dừng */}
      {isThisMessage && (isSpeaking || isPaused || isLoading) && (
        <button
          onClick={handleStop}
          aria-label="Dừng đọc câu trả lời"
          title="Dừng đọc"
          className="min-h-[38px] min-w-[38px] px-2 py-1 bg-gray-100 hover:bg-red-50 hover:text-red-600 text-gray-600 rounded-lg text-xs font-semibold transition-colors flex items-center justify-center cursor-pointer border border-gray-200"
        >
          <Square className="w-3 h-3 fill-current" />
        </button>
      )}
    </div>
  );
};

/**
 * Top Toolbar Auto-Narrate switch & Narration Settings Popover
 */
export const NarrationHeaderControls = ({
  autoNarrate,
  onToggleAutoNarrate,
  className = '',
}) => {
  const { rate, voiceURI, setRate, setVoiceURI, voices, speak, stop, status } = useNarrator();
  const [showSettings, setShowSettings] = useState(false);
  const popoverRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target)) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSettings]);

  const handleTestVoice = () => {
    stop();
    speak('Xin chào! Tôi là hướng dẫn viên ảo của Bảo tàng Lịch sử Quốc gia Việt Nam. Rất hân hạnh được đồng hành cùng bạn.', {
      id: 'test-voice',
    });
  };

  const speedOptions = [
    { label: '0.7x (Chậm)', value: 0.7 },
    { label: '0.85x', value: 0.85 },
    { label: '0.95x (Tự nhiên)', value: 0.95 },
    { label: '1.0x (Chuẩn)', value: 1.0 },
    { label: '1.15x (Nhanh)', value: 1.15 },
  ];

  return (
    <div className={`relative flex items-center gap-1.5 ${className}`}>
      {/* Nút Bật/Tắt Tự động đọc câu trả lời */}
      <button
        type="button"
        onClick={() => onToggleAutoNarrate(!autoNarrate)}
        aria-pressed={autoNarrate}
        aria-label={autoNarrate ? 'Tắt tự động đọc câu trả lời' : 'Bật tự động đọc câu trả lời'}
        className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs border ${autoNarrate
            ? 'bg-museum-gold text-white border-museum-gold shadow-xs'
            : 'bg-white/80 text-gray-700 border-gray-200 hover:bg-gray-100 hover:text-museum-brown'
          }`}
        title={autoNarrate ? 'Đang bật tự động đọc câu trả lời' : 'Tự động đọc to khi AI trả lời'}
      >
        {autoNarrate ? (
          <>
            <Volume2 className="w-3.5 h-3.5 animate-pulse" />
            <span className="hidden sm:inline">Tự động đọc</span>
          </>
        ) : (
          <>
            <VolumeX className="w-3.5 h-3.5 text-gray-400" />
            <span className="hidden sm:inline">Tự động đọc: Tắt</span>
          </>
        )}
      </button>

      {/* Nút mở hộp cài đặt giọng đọc */}
      <div className="relative" ref={popoverRef}>
        <button
          type="button"
          onClick={() => setShowSettings((prev) => !prev)}
          aria-expanded={showSettings}
          aria-label="Cài đặt giọng thuyết minh AI"
          className="min-h-[38px] min-w-[38px] p-2 bg-white/80 hover:bg-gray-100 text-gray-700 hover:text-museum-brown border border-gray-200 rounded-xl transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
          title="Tùy chỉnh tốc độ và giọng đọc"
        >
          <Settings2 className="w-4 h-4 text-museum-gold" />
        </button>

        {/* Popover Settings */}
        {showSettings && (
          <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-museum-gold/30 p-4 z-50 text-museum-brown space-y-3.5 animate-fadeIn font-sans">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-1.5 font-bold text-xs uppercase tracking-wider text-museum-brown">
                <Sparkles className="w-3.5 h-3.5 text-museum-gold" />
                <span>Cài Đặt Giọng Thuyết Minh</span>
              </div>
              <button
                type="button"
                onClick={() => setShowSettings(false)}
                className="text-gray-400 hover:text-gray-700 p-1 text-xs"
                aria-label="Đóng cài đặt"
              >
                ✕
              </button>
            </div>

            {/* Chọn tốc độ đọc */}
            <div>
              <label className="block text-[11px] font-bold text-gray-600 mb-1.5">
                Tốc độ đọc giọng nói:
              </label>
              <div className="grid grid-cols-3 gap-1">
                {speedOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRate(opt.value)}
                    className={`py-1.5 px-1 text-[11px] font-semibold rounded-lg border transition-all cursor-pointer ${Math.abs(rate - opt.value) < 0.04
                        ? 'bg-museum-brown text-white border-museum-brown shadow-xs'
                        : 'bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100'
                      }`}
                  >
                    {opt.label.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            {/* Chọn giọng tiếng Việt nếu máy có nhiều giọng */}
            {voices && voices.length > 0 && (
              <div>
                <label className="block text-[11px] font-bold text-gray-600 mb-1">
                  Chọn giọng đọc ({voices.length} giọng sẵn có):
                </label>
                <select
                  value={voiceURI || ''}
                  onChange={(e) => setVoiceURI(e.target.value)}
                  className="w-full text-xs p-2 rounded-xl border border-gray-200 bg-white text-gray-800 focus:outline-hidden focus:ring-1 focus:ring-museum-gold cursor-pointer"
                >
                  <option value="">Giọng tốt nhất (Mặc định)</option>
                  {voices.map((v) => (
                    <option key={v.voiceURI} value={v.voiceURI}>
                      {v.name} {v.lang ? `(${v.lang})` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Nút nghe thử */}
            <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
              <button
                type="button"
                onClick={handleTestVoice}
                className="w-full py-2 bg-museum-cream hover:bg-museum-gold hover:text-white text-museum-brown font-bold text-xs rounded-xl border border-museum-gold/30 transition-all cursor-pointer flex items-center justify-center gap-1.5 shadow-2xs"
              >
                <Volume2 className="w-3.5 h-3.5" />
                <span>Nghe thử giọng mẫu</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
