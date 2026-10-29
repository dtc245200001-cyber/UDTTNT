/**
 * forceVietnameseSpeech — đảm bảo mọi lời đọc đều bằng TIẾNG VIỆT.
 *
 * Vấn đề: nếu máy không có giọng tiếng Việt, `speechSynthesis.speak()` dùng giọng mặc định
 * (tiếng Anh) để đọc chữ Việt → nghe sai hoàn toàn / hoặc không có tiếng.
 *
 * Cách hoạt động (chặn ở tầng thấp nhất, KHÔNG phụ thuộc code gọi phía trên):
 *  - Có giọng Việt trên máy  → gán đúng giọng đó cho utterance rồi đọc bằng trình duyệt.
 *  - Không có giọng Việt     → KHÔNG đọc bằng giọng mặc định; gửi văn bản tới `POST /api/tts`
 *                              (edge-tts, giọng Hoài My/Nam Minh) rồi phát bằng <audio>.
 *  - Server lỗi              → hiện thông báo tiếng Việt (không im lặng, không đọc tiếng Anh).
 * Các sự kiện start/end/error của utterance vẫn được phát đúng nên hàng đợi/nút bấm cũ chạy tiếp.
 *
 * Dùng: `import '@/lib/forceVietnameseSpeech';` ở đầu src/main.jsx (chỉ cần một lần).
 */

const API_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_API_URL) ||
  'http://localhost:8000';

const SILENT_WAV =
  'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=';

const MSG_NO_SERVER =
  'Máy chưa có giọng đọc tiếng Việt và chưa kết nối được máy chủ giọng đọc. ' +
  'Hãy bật backend (npm run dev) hoặc cài giọng tiếng Việt: Cài đặt → Thời gian & ngôn ngữ → Giọng nói → Thêm giọng → Tiếng Việt.';

function isViVoice(v) {
  return !!v && String(v.lang || '').replace('_', '-').toLowerCase().startsWith('vi');
}

function pickViVoice(voices) {
  const vi = (voices || []).filter(isViVoice);
  if (!vi.length) return null;
  const score = (v) => {
    const n = (v.name || '').toLowerCase();
    let s = 0;
    if (/online|natural/.test(n)) s += 3;
    if (/google|hoaimy|namminh|hoài my|nam minh/.test(n)) s += 2;
    return s;
  };
  return vi.sort((a, b) => score(b) - score(a))[0];
}

function looksVietnamese(u) {
  const lang = String(u.lang || '').toLowerCase();
  if (lang.startsWith('vi')) return true;
  return /[ăâđêôơưáàảãạấầẩẫậắằẳẵặéèẻẽẹếềểễệíìỉĩịóòỏõọốồổỗộớờởỡợúùủũụứừửữựýỳỷỹỵ]/i.test(u.text || '');
}

function showToast(message) {
  try {
    console.error('[TTS]', message);
    window.dispatchEvent(new CustomEvent('tts-error', { detail: { message } }));
    if (typeof window !== 'undefined' && window.__ttsCustomToast) return;
    const id = '__tts_toast__';
    document.getElementById(id)?.remove();
    const el = document.createElement('div');
    el.id = id;
    el.setAttribute('role', 'alert');
    el.textContent = message;
    el.style.cssText =
      'position:fixed;left:50%;bottom:24px;transform:translateX(-50%);max-width:min(92vw,520px);' +
      'background:#5b3a1e;color:#fff;padding:12px 16px;border-radius:12px;font:14px/1.45 system-ui,sans-serif;' +
      'box-shadow:0 8px 24px rgba(0,0,0,.25);z-index:2147483647;';
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 9000);
  } catch {
    /* ignore */
  }
}

function fire(utterance, type, extra) {
  try {
    const ev = new Event(type);
    if (extra) Object.assign(ev, extra);
    utterance.dispatchEvent(ev);
  } catch {
    /* ignore */
  }
}

export function installForceVietnameseSpeech() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return;
  const synth = window.speechSynthesis;
  if (synth.__forceViInstalled) return;
  synth.__forceViInstalled = true;

  const nativeSpeak = synth.speak.bind(synth);
  const nativeCancel = synth.cancel.bind(synth);
  const nativePause = synth.pause.bind(synth);
  const nativeResume = synth.resume.bind(synth);

  // ── Hàng đợi phát qua server ──────────────────────────────────────────────
  const queue = [];
  let current = null; // { utterance, audio }
  let serverPaused = false;
  let generation = 0; // tăng khi cancel để bỏ kết quả cũ
  const audio = new Audio();
  audio.preload = 'auto';
  let unlocked = false;
  const blobCache = new Map(); // key -> Promise<Blob>

  function unlockAudio() {
    if (unlocked) return;
    unlocked = true; // gọi đồng bộ trong sự kiện click để vượt chính sách autoplay
    try {
      audio.src = SILENT_WAV;
      const p = audio.play();
      if (p && p.catch) p.catch(() => { unlocked = false; });
    } catch {
      unlocked = false;
    }
  }

  function rateOf(u) {
    const r = Number(u.rate);
    return Number.isFinite(r) && r > 0 ? Math.max(0.5, Math.min(1.5, r)) : 1;
  }

  function fetchBlob(u) {
    const text = String(u.text || '').replace(/\s+/g, ' ').trim().slice(0, 1500);
    const rate = rateOf(u);
    const key = `${rate}|${text}`;
    if (blobCache.has(key)) return blobCache.get(key);
    const p = (async () => {
      let res;
      try {
        res = await fetch(`${API_BASE}/api/tts`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, rate }),
        });
      } catch {
        throw new Error(MSG_NO_SERVER);
      }
      if (!res.ok) {
        let detail = '';
        try { detail = (await res.json()).detail || ''; } catch { /* ignore */ }
        throw new Error(detail || `Máy chủ giọng đọc lỗi (${res.status}).`);
      }
      const blob = await res.blob();
      if (!blob.size) throw new Error('Máy chủ giọng đọc không trả về âm thanh.');
      return blob;
    })();
    blobCache.set(key, p);
    p.catch(() => blobCache.delete(key));
    if (blobCache.size > 40) blobCache.delete(blobCache.keys().next().value);
    return p;
  }

  async function pump() {
    if (current || serverPaused) return;
    const utterance = queue.shift();
    if (!utterance) return;
    const gen = generation;
    current = { utterance };
    // tải trước câu kế tiếp để đọc liền mạch
    if (queue[0]) fetchBlob(queue[0]).catch(() => {});
    let url;
    try {
      const blob = await fetchBlob(utterance);
      if (gen !== generation) return;
      url = URL.createObjectURL(blob);
      audio.src = url;
      audio.playbackRate = 1;
      await new Promise((resolve, reject) => {
        audio.onplaying = () => { audio.onplaying = null; fire(utterance, 'start'); };
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('Không phát được âm thanh từ máy chủ.'));
        audio.play().catch((e) =>
          reject(new Error(
            e && e.name === 'NotAllowedError'
              ? 'Trình duyệt chặn phát âm thanh. Hãy bấm nút Nghe thêm một lần nữa.'
              : 'Không phát được âm thanh.'
          ))
        );
        current.abort = () => resolve('aborted');
      });
      if (gen !== generation) return;
      if (current) current.ended = true;
      fire(utterance, 'end');
    } catch (err) {
      if (gen !== generation) return;
      queue.length = 0;
      if (current) current.ended = true;
      showToast(err.message || MSG_NO_SERVER);
      fire(utterance, 'error', { error: 'network' });
      fire(utterance, 'end');
    } finally {
      if (gen === generation) {
        audio.onplaying = audio.onended = audio.onerror = null;
        current = null;
        pump();
      }
      if (url) setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  }

  function stopServer() {
    generation += 1;
    queue.length = 0;
    serverPaused = false;
    try { audio.pause(); } catch { /* ignore */ }
    current?.abort?.();
    current = null;
  }

  // ── Ghi đè API của speechSynthesis ────────────────────────────────────────
  synth.speak = function patchedSpeak(utterance) {
    try {
      if (!utterance || !looksVietnamese(utterance)) return nativeSpeak(utterance);

      const viVoice = pickViVoice(synth.getVoices());
      if (viVoice) {
        try {
          if (!isViVoice(utterance.voice)) utterance.voice = viVoice;
        } catch { /* một số môi trường không cho gán voice → dùng lang */ }
        utterance.lang = (utterance.voice && utterance.voice.lang) || viVoice.lang || 'vi-VN';
        return nativeSpeak(utterance);
      }

      // Không có giọng Việt (hoặc danh sách giọng chưa nạp xong) → server TTS
      unlockAudio();
      try { nativeCancel(); } catch { /* ignore */ }
      queue.push(utterance);
      pump();
    } catch (err) {
      showToast('Không thể đọc thuyết minh: ' + (err && err.message ? err.message : 'lỗi không xác định'));
    }
  };

  synth.cancel = function patchedCancel() {
    stopServer();
    return nativeCancel();
  };
  synth.pause = function patchedPause() {
    if (current) { serverPaused = true; try { audio.pause(); } catch { /* ignore */ } return; }
    return nativePause();
  };
  synth.resume = function patchedResume() {
    if (current && serverPaused) { serverPaused = false; audio.play().catch(() => {}); return; }
    return nativeResume();
  };

  const proto = Object.getPrototypeOf(synth);
  const get = (name) => Object.getOwnPropertyDescriptor(proto, name)?.get?.bind(synth);
  const nSpeaking = get('speaking');
  const nPending = get('pending');
  const nPaused = get('paused');
  Object.defineProperty(synth, 'speaking', { configurable: true, get: () => (!!current && !current.ended) || (nSpeaking ? nSpeaking() : false) });
  Object.defineProperty(synth, 'pending', { configurable: true, get: () => queue.length > 0 || (nPending ? nPending() : false) });
  Object.defineProperty(synth, 'paused', { configurable: true, get: () => serverPaused || (nPaused ? nPaused() : false) });

  // Nạp trước danh sách giọng
  try { synth.getVoices(); synth.addEventListener?.('voiceschanged', () => synth.getVoices()); } catch { /* ignore */ }
}

installForceVietnameseSpeech();
export default installForceVietnameseSpeech;
