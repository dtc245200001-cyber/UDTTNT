import { useState, useRef, useEffect, useCallback } from 'react';

/**
 * Friendly Vietnamese error messages for Web Speech API
 */
export const VOICE_ERROR_MESSAGES = {
  'not-allowed': 'Bạn chưa cấp quyền sử dụng micro. Hãy cấp quyền trong cài đặt trình duyệt.',
  'permission-denied': 'Bạn chưa cấp quyền sử dụng micro. Hãy cấp quyền trong cài đặt trình duyệt.',
  'no-speech': 'Mình chưa nghe rõ. Bạn hãy thử nói lại nhé.',
  'network': 'Mất kết nối hoặc lỗi mạng khi nhận diện giọng nói.',
  'audio-capture': 'Không tìm thấy thiết bị thu âm hoặc micro không hoạt động.',
  'not-supported': 'Trình duyệt của bạn chưa hỗ trợ tìm kiếm bằng giọng nói. Bạn có thể nhập tên hiện vật bằng bàn phím.',
  'aborted': '', // User aborted / stopped early
  'default': 'Có lỗi xảy ra khi nhận diện giọng nói. Bạn hãy thử nói lại nhé.',
};

/**
 * Custom React hook for Voice Search using Web Speech API (vi-VN)
 * 100% browser-native (no paid services, no API keys)
 *
 * @param {Object} options
 * @param {Function} [options.onFinalTranscript] - Callback invoked when recognition produces final text
 * @param {Function} [options.onError] - Callback invoked when an error occurs
 * @param {number} [options.silenceTimeoutMs=8000] - Auto-stop duration when silence is detected
 */
export function useVoiceSearch({ onFinalTranscript, onError, silenceTimeoutMs = 8000 } = {}) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [error, setError] = useState(null);

  const recognitionRef = useRef(null);
  const silenceTimerRef = useRef(null);
  const isManuallyStoppedRef = useRef(false);
  const onFinalTranscriptRef = useRef(onFinalTranscript);
  const onErrorRef = useRef(onError);

  // Keep callback refs updated without re-attaching listeners
  useEffect(() => {
    onFinalTranscriptRef.current = onFinalTranscript;
    onErrorRef.current = onError;
  }, [onFinalTranscript, onError]);

  // Check browser support on mount
  useEffect(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    setSupported(Boolean(SpeechRecognition));
  }, []);

  const clearSilenceTimer = useCallback(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
  }, []);

  const resetSilenceTimer = useCallback(() => {
    clearSilenceTimer();
    silenceTimerRef.current = setTimeout(() => {
      // 8 seconds of silence reached -> stop recognition gracefully
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch {
          // ignore if already stopped
        }
      }
    }, silenceTimeoutMs);
  }, [clearSilenceTimer, silenceTimeoutMs]);

  const stop = useCallback(() => {
    isManuallyStoppedRef.current = true;
    clearSilenceTimer();
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {
        // Recognition might already be stopped
      }
    }
    setListening(false);
  }, [clearSilenceTimer]);

  const start = useCallback(() => {
    const SpeechRecognition =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (!SpeechRecognition) {
      const unsupportedErr = 'Tìm kiếm giọng nói hoạt động tốt nhất trên Chrome hoặc Edge.';
      setError(unsupportedErr);
      if (onErrorRef.current) onErrorRef.current(unsupportedErr);
      return;
    }

    // If currently running, stop first
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {
        // ignore
      }
      recognitionRef.current = null;
    }

    setError(null);
    setTranscript('');
    setInterimTranscript('');
    isManuallyStoppedRef.current = false;

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.interimResults = true;
      recognition.continuous = false;
      recognition.maxAlternatives = 3;

      recognition.onstart = () => {
        setListening(true);
        resetSilenceTimer();
      };

      recognition.onspeechstart = () => {
        resetSilenceTimer();
      };

      recognition.onresult = (event) => {
        resetSilenceTimer();
        let interim = '';
        let final = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          const text = result[0]?.transcript || '';
          if (result.isFinal) {
            final += text;
          } else {
            interim += text;
          }
        }

        if (interim) {
          setInterimTranscript(interim);
        }

        if (final) {
          const cleanFinal = final.trim();
          setTranscript(cleanFinal);
          setInterimTranscript('');
          if (onFinalTranscriptRef.current) {
            onFinalTranscriptRef.current(cleanFinal);
          }
        }
      };

      recognition.onerror = (event) => {
        clearSilenceTimer();
        const errType = event.error;
        if (errType === 'aborted' && isManuallyStoppedRef.current) {
          // Handled manually, not an error to show
          return;
        }

        const friendlyMsg =
          VOICE_ERROR_MESSAGES[errType] ||
          VOICE_ERROR_MESSAGES.default;

        setError(friendlyMsg);
        setListening(false);

        if (onErrorRef.current) {
          onErrorRef.current(friendlyMsg, errType);
        }
      };

      recognition.onend = () => {
        clearSilenceTimer();
        setListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      clearSilenceTimer();
      const friendlyMsg = VOICE_ERROR_MESSAGES.default;
      setError(friendlyMsg);
      setListening(false);
      if (onErrorRef.current) onErrorRef.current(friendlyMsg, err);
    }
  }, [clearSilenceTimer, resetSilenceTimer]);

  const reset = useCallback(() => {
    stop();
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, [stop]);

  // Cleanup on unmount to avoid memory leaks
  useEffect(() => {
    return () => {
      clearSilenceTimer();
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {
          // ignore
        }
        recognitionRef.current = null;
      }
    };
  }, [clearSilenceTimer]);

  return {
    supported,
    listening,
    transcript,
    interimTranscript,
    error,
    setError,
    start,
    stop,
    reset,
  };
}

export default useVoiceSearch;
