/**
 * Service giao tiếp với Backend FastAPI RAG AI của Bảo tàng.
 * Hỗ trợ cả 2 chế độ:
 *  - sendChatQuery()   : Non-streaming (dự phòng, tương thích ngược)
 *  - streamChatQuery() : Streaming SSE (trải nghiệm typing realtime)
 */

const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/+$/, '');

/**
 * Chuyển đổi messages sang định dạng history cho Backend.
 */
function formatHistory(messages) {
  return messages.map((msg) => ({
    role: msg.sender === 'user' ? 'user' : 'assistant',
    content: msg.text || '',
  }));
}

/**
 * Gửi câu hỏi và nhận câu trả lời đầy đủ (non-streaming).
 * Giữ nguyên để làm dự phòng khi streaming không khả dụng.
 */
export const sendChatQuery = async (message, history = []) => {
  try {
    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        message,
        history: formatHistory(history),
      }),
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      throw new Error(errData.detail || `Lỗi máy chủ (${response.status})`);
    }

    const data = await response.json();
    return {
      success: true,
      answer: data.answer,
      sources: data.sources || [],
      artifactIds: data.artifact_ids || [],
    };
  } catch (error) {
    console.warn('[AI Chat Service] Lỗi kết nối backend:', error.message);
    return {
      success: false,
      error: error.message,
      answer: null,
      sources: [],
    };
  }
};

/**
 * Gửi câu hỏi và nhận câu trả lời theo dạng streaming (SSE).
 *
 * @param {string} message - Câu hỏi của người dùng
 * @param {Array} history  - Lịch sử tin nhắn
 * @param {function} onChunk - Callback nhận từng chunk text: (chunkText) => void
 * @param {function} onDone  - Callback khi hoàn thành: () => void
 * @param {function} onArtifacts - Callback nhận mảng artifactIds: (ids) => void
 * @param {function} onStatus - Callback nhận trạng thái xử lý: (status) => void
 *   (C3: backend gửi {status:"processing"} khi first token chậm >3s;
 *   tham số optional, tương thích ngược với mọi caller cũ)
 * @param {function} onSources - Callback nhận mảng sources RAG: (sources) => void
 *   (backend gửi kèm {sources:[...]} đầu stream; optional, caller cũ bỏ qua)
 * @returns {function} Hàm hủy streaming (AbortController.abort)
 */
export const streamChatQuery = (message, history = [], onChunk, onDone, onError, onArtifacts, onStatus, onSources, onRelatedItems) => {
  const controller = new AbortController();
  let isManualAbort = false;

  // Timeout 45s (đủ cho Render cold start nhưng không để treo vô tận)
  const timeoutId = setTimeout(() => {
    controller.abort('TIMEOUT');
  }, 45000);

  const run = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history: formatHistory(history),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.detail || `Lỗi máy chủ (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });

        // Xử lý từng dòng SSE trong buffer
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Giữ lại dòng chưa hoàn chỉnh

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const parsed = JSON.parse(dataStr);

            if (parsed.done) {
              onDone?.();
              return;
            }

            if (parsed.error) {
              onError?.(parsed.error);
              return;
            }

            if (parsed.chunk) {
              onChunk?.(parsed.chunk);
            }

            if (parsed.artifacts) {
              onArtifacts?.(parsed.artifacts);
            }

            if (parsed.related_items) {
              onRelatedItems?.(parsed.related_items);
            }

            if (parsed.sources) {
              onSources?.(parsed.sources);
            }

            // C3/L2b2: event trạng thái (processing/interrupted, kèm error nếu có)
            if (parsed.status) {
              onStatus?.(parsed.status, parsed);
            }
          } catch {
            // Bỏ qua dòng SSE không phải JSON hợp lệ
          }
        }
      }

      // Xử lý nốt phần buffer cuối cùng nếu không có ký tự \n
      if (buffer.trim().startsWith('data: ')) {
        try {
          const dataStr = buffer.slice(6).trim();
          if (dataStr) {
            const parsed = JSON.parse(dataStr);
            if (parsed.chunk) onChunk?.(parsed.chunk);
            if (parsed.status) onStatus?.(parsed.status, parsed);
            if (parsed.sources) onSources?.(parsed.sources);
          }
        } catch {
          // Bỏ qua
        }
      }

      onDone?.();
    } catch (error) {
      clearTimeout(timeoutId);
      if (isManualAbort) return; // Người dùng chủ động hủy
      const errorMsg = controller.signal.aborted ? 'Kết nối máy chủ bị quá thời gian (timeout)' : (error.message || 'Lỗi kết nối API');
      console.warn('[AI Stream Service] Lỗi streaming:', errorMsg);
      onError?.(errorMsg);
    }
  };

  run();
  return () => {
    isManualAbort = true;
    clearTimeout(timeoutId);
    controller.abort();
  };
};
