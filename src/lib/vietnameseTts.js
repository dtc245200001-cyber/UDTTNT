/**
 * High-reliability Vietnamese Speech Synthesis using browser-native window.speechSynthesis
 * Strictly 100% Client-Side, No API Keys, No CORS, Zero Network Dependencies.
 *
 * Implements the standard requirements:
 * "Dùng speechSynthesis, lang 'vi-VN', chọn voice tiếng Việt nếu có."
 *
 * Key Stability Fixes:
 * 1. Synchronous execution directly inside click events (retains browser user gesture).
 * 2. Utterance garbage-collection protection (holds global reference in window.__activeSpeechUtterances).
 * 3. Unlocks stuck Chromium speech queue via resume() & cancel().
 * 4. Sanitizes text: strips markdown, emojis, converts Roman numerals to numbers, expands units & dates.
 * 5. Smart chunking (< 160 chars) to bypass Chrome 15s utterance cutoff.
 * 6. Sequential queue execution for both whole texts and live SSE streaming.
 * 7. Fallback voice selection: if no vi-VN voice exists on OS, gracefully uses system synthesizer without crashing.
 */

if (typeof window !== 'undefined') {
  window.__activeSpeechUtterances = window.__activeSpeechUtterances || [];
}

let cachedVoices = [];

export function updateVoices() {
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

  setTimeout(updateVoices, 50);
  setTimeout(updateVoices, 300);
  setTimeout(updateVoices, 1000);
}

/**
 * Roman numerals dictionary for Vietnamese century conversion (thế kỷ XV -> thế kỷ 15)
 */
const ROMAN_NUMERALS = {
  XXI: 21, XX: 20, XIX: 19, XVIII: 18, XVII: 17, XVI: 16,
  XV: 15, XIV: 14, XIII: 13, XII: 12, XI: 11, X: 10,
  IX: 9, VIII: 8, VII: 7, VI: 6, V: 5, IV: 4, III: 3, II: 2, I: 1
};

/**
 * Prepare and normalize text/markdown for Vietnamese text-to-speech.
 */
export function prepareTextForSpeech(text) {
  if (!text) return '';
  let s = String(text);

  // 1. Loại bỏ phần Nguồn / Tài liệu tham khảo ở cuối câu nếu có
  s = s.replace(/(\n|^)\s*(\*{0,2})Nguồn(\s+tham\s+khảo|\s+trích\s+dẫn)?\s*:?[\s\S]*$/i, '');

  // 2. Bỏ code blocks và inline code
  s = s.replace(/```[\s\S]*?```/g, ' ');
  s = s.replace(/`([^`]+)`/g, '$1');

  // 3. Bỏ Markdown links: [Tiêu đề](http://...) -> Tiêu đề
  s = s.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // 4. Bỏ Markdown headers, bold, italics, strikethrough, blockquotes
  s = s.replace(/^#{1,6}\s+/gm, '');
  s = s.replace(/[*_]{1,3}([^*_]+)[*_]{1,3}/g, '$1');
  s = s.replace(/~~([^~]+)~~/g, '$1');
  s = s.replace(/^>\s*/gm, '');

  // 5. Danh sách: gạch đầu dòng và số thứ tự chuyển thành nhịp nghỉ
  s = s.replace(/^[\s*+-]*[•*+-]\s+/gm, ', ');
  s = s.replace(/^\s*\d+\.\s+/gm, ', ');

  // 6. Loại bỏ Emojis và ký tự biểu tượng đồ họa
  s = s.replace(/[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{1FA00}-\u{1FAFF}\u{FE0F}]/gu, '');

  // 7. Ngày tháng dạng DD/MM/YYYY hoặc D/M/YYYY
  s = s.replace(/\b(\d{1,2})\/(\d{1,2})\/(\d{4})\b/g, 'ngày $1 tháng $2 năm $3');

  // 8. Khoảng năm lịch sử: "1010 – 1225" hoặc "năm 1945 – 1954" -> "từ năm ... đến năm ..."
  s = s.replace(/(?:từ\s+năm\s+|năm\s+)?\b(\d{3,4})\s*[-–—]\s*(\d{3,4})\b/gi, 'từ năm $1 đến năm $2');

  // 9. Dấu gạch ngang giữa các từ/địa danh ("Đông Sơn – Thanh Hóa") -> chuyển thành dấu phẩy (nhịp nghỉ)
  s = s.replace(/\s*[-–—]\s*/g, ', ');

  // 10. Thế kỷ bằng số La Mã: thế kỷ XV -> thế kỷ 15, TK XIX -> thế kỷ 19
  s = s.replace(/\b(thế\s+kỷ|tk|thế\s+kỉ)\s+([IVXLCDM]+)\b/gi, (match, prefix, roman) => {
    const num = ROMAN_NUMERALS[roman.toUpperCase()];
    return num ? `thế kỷ ${num}` : match;
  });

  // 11. Các từ viết tắt lịch sử
  s = s.replace(/\b(TCN|T\.C\.N|tr\.\s*CN)\b/gi, 'trước Công nguyên');
  s = s.replace(/\b(SCN|S\.C\.N|sau\s+CN)\b/gi, 'sau Công nguyên');

  // 12. Đơn vị đo lường
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*(cm²|cm2)\b/gi, '$1 xen-ti-mét vuông');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*(m²|m2)\b/gi, '$1 mét vuông');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*cm\b/gi, '$1 xen-ti-mét');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*mm\b/gi, '$1 mi-li-mét');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*km\b/gi, '$1 ki-lô-mét');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*m\b/gi, '$1 mét');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*kg\b/gi, '$1 ki-lô-gam');
  s = s.replace(/(\d+(?:[.,]\d+)?)\s*g\b/gi, '$1 gam');

  // 13. Dấu ngoặc đơn và dấu trích dẫn -> nhịp nghỉ tự nhiên
  s = s.replace(/[()]/g, ', ');
  s = s.replace(/["“”«»']/g, '');

  // 14. Loại bỏ các ký tự đặc biệt thừa không phát âm
  s = s.replace(/[·•|\\/`~@#$%^&*+=<>]/g, ' ');

  // 15. Dọn dẹp dấu câu lặp và khoảng trắng
  s = s.replace(/[,;]\s*[,;]+/g, ',');
  s = s.replace(/\.\s*\.+/g, '.');
  s = s.replace(/\s*,\s*/g, ', ');
  s = s.replace(/\s+/g, ' ').trim();

  return s;
}

export function sanitizeForSpeech(text) {
  return prepareTextForSpeech(text);
}

/**
 * Split text into speech chunks <= maxChars (~160 chars) to prevent Chrome's ~15s timeout
 */
export function splitIntoSpeechChunks(text, maxChars = 160) {
  if (!text) return [];
  const clean = text.trim();
  if (clean.length <= maxChars) return [clean];

  const sentenceDelims = /([^.!?;\n]+[.!?;\n]+)/g;
  const rawParts = clean.match(sentenceDelims) || [clean];

  const matchedLen = rawParts.join('').length;
  if (matchedLen < clean.length) {
    const remaining = clean.slice(matchedLen).trim();
    if (remaining) rawParts.push(remaining);
  }

  const chunks = [];
  let currentChunk = '';

  for (const part of rawParts) {
    const trimmed = part.trim();
    if (!trimmed) continue;

    if (trimmed.length > maxChars) {
      if (currentChunk) {
        chunks.push(currentChunk.trim());
        currentChunk = '';
      }
      const subParts = splitLongClause(trimmed, maxChars);
      chunks.push(...subParts);
      continue;
    }

    if (currentChunk && (currentChunk.length + trimmed.length + 1 > maxChars)) {
      chunks.push(currentChunk.trim());
      currentChunk = trimmed;
    } else {
      currentChunk = currentChunk ? `${currentChunk} ${trimmed}` : trimmed;
    }
  }

  if (currentChunk.trim()) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

function splitLongClause(text, maxChars) {
  const parts = [];
  if (text.includes(',')) {
    const commaParts = text.split(',');
    let cur = '';
    for (let i = 0; i < commaParts.length; i++) {
      const item = commaParts[i].trim() + (i < commaParts.length - 1 ? ',' : '');
      if (item.length > maxChars) {
        if (cur) { parts.push(cur.trim()); cur = ''; }
        parts.push(...splitByWords(item, maxChars));
      } else if (cur && (cur.length + item.length + 1 > maxChars)) {
        parts.push(cur.trim());
        cur = item;
      } else {
        cur = cur ? `${cur} ${item}` : item;
      }
    }
    if (cur.trim()) parts.push(cur.trim());
    return parts;
  }
  return splitByWords(text, maxChars);
}

function splitByWords(text, maxChars) {
  const words = text.split(' ');
  const parts = [];
  let cur = '';
  for (const w of words) {
    if (!w) continue;
    if (cur && (cur.length + w.length + 1 > maxChars)) {
      parts.push(cur.trim());
      cur = w;
    } else {
      cur = cur ? `${cur} ${w}` : w;
    }
  }
  if (cur.trim()) parts.push(cur.trim());
  return parts;
}

export function isViVoice(v) {
  return !!v && String(v.lang || '').replace('_', '-').toLowerCase().startsWith('vi');
}

/**
 * Find Vietnamese voice if available ("chọn voice tiếng Việt nếu có")
 * Đồng bộ quy tắc nhận diện với forceVietnameseSpeech.js
 */
export function getBestVietnameseVoice() {
  let voices = cachedVoices;
  if (!voices || voices.length === 0) {
    voices = updateVoices();
  }
  const vi = (voices || []).filter(isViVoice);
  if (!vi.length) return null;

  const score = (v) => {
    const n = (v.name || '').toLowerCase();
    let s = 0;
    if (/online|natural/.test(n)) s += 3;
    if (/google|hoaimy|namminh|hoài my|nam minh/.test(n)) s += 2;
    return s;
  };

  return [...vi].sort((a, b) => score(b) - score(a))[0] || null;
}

export function getAllVietnameseVoices() {
  let voices = cachedVoices;
  if (!voices || voices.length === 0) {
    voices = updateVoices();
  }
  return (voices || []).filter(isViVoice);
}

export function isVietnameseVoiceAvailable() {
  return getBestVietnameseVoice() !== null;
}

/**
 * Vietnamese Narrator managing sequential queue and Chrome speech engine
 */
export class VietnameseNarrator {
  constructor() {
    this.status = 'idle'; // 'idle' | 'loading' | 'speaking' | 'paused'
    this.currentId = null;
    this.queue = [];
    this.currentUtterance = null;
    this.listeners = new Set();
    this.keepAliveInterval = null;
    this.rate = 0.95;
    this.voiceURI = null;
    this.onEndCallback = null;
    this.onErrorCallback = null;

    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('museum_narrator_settings');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.rate) this.rate = parsed.rate;
          if (parsed.voiceURI) this.voiceURI = parsed.voiceURI;
        }
      } catch {
        // ignore
      }
    }
  }

  notify() {
    const state = {
      status: this.status,
      currentId: this.currentId,
      hasViVoice: isVietnameseVoiceAvailable(),
      noVietnameseVoice: !isVietnameseVoiceAvailable(),
      rate: this.rate,
      voiceURI: this.voiceURI,
    };
    for (const listener of this.listeners) {
      try {
        listener(state);
      } catch (err) {
        console.error('[VietnameseNarrator] listener error:', err);
      }
    }
  }

  subscribe(listener) {
    this.listeners.add(listener);
    listener({
      status: this.status,
      currentId: this.currentId,
      hasViVoice: isVietnameseVoiceAvailable(),
      noVietnameseVoice: !isVietnameseVoiceAvailable(),
      rate: this.rate,
      voiceURI: this.voiceURI,
    });
    return () => {
      this.listeners.delete(listener);
    };
  }

  setRate(newRate) {
    this.rate = Math.max(0.5, Math.min(2.0, Number(newRate) || 0.95));
    this.saveSettings();
    this.notify();
  }

  setVoiceURI(uri) {
    this.voiceURI = uri;
    this.saveSettings();
    this.notify();
  }

  saveSettings() {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem('museum_narrator_settings', JSON.stringify({
        rate: this.rate,
        voiceURI: this.voiceURI,
      }));
    } catch {
      // ignore
    }
  }

  stop() {
    this.clearKeepAlive();
    this.queue = [];
    this.currentId = null;
    this.status = 'idle';
    this.currentUtterance = null;

    if (typeof window !== 'undefined' && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {
        // ignore
      }
    }
    if (typeof window !== 'undefined' && window.__activeSpeechUtterances) {
      window.__activeSpeechUtterances = [];
    }

    if (this.onEndCallback) {
      const cb = this.onEndCallback;
      this.onEndCallback = null;
      cb();
    }
    this.notify();
  }

  pause() {
    if (typeof window !== 'undefined' && window.speechSynthesis && this.status === 'speaking') {
      try {
        window.speechSynthesis.pause();
        this.status = 'paused';
        this.clearKeepAlive();
        this.notify();
      } catch {
        // ignore
      }
    }
  }

  resume() {
    if (typeof window !== 'undefined' && window.speechSynthesis && this.status === 'paused') {
      try {
        window.speechSynthesis.resume();
        this.status = 'speaking';
        this.startKeepAlive();
        this.notify();
      } catch {
        // ignore
      }
    }
  }

  /**
   * Speak an entire text synchronously with single-playback exclusivity
   */
  speak(text, { id, onStart, onEnd, onError } = {}) {
    if (typeof window === 'undefined' || !window.speechSynthesis) {
      console.warn('[vietnameseTts] Speech synthesis is not supported in this browser.');
      if (onError) onError(new Error('Trình duyệt không hỗ trợ Web Speech Synthesis.'));
      if (onEnd) onEnd();
      return;
    }

    // 1. Dừng ngay lượt đọc trước
    this.clearKeepAlive();
    this.queue = [];
    try {
      window.speechSynthesis.cancel();
      window.speechSynthesis.resume();
    } catch {
      // ignore
    }

    if (!text || !text.trim()) {
      this.status = 'idle';
      this.currentId = null;
      this.notify();
      if (onEnd) onEnd();
      return;
    }

    this.currentId = id || `speech-${Date.now()}`;
    this.status = 'speaking';
    this.onEndCallback = onEnd || null;
    this.onErrorCallback = onError || null;
    this.notify();

    // 2. Làm sạch & chuẩn hóa text tiếng Việt
    const prepared = prepareTextForSpeech(text);
    const chunks = splitIntoSpeechChunks(prepared, 160);

    if (chunks.length === 0) {
      this.status = 'idle';
      this.currentId = null;
      this.notify();
      if (onEnd) onEnd();
      return;
    }

    this.queue = [...chunks];
    this.playNextChunk(onStart);
  }

  /**
   * Enqueue a chunk for streaming AI responses (< 2s latency)
   */
  enqueue(chunkText, { id, onStart, onEnd, onError } = {}) {
    if (!chunkText || !chunkText.trim()) return;

    if (this.currentId !== id) {
      this.stop();
      this.currentId = id || `stream-${Date.now()}`;
      this.onEndCallback = onEnd || null;
      this.onErrorCallback = onError || null;
    }

    const prepared = prepareTextForSpeech(chunkText);
    const chunks = splitIntoSpeechChunks(prepared, 160);
    if (chunks.length === 0) return;

    this.queue.push(...chunks);

    if (this.status === 'idle') {
      this.status = 'speaking';
      this.notify();
      this.playNextChunk(onStart);
    }
  }

  playNextChunk(onStart) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;

    if (this.queue.length === 0) {
      this.clearKeepAlive();
      this.status = 'idle';
      this.currentId = null;
      this.currentUtterance = null;
      this.notify();
      if (this.onEndCallback) {
        const cb = this.onEndCallback;
        this.onEndCallback = null;
        cb();
      }
      return;
    }

    const chunkText = this.queue.shift();

    try {
      const utterance = new SpeechSynthesisUtterance(chunkText);
      utterance.lang = 'vi-VN';
      utterance.volume = 1.0;
      utterance.rate = this.rate || 0.95;
      utterance.pitch = 1.0;

      // Chỉ gán utterance.voice khi người dùng chủ động chọn trong cài đặt (this.voiceURI)
      // và giọng đó phải là giọng tiếng Việt hợp lệ (lang bắt đầu bằng 'vi').
      // Mặc định luôn để forceVietnameseSpeech.js tự quyết định (voice máy hoặc server /api/tts).
      if (this.voiceURI) {
        const allVoices = window.speechSynthesis.getVoices();
        if (allVoices && allVoices.length > 0) {
          cachedVoices = allVoices;
        }
        const customVoice = cachedVoices.find((v) => v.voiceURI === this.voiceURI);
        if (customVoice && isViVoice(customVoice)) {
          utterance.voice = customVoice;
          utterance.lang = customVoice.lang || 'vi-VN';
        }
      }

      utterance.onstart = () => {
        this.status = 'speaking';
        this.startKeepAlive();
        this.notify();
        if (onStart) {
          onStart();
          onStart = null;
        }
      };

      utterance.onend = () => {
        if (typeof window !== 'undefined' && window.__activeSpeechUtterances) {
          window.__activeSpeechUtterances = window.__activeSpeechUtterances.filter((u) => u !== utterance);
        }
        this.playNextChunk();
      };

      utterance.onerror = (event) => {
        if (typeof window !== 'undefined' && window.__activeSpeechUtterances) {
          window.__activeSpeechUtterances = window.__activeSpeechUtterances.filter((u) => u !== utterance);
        }

        if (event.error !== 'canceled' && event.error !== 'interrupted') {
          console.warn('[VietnameseNarrator] Speech error:', event.error);
          if (this.onErrorCallback) this.onErrorCallback(event);
          // Chỉ thông báo lỗi native thực sự của trình duyệt với nội dung đúng loại lỗi
          // (forceVietnameseSpeech.js đã tự báo lỗi đúng nguyên nhân khi lỗi server)
          if (event.error && event.error !== 'network' && typeof window !== 'undefined') {
            const nativeSpeechErrorMap = {
              'not-allowed': 'Trình duyệt chưa cho phép phát âm thanh. Vui lòng bấm thử lại.',
              'audio-busy': 'Thiết bị âm thanh đang bận.',
              'audio-hardware': 'Không tìm thấy hoặc có lỗi phần cứng âm thanh/loa.',
              'synthesis-unavailable': 'Dịch vụ giọng nói của trình duyệt tạm thời không hoạt động.',
              'synthesis-failed': 'Trình duyệt không thể đọc đoạn văn bản này.',
              'language-unavailable': 'Ngôn ngữ tiếng Việt không khả dụng trên trình duyệt.',
              'voice-unavailable': 'Giọng đọc đã chọn không khả dụng.',
              'text-too-long': 'Đoạn văn bản quá dài.',
            };
            const msg = nativeSpeechErrorMap[event.error] || `Lỗi giọng đọc trình duyệt (${event.error}).`;
            window.dispatchEvent(
              new CustomEvent('tts-error', {
                detail: { message: msg, error: event.error },
              })
            );
          }
        }

        if (event.error !== 'canceled') {
          this.playNextChunk();
        } else {
          this.stop();
        }
      };

      this.currentUtterance = utterance;

      // Bảo vệ V8 GC không thu hồi utterance giữa chừng
      if (typeof window !== 'undefined') {
        window.__activeSpeechUtterances = window.__activeSpeechUtterances || [];
        window.__activeSpeechUtterances.push(utterance);
      }

      // Phát âm thanh ngay lập tức
      window.speechSynthesis.speak(utterance);

      // Chromium fix: nếu trình duyệt bắt đầu ở trạng thái paused, mở khóa ngay
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }
    } catch (err) {
      console.error('[VietnameseNarrator] playNextChunk error:', err);
      this.playNextChunk();
    }
  }

  startKeepAlive() {
    this.clearKeepAlive();
    // Khắc phục bug Chrome tự đóng băng hàng đợi speech sau vài giây
    this.keepAliveInterval = setInterval(() => {
      if (typeof window !== 'undefined' && window.speechSynthesis) {
        if (this.status === 'speaking') {
          if (window.speechSynthesis.paused) {
            window.speechSynthesis.resume();
          }
        }
      }
    }, 2000);
  }

  clearKeepAlive() {
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
      this.keepAliveInterval = null;
    }
  }
}

/**
 * Shared singleton narrator instance ensuring exclusivity across components
 */
export const narrator = new VietnameseNarrator();

/**
 * Create a new narrator instance (if isolated queue needed)
 */
export function createNarrator() {
  return new VietnameseNarrator();
}

/**
 * Stop any ongoing speech synthesis immediately
 */
export function stopSpeakingVietnamese() {
  narrator.stop();
}

/**
 * Speak text using narrator
 */
export function speakVietnamese(text, options = {}) {
  narrator.speak(text, options);
}

export default speakVietnamese;
