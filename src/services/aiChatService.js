/**
 * Service giao tiếp với Backend FastAPI RAG AI của Bảo tàng
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export const sendChatQuery = async (message, history = []) => {
  try {
    // Chuyển đổi định dạng history sạch sẽ
    const formattedHistory = history.map((msg) => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text || '',
    }));

    const response = await fetch(`${API_BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message,
        history: formattedHistory,
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
    console.warn('[AI Chat Service Warning] Không thể kết nối tới FastAPI backend:', error.message);
    
    return {
      success: false,
      error: error.message,
      answer: null,
      sources: [],
    };
  }
};
