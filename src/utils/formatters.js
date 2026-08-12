/**
 * Format số theo chuẩn Việt Nam (dùng dấu chấm ngăn cách hàng nghìn)
 * Ví dụ: 1254 -> 1.254
 */
export const formatNumber = (num) => {
  if (num === undefined || num === null || isNaN(num)) return '0';
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
};

/**
 * Format giá tiền VNĐ
 * Ví dụ: 100000 -> 100.000 VNĐ
 */
export const formatCurrency = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '0 VNĐ';
  if (amount === 0) return 'Miễn phí';
  return `${formatNumber(amount)} VNĐ`;
};

/**
 * Format ngày tháng DD/MM/YYYY
 */
export const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  if (isNaN(date.getTime())) return dateString;
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
};

/**
 * Lấy danh sách 6 tháng gần nhất từ hiện tại dạng "MM/YYYY"
 */
export const getLast6Months = () => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const monthStr = String(d.getMonth() + 1).padStart(2, '0');
    const yearStr = d.getFullYear();
    months.push(`${monthStr}/${yearStr}`);
  }
  return months;
};
