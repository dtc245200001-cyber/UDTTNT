/**
 * API Client — Lớp trung gian gọi tới Backend FastAPI.
 * Tự động lấy access_token từ Supabase Auth session
 * và đính kèm header Authorization: Bearer <token>.
 */

import { supabase } from '@/lib/supabase';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

/**
 * Gọi API tới backend FastAPI với xác thực tự động.
 * @param {string} endpoint - Đường dẫn API (VD: '/api/users')
 * @param {object} options - Tuỳ chọn fetch (method, body, headers, ...)
 * @returns {Promise<any>} Dữ liệu JSON từ response
 */
export const apiRequest = async (endpoint, options = {}) => {
  // 1. Lấy access_token hiện tại từ Supabase Auth session
  let accessToken = null;
  try {
    const { data: sessionData } = await supabase.auth.getSession();
    accessToken = sessionData?.session?.access_token || null;
  } catch (err) {
    console.warn('[apiClient] Không thể lấy session:', err.message);
  }

  // 2. Xây dựng headers
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  // 3. Gọi fetch tới backend
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // 4. Xử lý lỗi HTTP
  if (!response.ok) {
    let errorDetail = `Lỗi máy chủ (${response.status})`;
    try {
      const errData = await response.json();
      errorDetail = errData.detail || errorDetail;
    } catch {
      // Không parse được JSON — giữ error mặc định
    }

    const error = new Error(errorDetail);
    error.status = response.status;
    throw error;
  }

  // 5. Trả về dữ liệu JSON
  return response.json();
};

/**
 * Shorthand helpers cho các HTTP methods phổ biến.
 */
export const api = {
  get: (endpoint) => apiRequest(endpoint, { method: 'GET' }),

  post: (endpoint, body) =>
    apiRequest(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  patch: (endpoint, body) =>
    apiRequest(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),

  delete: (endpoint) => apiRequest(endpoint, { method: 'DELETE' }),
};
