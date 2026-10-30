import { searchArtifacts, removeVietnameseTones } from './searchArtifacts.js';
import { normalizeArtifact } from '../utils/normalizeArtifact.js';

/**
 * Convert RGB to HSV
 */
function rgbToHsv(r, g, b) {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (max !== min) {
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }
  return { h: h * 360, s, v };
}

/**
 * Extract visual color profile from an image File using HTML5 Canvas
 * @param {File} file 
 * @returns {Promise<{ h: number, s: number, v: number, materialHint: string }>}
 */
export async function extractImageVisualProfile(file) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return { h: 30, s: 0.5, v: 0.5, materialHint: 'general' };
  }

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = 32;
        canvas.height = 32;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          URL.revokeObjectURL(url);
          resolve({ h: 30, s: 0.5, v: 0.5, materialHint: 'general' });
          return;
        }

        ctx.drawImage(img, 0, 0, 32, 32);
        const data = ctx.getImageData(0, 0, 32, 32).data;
        URL.revokeObjectURL(url);

        let totalR = 0, totalG = 0, totalB = 0;
        let count = 0;

        for (let i = 0; i < data.length; i += 4) {
          const a = data[i + 3];
          if (a > 128) {
            totalR += data[i];
            totalG += data[i + 1];
            totalB += data[i + 2];
            count++;
          }
        }

        if (count === 0) {
          resolve({ h: 30, s: 0.5, v: 0.5, materialHint: 'general' });
          return;
        }

        const avgR = totalR / count;
        const avgG = totalG / count;
        const avgB = totalB / count;
        const hsv = rgbToHsv(avgR, avgG, avgB);

        // Detect material hint based on dominant color palette.
        // Ngưỡng được nâng cao để tránh nhận diện sai ảnh hiện đại (điện thoại, xe cộ...).
        // Tất cả điều kiện đều yêu cầu saturation cao (>0.5) để chỉ khớp màu cổ vật thật sự đặc trưng.
        let materialHint = 'general';
        if (hsv.h >= 10 && hsv.h <= 45 && hsv.s > 0.55 && hsv.v > 0.3 && hsv.v < 0.75) {
          // Warm bronze / copper tone - rất đặc trưng, không lẫn với màu cam/vàng hiện đại
          materialHint = 'co_vat_dong';
        } else if (hsv.h >= 45 && hsv.h <= 65 && hsv.s > 0.6 && hsv.v > 0.4 && hsv.v < 0.8) {
          // Pure gold / amber - vàng kim loại thật sự
          materialHint = 'vang_bac';
        } else if (hsv.h >= 100 && hsv.h <= 170 && hsv.s > 0.4 && hsv.v < 0.65) {
          // Green patina on bronze - xanh patina đặc trưng
          materialHint = 'co_vat_dong';
        } else if (hsv.h >= 15 && hsv.h <= 35 && hsv.s > 0.35 && hsv.v < 0.4) {
          // Deep brown / wood - nâu đất, gỗ cổ
          materialHint = 'do_go';
        }
        // Bỏ phân loại 'do_da' và 'gom' bằng màu trung tính/xám vì quá mơ hồ:
        // Điện thoại, xe, nhiều vật dụng hiện đại cũng có màu xám/kem → gây nhận diện sai.

        resolve({ ...hsv, materialHint });
      } catch (err) {
        URL.revokeObjectURL(url);
        resolve({ h: 30, s: 0.5, v: 0.5, materialHint: 'general' });
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ h: 30, s: 0.5, v: 0.5, materialHint: 'general' });
    };

    img.src = url;
  });
}

/**
 * Smart image search handler
 * Attempts backend visual embedding first, then falls back to client-side visual + metadata analysis.
 *
 * @param {File} file - Uploaded image file
 * @param {Array} artifacts - Full artifacts list from context
 * @param {Array} categories - Categories list from context
 * @returns {Promise<{ success: boolean, results: Array, message: string }>}
 */
export async function searchArtifactByImage(file, artifacts = [], categories = []) {
  if (!file) {
    return { success: false, results: [], message: 'Vui lòng chọn hình ảnh cần tìm kiếm.' };
  }

  // 1. Gọi backend FastAPI (Gemini Vision screening + ResNet50 similarity)
  try {
    const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? (import.meta.env?.VITE_API_URL || 'http://localhost:8000')
      : (import.meta.env?.VITE_API_URL || '');

    if (API_BASE_URL) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12 giây cho Gemini Vision

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch(`${API_BASE_URL}/api/hien-vat/image-search?match_count=3`, {
        method: 'POST',
        body: formData,
        signal: controller.signal,
      }).catch(() => null);

      clearTimeout(timeoutId);

      if (response && response.ok) {
        const data = await response.json();
        
        // Backend đã xử lý và xác nhận kết quả (kể cả từ chối ảnh không phải hiện vật)
        if (data.success && data.results && data.results.length > 0) {
          return {
            success: true,
            results: data.results.map(normalizeArtifact),
            message: data.message || `Tìm thấy ${data.results.length} hiện vật qua trí tuệ nhân tạo nhận diện hình ảnh.`,
          };
        }

        // Backend báo ảnh không phải hiện vật hoặc không có hiện vật tương đồng
        return {
          success: false,
          results: [],
          verdict: data.verdict || 'not_artifact',
          message: data.message || 'Không tìm thấy hiện vật nào trong bảo tàng tương đồng với hình ảnh này.',
        };
      }
    }
  } catch (err) {
    console.warn('[searchArtifactByImage] Backend image search unavailable:', err);
  }

  // 2. Client-Side Fallback (CHỈ chạy khi backend hoàn toàn mất mạng / offline)
  const fileName = file.name || '';
  const cleanName = fileName
    .replace(/\.[a-zA-Z0-9]+$/, '') // Bỏ extension .jpg, .png...
    .replace(/[_\-+.]/g, ' ')
    .trim();

  let matchedArtifacts = [];

  // Khớp chính xác theo URL hoặc tên file nếu tên file phản ánh hiện vật
  if (fileName) {
    const exactUrlMatch = artifacts.find((art) => {
      const artImg = String(art.image || '').toLowerCase();
      const fn = fileName.toLowerCase();
      return artImg.includes(fn) || (cleanName.length >= 5 && artImg.includes(cleanName.toLowerCase()));
    });

    if (exactUrlMatch) {
      matchedArtifacts.push(exactUrlMatch);
    }
  }

  // Khớp từ khóa rõ ràng từ tên file nếu tên file mang tính miêu tả (không phải tên chung chung)
  if (cleanName && cleanName.length >= 4 && !/^image|img|photo|picture|capture|screenshot|download|test|unnamed/i.test(cleanName)) {
    const nameSearch = searchArtifacts(cleanName, artifacts, categories);
    if (nameSearch.results && nameSearch.results.length > 0) {
      for (const art of nameSearch.results) {
        if (!matchedArtifacts.some((m) => m.id === art.id)) {
          matchedArtifacts.push(art);
        }
      }
    }
  }

  // TUYỆT ĐỐI KHÔNG đoán mò hiện vật dựa trên màu sắc canvas
  // Vì ảnh đời thường (điện thoại, xe, vật dụng...) có màu ngẫu nhiên sẽ bị gán sai thành bảo vật.
  if (matchedArtifacts.length === 0) {
    return {
      success: false,
      results: [],
      message: 'Không tìm thấy hiện vật tương đồng trong bảo tàng.',
    };
  }

  const finalResults = matchedArtifacts.slice(0, 3).map(normalizeArtifact);
  return {
    success: true,
    results: finalResults,
    message: `Đã tìm thấy ${finalResults.length} hiện vật tương đồng theo thông tin tệp.`,
  };
}

export default searchArtifactByImage;
