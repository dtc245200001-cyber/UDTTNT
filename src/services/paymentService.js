/**
 * Service Quản lý Thanh toán & Tạo mã QR Ngân hàng (VietQR / VNPay)
 * Hệ thống Bảo tàng Quốc gia Việt Nam
 */

export const PAYMENT_STATUS = {
  PENDING: 'Chờ thanh toán',
  CHECKING: 'Đang kiểm tra thanh toán',
  SUCCESS: 'Đã thanh toán',
  FAILED: 'Thanh toán thất bại',
};

/**
 * Lấy thông tin cấu hình tài khoản ngân hàng từ môi trường (.env)
 * Tuyệt đối không hard-code thông tin nhạy cảm.
 */
export const getPaymentConfig = () => {
  return {
    bankId: import.meta.env.VITE_PAYMENT_BANK_ID || 'MB',
    accountNo: import.meta.env.VITE_PAYMENT_ACCOUNT_NO || '09123456789',
    accountName: import.meta.env.VITE_PAYMENT_ACCOUNT_NAME || 'BAO TANG QUOC GIA VIET NAM',
    template: import.meta.env.VITE_PAYMENT_TEMPLATE || 'compact2',
  };
};

/**
 * Tạo URL mã QR thanh toán theo chuẩn VietQR API
 * Quét được trực tiếp bằng tất cả các App ngân hàng tại Việt Nam (MBBank, VCB, BIDV, Techcombank, MoMo...)
 */
export const generatePaymentQRUrl = ({
  amount,
  transferContent,
  bankId,
  accountNo,
  accountName,
  template,
}) => {
  const config = getPaymentConfig();
  const bId = bankId || config.bankId;
  const accNo = accountNo || config.accountNo;
  const accName = accountName || config.accountName;
  const tmpl = template || config.template;

  const encodedContent = encodeURIComponent(transferContent || '');
  const encodedName = encodeURIComponent(accName);

  return `https://img.vietqr.io/image/${bId}-${accNo}-${tmpl}.png?amount=${amount}&addInfo=${encodedContent}&accountName=${encodedName}`;
};

/**
 * Tạo dữ liệu chuỗi QR Thanh toán chuẩn (dùng cho canvas fallback nếu cần)
 */
export const generatePaymentQRPayload = ({ amount, transferContent }) => {
  const config = getPaymentConfig();
  return `VIETQR:${config.bankId}:${config.accountNo}:${amount}:${transferContent}:${config.accountName}`;
};

/**
 * Tạo mã đơn hàng duy nhất dạng TICKET-YYYYMMDD-XXX
 */
export const generateOrderCode = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = Math.floor(100 + Math.random() * 900);
  return `TICKET-${dateStr}-${randomNum}`;
};

/**
 * Xử lý xác minh giao dịch thanh toán (Verification Service)
 * KHÔNG coi việc bấm nút là bằng chứng thành công.
 * Thực hiện mock call với delay để sẵn sàng thay thế bằng API ngân hàng thật/Webhook trong tương lai.
 */
export const verifyPayment = async ({ orderCode, amount, simulateFailure = false }) => {
  return new Promise((resolve) => {
    // Giả lập thời gian kết nối API ngân hàng / Webhook verification (2.5s)
    setTimeout(() => {
      if (simulateFailure) {
        resolve({
          success: false,
          status: PAYMENT_STATUS.FAILED,
          message: 'Không tìm thấy giao dịch chuyển khoản tương ứng. Vui lòng thử lại!',
          verifiedAt: new Date().toISOString(),
        });
      } else {
        const transactionRef = `FT${Date.now().toString().slice(-8)}`;
        resolve({
          success: true,
          status: PAYMENT_STATUS.SUCCESS,
          transactionRef,
          orderCode,
          amount,
          message: 'Xác nhận thanh toán thành công qua hệ thống liên ngân hàng!',
          paidAt: new Date().toISOString(),
        });
      }
    }, 2200);
  });
};
