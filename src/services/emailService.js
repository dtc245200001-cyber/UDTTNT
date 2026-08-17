/**
 * Email & SMS Notification Simulator Service
 * Simulates sending ticket confirmation emails and SMS to visitors.
 */

export const sendTicketConfirmationEmail = async (order) => {
  const isCounter = order.payment_method === 'counter' || order.paymentMethod === 'counter' || order.paymentMethod === 'Thanh toán tại quầy';
  const orderCode = order.order_code || order.orderCode || order.ticketCode;
  
  console.log(`[EMAIL SIMULATOR] Sending email to ${order.email}...`);
  console.log(`Subject: [Bảo tàng Quốc gia VN] Xác nhận đặt vé tham quan - ${orderCode}`);
  
  if (isCounter) {
    console.log(`Body: Kính chào ${order.name}, Đơn đặt vé ${orderCode} của bạn đã khởi tạo thành công (Trạng thái: CHƯA THANH TOÁN - VUI LÒNG THANH TOÁN KHI ĐẾN QUẦY). Ngày tham quan: ${order.visit_date || order.visitDate}. Total: ${order.totalPrice || order.total_price} VNĐ.`);
  } else {
    console.log(`Body: Kính chào ${order.name}, Đơn đặt vé ${orderCode} của bạn đã ĐÃ THANH TOÁN THÀNH CÔNG. Vui lòng xuất trình mã QR đính kèm khi đến tham quan.`);
  }

  return {
    success: true,
    message: `Đã gửi email xác nhận vé đến ${order.email} thành công!`,
    sentAt: new Date().toISOString(),
  };
};
