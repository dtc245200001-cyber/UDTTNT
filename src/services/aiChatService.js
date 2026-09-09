/**
 * Service giao tiếp với Backend FastAPI RAG AI của Bảo tàng.
 * Hỗ trợ cả 2 chế độ:
 *  - sendChatQuery()   : Non-streaming (dự phòng, tương thích ngược)
 *  - streamChatQuery() : Streaming SSE (trải nghiệm typing realtime)
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

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
 * @param {function} onError - Callback khi lỗi: (errorMessage) => void
 * @returns {function} Hàm hủy streaming (AbortController.abort)
 */
export const streamChatQuery = (message, history = [], onChunk, onDone, onError) => {
  const controller = new AbortController();

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
          }
        } catch {
          // Bỏ qua
        }
      }

      onDone?.();
    } catch (error) {
      if (error.name === 'AbortError') return; // Người dùng hủy chủ động
      console.warn('[AI Stream Service] Lỗi streaming:', error.message);
      onError?.(error.message);
    }
  };

  run();
  return () => controller.abort();
};
