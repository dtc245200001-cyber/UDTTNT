export const ticketTypes = [
  { id: 'TK001', name: 'Vé Người lớn', price: 50000, description: 'Áp dụng cho du khách từ 16 đến 60 tuổi', active: true },
  { id: 'TK002', name: 'Vé Học sinh - Sinh viên', price: 20000, description: 'Cần xuất trình thẻ HS-SV còn hiệu lực', active: true },
  { id: 'TK003', name: 'Vé Trẻ em / Người cao tuổi', price: 0, description: 'Miễn phí cho trẻ em dưới 6 tuổi và người > 60 tuổi', active: true },
  { id: 'TK004', name: 'Vé Khách Quốc tế', price: 100000, description: 'Bao gồm máy thuyết minh đa ngôn ngữ', active: true },
  { id: 'TK005', name: 'Vé Combo Triển lãm Đặc biệt', price: 120000, description: 'Tham quan toàn bộ phòng trưng bày + Triển lãm chuyên đề', active: true },
];

export const ticketStats = {
  totalSoldToday: 45,
  totalSoldMonth: 3246,
  revenueMonth: 162300000,
  growthRate: 320, // +320 so với tháng trước
};
