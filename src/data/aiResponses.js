import { artifacts } from './artifacts';
import { exhibitions } from './exhibitions';
import { categories } from './categories';
import { events } from './events';
import { ticketTypes } from './tickets';

/**
 * Hàm loại bỏ dấu Tiếng Việt giúp so sánh linh hoạt
 */
const removeVietnameseTones = (str) => {
  if (!str) return '';
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
};

/**
 * Tra cứu thông minh RAG trên 270 hiện vật và kho dữ liệu bảo tàng
 */
export const getMockAIResponse = (question) => {
  if (!question || !question.trim()) {
    return 'Xin chào! Bạn có thể đặt câu hỏi về hiện vật, danh mục di sản, triển lãm, giá vé hoặc sự kiện tại Bảo tàng Quốc gia Việt Nam.';
  }

  const raw = question.trim();
  const normalized = removeVietnameseTones(raw);

  // 1. Giờ mở cửa & địa chỉ
  if (normalized.includes('gio mo cua') || normalized.includes('gio lam viec') || normalized.includes('dia chi') || normalized.includes('o dau')) {
    return `🏛️ **BẢO TÀNG QUỐC GIA VIỆT NAM**
• **Giờ mở cửa:** 08:00 – 17:00 (Từ Thứ Ba đến Chủ Nhật hàng tuần, đóng cửa Thứ Hai bảo trì).
• **Địa chỉ:** Số 1 Tràng Tiền / 216 Trần Quang Khải, Hoàn Kiếm, Hà Nội.
• **Trợ lý AI:** Sẵn sàng hướng dẫn thông tin hiện vật & lộ trình 24/7!`;
  }

  // 2. Giá vé & Đặt vé
  if (normalized.includes('gia ve') || normalized.includes('ve tham quan') || (normalized.includes('ve') && normalized.includes('bao nhieu'))) {
    const list = ticketTypes.map((t) => `• **${t.name}**: ${t.price.toLocaleString('vi-VN')} VNĐ (${t.description})`).join('\n');
    return `🎫 **BẢNG GIÁ VÉ THAM QUAN BẢO TÀNG:**\n\n${list}\n\n👉 Bạn có thể đặt vé trực tuyến ngay tại mục **"Vé tham quan"** trên hệ thống và quét mã QR khi tới cửa soát vé!`;
  }

  // 3. Triển lãm & Sự kiện
  if (normalized.includes('trien lam') || normalized.includes('su kien') || normalized.includes('toa dam')) {
    const activeEx = exhibitions.filter((e) => e.status === 'Đang diễn ra');
    const exList = activeEx.map((e) => `• **${e.name}** (${e.startDate} → ${e.endDate} tại ${e.location}): ${e.description}`).join('\n\n');
    const evList = events.map((ev) => `• **${ev.title}** (${ev.date} lúc ${ev.time} tại ${ev.location})`).join('\n');

    return `🏛️ **TRIỂN LÃM & SỰ KIỆN NỔI BẬT:**\n\n**Các Triển lãm đang mở cửa:**\n${exList}\n\n**Sự kiện & Tọa đàm sắp diễn ra:**\n${evList}`;
  }

  // 4. Danh mục di sản
  if (normalized.includes('danh muc') || normalized.includes('loai hien vat') || normalized.includes('co nhung gi')) {
    const catList = categories.map((c) => `• **${c.name}** (${c.count} hiện vật): ${c.description}`).join('\n');
    return `📦 **BẢO TÀNG HIỆN LƯU GIỮ 270 HIỆN VẬT THEO ${categories.length} DANH MỤC:**\n\n${catList}\n\n👉 Bạn có thể xem chi tiết từng danh mục tại trang **"Khám phá hiện vật"**!`;
  }

  // 5. Tìm kiếm trực tiếp hiện vật theo từ khóa trên toàn bộ 270 hiện vật
  const keywords = normalized.split(/\s+/).filter((w) => w.length > 1);
  const matchedArtifacts = artifacts.filter((a) => {
    const aText = removeVietnameseTones(`${a.name} ${a.description} ${a.culture} ${a.category} ${a.period}`);
    return keywords.some((kw) => aText.includes(kw));
  });

  if (matchedArtifacts.length > 0) {
    const topMatches = matchedArtifacts.slice(0, 3);
    const details = topMatches
      .map(
        (a, i) =>
          `**${i + 1}. ${a.name}** (Mã: \`${a.id}\` · ${a.category})\n• **Văn hóa/Niên đại:** ${a.culture || 'Lịch sử Việt Nam'} · ${a.period || 'Hiện đại'}\n• **Vị trí:** ${a.location || 'Phòng trưng bày'}\n• **Tóm tắt:** ${a.description.slice(0, 220)}...`
      )
      .join('\n\n');

    return `🔎 **KẾT QUẢ TRA CỨU DI SẢN (Tìm thấy ${matchedArtifacts.length} hiện vật liên quan):**\n\n${details}\n\n👉 Bạn có thể bấm vào trang **"Khám phá hiện vật"** hoặc tìm kiếm mã \`${topMatches[0].id}\` để xem hình ảnh sắc nét và thuyết minh đầy đủ!`;
  }

  // Fallback
  return `Xin lỗi, tôi chưa tìm thấy hiện vật nào khớp chính xác với từ khóa "${raw}".\n\n💡 **Gợi ý bạn có thể hỏi:**\n• "Tìm hiện vật Đồ đồng" hoặc "Trống đồng"\n• "Các bảo vật thời Lý / thời Trần"\n• "Giá vé tham quan và giờ mở cửa"\n• "Triển lãm đang diễn ra"`;
};
