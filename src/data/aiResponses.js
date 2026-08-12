import { artifacts } from './artifacts';
import { exhibitions } from './exhibitions';

/**
 * Hàm loại bỏ dấu Tiếng Việt giúp so sánh linh hoạt hơn
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
 * Logic trả lời giả lập cho Trợ lý AI Bảo Tàng
 */
export const getMockAIResponse = (question) => {
  const normalized = removeVietnameseTones(question || '');

  if (normalized.includes('thoi ly') || normalized.includes('ly')) {
    const lyArtifacts = artifacts.filter(a => removeVietnameseTones(a.culture).includes('ly') || removeVietnameseTones(a.period).includes('ly'));
    const names = lyArtifacts.map(a => `• ${a.name} (${a.period}): ${a.location}`).join('\n');
    return `Bảo tàng hiện đang lưu giữ các hiện vật thời Lý tiêu biểu sau:\n\n${names}\n\nBạn có thể đến Phòng trưng bày B để chiêm ngưỡng trực tiếp!`;
  }

  if (normalized.includes('trien lam') || normalized.includes('su kien')) {
    const activeExhibitions = exhibitions.filter(e => e.status === 'Đang diễn ra');
    const list = activeExhibitions.map(e => `• ${e.name} (Địa điểm: ${e.location}, Thời gian: ${e.startDate} - ${e.endDate})`).join('\n');
    return `Hiện tại bảo tàng đang tổ chức các triển lãm nổi bật sau:\n\n${list}\n\nRất hân hạnh được đón tiếp bạn tham quan!`;
  }

  if (normalized.includes('gio mo cua') || normalized.includes('gio lam viec') || normalized.includes('mo cua')) {
    return 'Bảo tàng Bảo Tàng Việt Nam mở cửa phục vụ du khách từ 8:00 - 17:00 các ngày trong tuần (từ Thứ Ba đến Chủ Nhật). Bảo tàng đóng cửa bảo trì vào Thứ Hai hàng tuần.';
  }

  if (normalized.includes('gioi thieu') || normalized.includes('bao tang') || normalized.includes('thong tin')) {
    return 'Bảo tàng Việt Nam là trung tâm lưu giữ và tôn vinh hơn 100.000 tài liệu, hiện vật lịch sử văn hóa vô giá của dân tộc từ thời tiền sử đến hiện đại. Hệ thống tích hợp Trợ lý AI sẵn sàng hỗ trợ bạn tra cứu hiện vật, lộ trình tham quan và thông tin vé nhanh chóng!';
  }

  if (normalized.includes('ve') || normalized.includes('gia ve') || normalized.includes('ve tham quan')) {
    return 'Giá vé tham quan bảo tàng như sau:\n• Vé Người lớn: 50.000 VNĐ/lượt\n• Vé Học sinh - Sinh viên: 20.000 VNĐ/lượt\n• Trẻ em dưới 6 tuổi & Người cao tuổi (>60t): Miễn phí.\nBạn có thể đặt vé trực tiếp tại quầy hoặc qua mục Vé Tham Quan trên hệ thống!';
  }

  if (normalized.includes('trong dong') || normalized.includes('dong son')) {
    const artifact = artifacts.find(a => a.id === 'AV001');
    return `Trống đồng Đông Sơn (Mã: AV001) thuộc Văn hóa Đông Sơn (1200 - 200 TCN). Hiện đang được trưng bày tại ${artifact?.location}. Đây là Bảo vật Quốc gia đại diện cho nghệ thuật đúc đồng đỉnh cao của người Việt cổ.`;
  }

  return 'Xin lỗi, tôi chưa có thông tin chi tiết về câu hỏi này. Bạn có thể thử các câu hỏi gợi ý như: "Hiện vật thời Lý", "Triển lãm đang diễn ra", "Giờ mở cửa bảo tàng" hoặc "Giá vé tham quan".';
};
