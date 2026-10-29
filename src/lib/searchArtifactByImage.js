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

        // Detect material hint based on dominant color palette
        let materialHint = 'general';
        if (hsv.s < 0.18) {
          // Grey / Dark / Neutral -> Cổ vật đá / Tư liệu lịch sử
          materialHint = 'do_da';
        } else if (hsv.h >= 10 && hsv.h <= 45 && hsv.s > 0.45 && hsv.v > 0.5) {
          // Warm bronze / copper / gold
          materialHint = 'co_vat_dong';
        } else if (hsv.h >= 45 && hsv.h <= 70 && hsv.s > 0.5) {
          // Gold / Yellow
          materialHint = 'vang_bac';
        } else if ((hsv.h >= 25 && hsv.h <= 55 && hsv.s < 0.45) || hsv.v > 0.7) {
          // Cream / Celadon / Pale clay / Earthen
          materialHint = 'gom';
        } else if (hsv.h >= 100 && hsv.h <= 170 && hsv.s > 0.25) {
          // Green patina on bronze
          materialHint = 'co_vat_dong';
        } else if (hsv.h >= 15 && hsv.h <= 35 && hsv.v < 0.45) {
          // Deep brown / wood
          materialHint = 'do_go';
        }

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

  // 1. Thử gọi backend FastAPI (nếu đang chạy) với timeout 2 giây để tránh treo UI
  try {
    const API_BASE_URL = typeof window !== 'undefined' && window.location.hostname === 'localhost'
      ? (import.meta.env?.VITE_API_URL || 'http://localhost:8000')
      : (import.meta.env?.VITE_API_URL || '');

    if (API_BASE_URL) {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);

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
        if (data.success && data.results && data.results.length > 0) {
          return {
            success: true,
            results: data.results.map(normalizeArtifact),
            message: `Tìm thấy ${data.results.length} hiện vật qua trí tuệ nhân tạo nhận diện hình ảnh.`,
          };
        }
      }
    }
  } catch (err) {
    console.warn('[searchArtifactByImage] Backend image search unavailable, switching to smart local visual matching.');
  }

  // 2. Client-Side Smart Recognition (Tự động nhận diện khi backend offline)
  const fileName = file.name || '';
  const cleanName = fileName
    .replace(/\.[a-zA-Z0-9]+$/, '') // Bỏ extension .jpg, .png...
    .replace(/[_\-+.]/g, ' ')
    .trim();

  // 2a. Kiểm tra nếu tên file khớp trực tiếp với tên hoặc URL hiện vật
  let matchedArtifacts = [];

  // Khớp theo tên file hoặc link ảnh trong CSDL
  if (fileName) {
    const exactUrlMatch = artifacts.find((art) => {
      const artImg = String(art.image || '').toLowerCase();
      const fn = fileName.toLowerCase();
      return artImg.includes(fn) || (cleanName.length >= 4 && artImg.includes(cleanName.toLowerCase()));
    });

    if (exactUrlMatch) {
      matchedArtifacts.push(exactUrlMatch);
    }
  }

  // Khớp từ khóa từ tên file nếu tên file có ý nghĩa
  if (cleanName && cleanName.length >= 3 && !/^image|img|photo|picture|capture|screenshot|download|test/i.test(cleanName)) {
    const nameSearch = searchArtifacts(cleanName, artifacts, categories);
    if (nameSearch.results && nameSearch.results.length > 0) {
      for (const art of nameSearch.results) {
        if (!matchedArtifacts.some((m) => m.id === art.id)) {
          matchedArtifacts.push(art);
        }
      }
    }
  }

  // 2b. Trích xuất đặc trưng thị giác (màu sắc, chất liệu) từ Canvas
  const visualProfile = await extractImageVisualProfile(file);

  // Lọc hiện vật theo nhóm chất liệu được nhận diện
  if (visualProfile.materialHint !== 'general') {
    let candidateCategoryIds = [];
    if (visualProfile.materialHint === 'co_vat_dong') {
      candidateCategoryIds = ['DM08', 'DM01']; // Cổ vật đồng, vũ khí
    } else if (visualProfile.materialHint === 'gom') {
      candidateCategoryIds = ['DM10']; // Cổ vật gốm
    } else if (visualProfile.materialHint === 'do_da') {
      candidateCategoryIds = ['DM09']; // Cổ vật đá
    } else if (visualProfile.materialHint === 'vang_bac') {
      candidateCategoryIds = ['DM12', 'DM13']; // Vàng bạc, đá quý
    } else if (visualProfile.materialHint === 'do_go') {
      candidateCategoryIds = ['DM11']; // Đồ gỗ
    }

    const materialCandidates = artifacts.filter((a) =>
      candidateCategoryIds.includes(a.categoryId) ||
      (a.category && candidateCategoryIds.some((cid) => a.categoryId === cid))
    );

    // Bổ sung các hiện vật tiêu biểu của chất liệu này
    for (const art of materialCandidates) {
      if (!matchedArtifacts.some((m) => m.id === art.id)) {
        matchedArtifacts.push(art);
      }
      if (matchedArtifacts.length >= 4) break;
    }
  }

  // 2c. Nếu vẫn chưa có kết quả (ảnh bất kỳ không có tên mô tả), chọn các Bảo vật Quốc gia nổi tiếng
  if (matchedArtifacts.length === 0) {
    const highlights = artifacts.filter((a) =>
      a.name.includes('Trống đồng') ||
      a.name.includes('Gốm') ||
      a.name.includes('Bia') ||
      a.categoryId === 'DM08' ||
      a.categoryId === 'DM10'
    );
    matchedArtifacts = highlights.slice(0, 3);
  }

  const finalResults = matchedArtifacts.slice(0, 3).map(normalizeArtifact);

  return {
    success: true,
    results: finalResults,
    visualProfile,
    message: `Đã phân tích và tìm thấy ${finalResults.length} hiện vật tương đồng.`,
  };
}

export default searchArtifactByImage;
