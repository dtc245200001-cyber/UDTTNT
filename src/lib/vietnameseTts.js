/**
 * High-reliability Vietnamese Speech Synthesis using browser-native window.speechSynthesis
 * Strictly 100% Client-Side, No API Keys, No CORS, Zero Network Dependencies.
 *
 * Implements the standard requirements from Prompt E:
 * "Dùng speechSynthesis, lang 'vi-VN', chọn voice tiếng Việt nếu có."
 *
 * Also includes all established Chromium & Windows fixes:
 * 1. Synchronous execution directly inside the click event.
 * 2. Utterance garbage-collection protection (holds global reference so Chrome doesn't kill audio mid-speech).
 * 3. Unlocks stuck Chromium speech queue via resume().
 * 4. Sanitizes text: converts bullets ('·'), dashes ('–'), quotes into natural pauses so Windows SAPI doesn't choke.
 * 5. Full volume (volume = 1.0) and natural rate (rate = 0.95).
 */

// Global reference array to prevent Chromium V8 garbage collecting utterance mid-speech
if (typeof window !== 'undefined') {
  window.__activeSpeechUtterances = window.__activeSpeechUtterances || [];
}

let cachedVoices = [];

function updateVoices() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return [];
  try {
    const list = window.speechSynthesis.getVoices();
    if (list && list.length > 0) {
      cachedVoices = list;
    }
    return cachedVoices;
  } catch {
    return [];
  }
}

// Pre-load voices on module load
if (typeof window !== 'undefined' && window.speechSynthesis) {
  updateVoices();
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = updateVoices;
  }
  window.speechSynthesis.addEventListener?.('voiceschanged', updateVoices);

  setTimeout(updateVoices, 100);
  setTimeout(updateVoices, 500);
  setTimeout(updateVoices, 1500);
}

/**
 * Clean text to ensure Windows SAPI and browser speech engine never choke on special characters
 */
export function sanitizeForSpeech(text) {
  if (!text) return '';
  return String(text)
    .replace(/[·•|/\\]/g, ', ')          // replace middle dots/bullets with commas for natural pause
    .replace(/[«»"'{}[\]()]/g, ' ')      // strip quotes and brackets
    .replace(/\s*–\s*|\s*—\s*/g, ' đến ') // replace dashes with "đến" or natural pause
    .replace(/[`~@#$%^&*+=<>]/g, ' ')    // remove symbol characters
    .replace(/\s+/g, ' ')                // collapse whitespace
    .trim();
}

/**
 * Find Vietnamese voice if available ("chọn voice tiếng Việt nếu có")
 */
export function getBestVietnameseVoice() {
  let voices = cachedVoices;
  if (!voices || voices.length === 0) {
    voices = updateVoices();
  }
  if (!voices || voices.length === 0) return null;

  // 1. Natural / Cloud Vietnamese voices (e.g. Google tiếng Việt, Hoài My, Nam Minh)
  const naturalVi = voices.find((v) => {
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    const name = (v.name || '').toLowerCase();
    const isVi = lang === 'vi-vn' || lang === 'vi' || lang.startsWith('vi-');
    return isVi && (name.includes('google') || name.includes('natural') || name.includes('online'));
  });
  if (naturalVi) return naturalVi;

  // 2. Exact Vietnamese locale
  const exactVi = voices.find((v) => {
    const lang = (v.lang || '').replace('_', '-').toLowerCase();
    return lang === 'vi-vn' || lang === 'vi' || lang.startsWith('vi-');
  });
  if (exactVi) return exactVi;

  // 3. Name-based matching
  const nameVi = voices.find((v) => {
    const name = (v.name || '').toLowerCase();
    return (
      name.includes('tiếng việt') ||
      name.includes('tieng viet') ||
      name.includes('vietnam') ||
      name.includes('vietnamese') ||
      name.includes('hoaimy') ||
      name.includes('namminh')
    );
  });
  if (nameVi) return nameVi;

  return null;
}

/**
 * Stop any ongoing speech synthesis immediately
 */
export function stopSpeakingVietnamese() {
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }
  }
  if (typeof window !== 'undefined' && window.__activeSpeechUtterances) {
    window.__activeSpeechUtterances = [];
  }
}

/**
 * Speak text using window.speechSynthesis, lang 'vi-VN', selecting Vietnamese voice if available
 *
 * @param {string} text - The Vietnamese text to read aloud
 * @param {Object} options
 * @param {Function} [options.onStart] - Callback when speech starts
 * @param {Function} [options.onEnd] - Callback when speech finishes or stops
 * @param {Function} [options.onError] - Callback on error
 */
export function speakVietnamese(text, { onStart, onEnd, onError } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    console.warn('[vietnameseTts] window.speechSynthesis is not supported in this browser.');
    if (onError) onError(new Error('Trình duyệt không hỗ trợ Web Speech Synthesis.'));
    if (onEnd) onEnd();
    return;
  }

  if (!text || !text.trim()) {
    if (onEnd) onEnd();
    return;
  }

  // 1. Cancel previous speech and unstuck Chromium queue
  try {
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
  } catch {
    // ignore
  }

  // 2. Sanitize text for Windows SAPI
  const cleanText = sanitizeForSpeech(text);

  // 3. Create SpeechSynthesisUtterance synchronously
  try {
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.volume = 1.0; // 100% volume
    utterance.rate = 0.95;  // Clear, natural speaking rate
    utterance.pitch = 1.0;

    // Chọn voice tiếng Việt nếu có
    const viVoice = getBestVietnameseVoice();
    if (viVoice) {
      utterance.voice = viVoice;
      utterance.lang = viVoice.lang || 'vi-VN';
    }

    // Handlers
    utterance.onstart = () => {
      if (onStart) onStart();
    };

    utterance.onend = () => {
      if (typeof window !== 'undefined' && window.__activeSpeechUtterances) {
        window.__activeSpeechUtterances = window.__activeSpeechUtterances.filter((u) => u !== utterance);
      }
      if (onEnd) onEnd();
    };

    utterance.onerror = (event) => {
      if (typeof window !== 'undefined' && window.__activeSpeechUtterances) {
        window.__activeSpeechUtterances = window.__activeSpeechUtterances.filter((u) => u !== utterance);
      }
      // Do not consider intentional cancel as error
      if (event.error !== 'canceled' && event.error !== 'interrupted') {
        console.warn('[vietnameseTts] Speech error:', event.error);
        if (onError) onError(event);
      }
      if (onEnd) onEnd();
    };

    // 4. Protect from V8 garbage collection
    if (typeof window !== 'undefined') {
      window.__activeSpeechUtterances = window.__activeSpeechUtterances || [];
      window.__activeSpeechUtterances.push(utterance);
    }

    // 5. Speak synchronously
    window.speechSynthesis.speak(utterance);

    // 6. Resume if Chrome started in paused state
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  } catch (err) {
    console.error('[vietnameseTts] speakVietnamese failed:', err);
    if (onError) onError(err);
    if (onEnd) onEnd();
  }
}

export default speakVietnamese;
