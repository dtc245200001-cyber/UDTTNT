import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/formatters';
import {
  Ticket,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  QrCode,
  ArrowRight,
  Info,
  Printer,
  Calendar,
  User,
  Phone,
  Mail,
  Building2,
} from 'lucide-react';
import { QRCode } from '@/components/ui/QRCode';
import {
  PAYMENT_STATUS,
  getPaymentConfig,
  generatePaymentQRUrl,
  generateOrderCode,
} from '@/services/paymentService';
import { exportToPDF } from '@/utils/exportHelpers';

export const TicketBookingModal = ({ isOpen, onClose, selectedTicket }) => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, bookTicket, verifyBookingPayment, tickets, addToast } = useApp();

  const todayStr = new Date().toISOString().split('T')[0];

  // Step 1: Form, Step 2: Confirmation & Payment QR, Step 3: Result E-Ticket QR / Counter Order Notice
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    ticketType: selectedTicket?.name || 'Vé Người lớn',
    price: typeof selectedTicket?.price === 'number' ? selectedTicket.price : 50000,
    quantity: 1,
    visitDate: todayStr,
    paymentOption: 'ONLINE_QR', // 'ONLINE_QR' | 'COUNTER'
    paymentMethod: 'QR thanh toán',
  });

  const [errors, setErrors] = useState({});
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentStatusState, setPaymentStatusState] = useState(PAYMENT_STATUS.PENDING);
  const [currentBooking, setCurrentBooking] = useState(null);
  const [copiedField, setCopiedField] = useState(null); // 'acc' | 'memo' | null

  // Calculate unit price and total price accurately (supporting 0 VNĐ free tickets)
  const selectedTicketObj = tickets.find(
    (t) => t.name.toLowerCase() === (formData.ticketType || '').toLowerCase()
  );
  const unitPrice = selectedTicketObj
    ? Number(selectedTicketObj.price)
    : (formData.ticketType?.includes('Miễn phí') || formData.ticketType?.includes('Trẻ em') || formData.ticketType?.includes('Người cao tuổi'))
    ? 0
    : typeof formData.price === 'number'
    ? formData.price
    : 50000;

  const totalPrice = unitPrice * (formData.quantity || 1);
  const isFreeTicket = totalPrice === 0;

  // Sync when selectedTicket changes or modal opens
  useEffect(() => {
    if (selectedTicket) {
      setFormData((prev) => ({
        ...prev,
        ticketType: selectedTicket.name,
        price: typeof selectedTicket.price === 'number' ? selectedTicket.price : 50000,
        visitDate: prev.visitDate || todayStr,
      }));
    }
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        name: currentUser.name || prev.name,
        email: currentUser.email || prev.email,
        phone: currentUser.phone || prev.phone,
        visitDate: prev.visitDate || todayStr,
      }));
    }
  }, [selectedTicket, currentUser, isOpen]);

  const paymentConfig = getPaymentConfig();

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name || !formData.name.trim()) newErrors.name = 'Vui lòng nhập họ tên người nhận vé.';
    if (!formData.phone || !formData.phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại liên hệ.';
    if (!formData.email || !formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Vui lòng nhập email hợp lệ nhận vé điện tử.';
    }
    if (!formData.visitDate) newErrors.visitDate = 'Vui lòng chọn ngày tham quan dự kiến.';
    if ((formData.quantity || 0) < 1) newErrors.quantity = 'Số lượng vé tối thiểu là 1.';

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      const firstMsg = Object.values(newErrors)[0];
      addToast(`🔴 ${firstMsg}`, 'error');
    }

    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToConfirmation = async (e) => {
    if (e && e.preventDefault) e.preventDefault();

    if (!isAuthenticated) {
      addToast('Bạn cần đăng nhập tài khoản để thực hiện đặt vé!', 'error');
      onClose();
      navigate('/login?redirect=/my-tickets');
      return;
    }

    if (!validateStep1()) {
      return;
    }

    try {
      const isFree = totalPrice === 0;
      const isCounter = !isFree && (formData.paymentOption === 'COUNTER' || formData.paymentMethod === 'Thanh toán tại quầy');

      // Create order (Immediate confirmation & Ticket QR for free or counter tickets)
      const res = await bookTicket({
        name: formData.name,
        phone: formData.phone,
        email: formData.email,
        ticketType: formData.ticketType,
        price: unitPrice,
        quantity: formData.quantity,
        visitDate: formData.visitDate || todayStr,
        paymentOption: formData.paymentOption,
        paymentMethod: isFree
          ? 'Miễn phí'
          : isCounter
          ? 'Thanh toán tại quầy'
          : (formData.paymentMethod || 'QR thanh toán'),
        status: isFree
          ? 'Đã xác nhận'
          : isCounter
          ? 'Chờ thanh toán tại quầy'
          : PAYMENT_STATUS.PENDING,
      });

      if (res && res.success && res.booking) {
        setCurrentBooking(res.booking);
        if (isFree) {
          setPaymentStatusState('Miễn phí');
          setStep(3);
        } else if (isCounter) {
          setPaymentStatusState('Chờ thanh toán tại quầy');
          setStep(3);
        } else {
          // Paid online QR ticket: Move to Step 2 for Payment QR & payment verification
          setPaymentStatusState(PAYMENT_STATUS.PENDING);
          setStep(2);
        }
      } else {
        addToast('Không thể tạo đơn đặt vé. Vui lòng thử lại!', 'error');
      }
    } catch (err) {
      console.error('Lỗi khi thực hiện đặt vé:', err);
      addToast(`Có lỗi xảy ra: ${err.message || 'Không thể tạo đơn hàng'}`, 'error');
    }
  };

  // Handle clicking "Tôi đã thanh toán" - KHÔNG tự động coi là thành công!
  const handleConfirmPaid = async (simulateFailure = false) => {
    if (!currentBooking) return;

    setIsVerifying(true);
    setPaymentStatusState(PAYMENT_STATUS.CHECKING);

    const res = await verifyBookingPayment(currentBooking.id || currentBooking.orderCode, simulateFailure);
    setIsVerifying(false);

    if (res.success) {
      setPaymentStatusState(PAYMENT_STATUS.SUCCESS);
      setCurrentBooking(res.booking);
      setStep(3);
    } else {
      setPaymentStatusState(PAYMENT_STATUS.FAILED);
    }
  };

  const handleCopy = (text, fieldName) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    addToast(`Đã sao chép ${fieldName === 'acc' ? 'số tài khoản' : 'nội dung chuyển khoản'}!`, 'success');
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleResetModal = () => {
    setStep(1);
    setIsVerifying(false);
    setPaymentStatusState(PAYMENT_STATUS.PENDING);
    setCurrentBooking(null);
    setErrors({});
    onClose();
  };

  const handlePrintETicket = (ticket) => {
    if (!ticket) return;
    const isFree = (ticket.totalPrice || 0) === 0;
    const isCounter = ticket.paymentStatus === 'Chờ thanh toán tại quầy' || ticket.paymentMethod === 'Thanh toán tại quầy';
    const ticketHtml = `
      <div style="border: 2px dashed #5C2C16; padding: 20px; border-radius: 12px; max-width: 500px; margin: 0 auto; background: #FFFDF9; font-family: sans-serif;">
        <div style="text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">
          <h2 style="color: #5C2C16; margin: 0;">BẢO TÀNG QUỐC GIA VIỆT NAM</h2>
          <p style="color: #C5A059; margin: 5px 0 0 0; font-size: 13px; font-weight: bold;">${isCounter ? 'PHIẾU ĐẶT VÉ THANH TOÁN TẠI QUẦY' : 'VÉ THAM QUAN ĐIỆN TỬ'}</p>
        </div>
        <table style="width: 100%; border: none; font-size: 13px; border-collapse: collapse;">
          <tr><td style="padding: 4px 0;"><strong>Mã đơn / Mã vé:</strong></td><td style="color: #5C2C16; font-weight: bold;">${ticket.orderCode || ticket.ticketCode}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Họ tên:</strong></td><td>${ticket.name}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Loại vé:</strong></td><td>${ticket.ticketType}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Số lượng:</strong></td><td>${ticket.quantity || 1} vé</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Tổng tiền:</strong></td><td style="color: #C5A059; font-weight: bold;">${isFree ? 'MIỄN PHÍ (0 VNĐ)' : formatCurrency(ticket.totalPrice)}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Phương thức thanh toán:</strong></td><td>${ticket.paymentMethod}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Ngày tham quan:</strong></td><td>${ticket.visitDate}</td></tr>
          <tr><td style="padding: 4px 0;"><strong>Trạng thái:</strong></td><td style="color: ${isCounter ? 'orange' : 'green'}; font-weight: bold;">${isFree ? 'VÉ MIỄN PHÍ' : isCounter ? 'CHỜ THANH TOÁN TẠI QUẦY' : 'ĐÃ THANH TOÁN'}</td></tr>
        </table>
        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
          ${isCounter ? `
            <p style="font-size: 12px; color: #B45309; font-weight: bold; margin: 0;">VUI LÒNG XUẤT TRÌNH MÃ ĐƠN NÀY TẠI QUẦY VÉ BẢO TÀNG ĐỂ THANH TOÁN & NHẬN QR THAM QUAN</p>
          ` : `
            <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(ticket.qrCode || ticket.ticketCode)}" alt="QR Code" width="150"/>
            <p style="font-size: 11px; color: #666; margin-top: 8px; font-weight: bold;">Quét mã QR tại cổng soát vé tự động để vào tham quan bảo tàng</p>
          `}
        </div>
      </div>
    `;
    exportToPDF(`Dat_ve_${ticket.orderCode || ticket.ticketCode}`, ticketHtml);
  };

  const paymentQRUrl = currentBooking && currentBooking.totalPrice > 0
    ? generatePaymentQRUrl({
        amount: totalPrice,
        transferContent: currentBooking.orderCode || currentBooking.ticketCode,
      })
    : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetModal}
      title={
        step === 1
          ? `🎫 Đặt Vé Tham Quan: ${formData.ticketType}`
          : step === 2
          ? '💳 Xác Nhận & Thanh Toán Mã QR'
          : isFreeTicket || currentBooking?.totalPrice === 0
          ? '🎉 Kết Quả Đặt Vé Miễn Phí'
          : currentBooking?.paymentStatus === 'Chờ thanh toán tại quầy'
          ? '🏛️ Xác Nhận Đặt Vé Thanh Toán Tại Quầy'
          : '🎉 Kết Quả Thanh Toán & Vé Điện Tử'
      }
      maxWidth="max-w-xl"
    >
      <div className="space-y-5 text-xs font-sans">
        {/* Step Progress Bar */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className={`flex items-center gap-1.5 font-bold ${step >= 1 ? 'text-museum-brown' : 'text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-museum-gold text-white flex items-center justify-center text-[10px]">1</span>
            <span>Chọn vé</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-1.5 font-bold ${step >= 2 ? 'text-museum-brown' : 'text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-museum-gold text-white flex items-center justify-center text-[10px]">2</span>
            <span>{isFreeTicket ? 'Xác nhận vé' : formData.paymentOption === 'COUNTER' ? 'Xác nhận đơn' : 'Thanh toán QR'}</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-1.5 font-bold ${step === 3 ? 'text-museum-brown' : 'text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-museum-gold text-white flex items-center justify-center text-[10px]">3</span>
            <span>{formData.paymentOption === 'COUNTER' ? 'Mã đơn quầy vé' : 'Vé điện tử QR'}</span>
          </div>
        </div>

        {/* STEP 1: Ticket Selection & Details Form */}
        {step === 1 && (
          <form onSubmit={handleProceedToConfirmation} className="space-y-4">
            {!isAuthenticated && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Yêu cầu đăng nhập tài khoản trước khi hoàn tất thủ tục đặt vé.</span>
              </div>
            )}

            {/* Ticket Type selector */}
            <div>
              <label className="block font-bold text-museum-brown mb-1">Loại vé tham quan</label>
              <select
                value={formData.ticketType}
                onChange={(e) => {
                  const selected = tickets.find((t) => t.name === e.target.value);
                  const p = selected ? Number(selected.price) : e.target.value.includes('Miễn phí') ? 0 : 50000;
                  setFormData({
                    ...formData,
                    ticketType: e.target.value,
                    price: p,
                  });
                }}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold font-bold text-museum-brown"
              >
                {tickets.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} — {t.price === 0 ? 'MIỄN PHÍ (0 VNĐ)' : formatCurrency(t.price)}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity & Dynamic Price Calculation */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-museum-brown mb-1">
                  Số lượng vé <span className="text-danger">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="50"
                  value={formData.quantity}
                  onChange={(e) =>
                    setFormData({ ...formData, quantity: Math.max(1, parseInt(e.target.value) || 1) })
                  }
                  className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold font-bold"
                />
                {errors.quantity && <p className="text-[11px] text-danger mt-1">{errors.quantity}</p>}
              </div>

              <div>
                <label className="block font-bold text-museum-brown mb-1">Tổng tiền tính động</label>
                {isFreeTicket ? (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-xl font-black text-sm text-emerald-700 flex items-center justify-between shadow-xs">
                    <span>0 VNĐ</span>
                    <span className="text-[10px] bg-emerald-600 text-white px-2 py-0.5 rounded-md font-bold uppercase tracking-wider">
                      MIỄN PHÍ
                    </span>
                  </div>
                ) : (
                  <div className="p-2.5 bg-museum-cream border border-museum-gold/40 rounded-xl font-black text-sm text-museum-gold">
                    {formatCurrency(totalPrice)}
                  </div>
                )}
              </div>
            </div>

            {/* Visitor Details */}
            <div>
              <label className="block font-bold text-museum-brown mb-1">
                Họ tên người nhận vé <span className="text-danger">*</span>
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Nguyễn Văn A"
                className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold ${
                  errors.name ? 'border-danger bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.name && <p className="text-[11px] text-danger mt-1">{errors.name}</p>}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block font-bold text-museum-brown mb-1">
                  Số điện thoại <span className="text-danger">*</span>
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="0912 345 678"
                  className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold ${
                    errors.phone ? 'border-danger bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.phone && <p className="text-[11px] text-danger mt-1">{errors.phone}</p>}
              </div>

              <div>
                <label className="block font-bold text-museum-brown mb-1">
                  Email nhận vé điện tử <span className="text-danger">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="email@example.com"
                  className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold ${
                    errors.email ? 'border-danger bg-red-50' : 'border-gray-200'
                  }`}
                />
                {errors.email && <p className="text-[11px] text-danger mt-1">{errors.email}</p>}
              </div>
            </div>

            {/* Visit date */}
            <div>
              <label className="block font-bold text-museum-brown mb-1">
                Ngày tham quan dự kiến <span className="text-danger">*</span>
              </label>
              <input
                type="date"
                min={todayStr}
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold ${
                  errors.visitDate ? 'border-danger bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.visitDate && <p className="text-[11px] text-danger mt-1">{errors.visitDate}</p>}
            </div>

            {/* PAYMENT METHOD SELECTION (Only displayed if totalPrice > 0) */}
            {!isFreeTicket && (
              <div>
                <label className="block font-bold text-museum-brown mb-1.5">
                  Phương thức thanh toán <span className="text-danger">*</span>
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option 1: Online QR Payment */}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, paymentOption: 'ONLINE_QR', paymentMethod: 'QR thanh toán' })
                    }
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                      formData.paymentOption === 'ONLINE_QR'
                        ? 'border-museum-gold bg-museum-cream/80 text-museum-brown shadow-sm ring-2 ring-museum-gold/30'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-xs flex items-center gap-1.5 text-museum-brown">
                        <QrCode className="w-4 h-4 text-museum-gold shrink-0" />
                        <span>Thanh toán trực tuyến bằng QR</span>
                      </span>
                      {formData.paymentOption === 'ONLINE_QR' && (
                        <CheckCircle2 className="w-4 h-4 text-museum-gold shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                      Quét mã QR bằng ứng dụng ngân hàng (VietQR / VNPay)
                    </p>
                    <span className="mt-2 text-[10px] bg-museum-brown/10 text-museum-brown font-bold px-2 py-0.5 rounded-md inline-block w-fit">
                      📱 Nhận vé điện tử ngay
                    </span>
                  </button>

                  {/* Option 2: Counter Payment */}
                  <button
                    type="button"
                    onClick={() =>
                      setFormData({ ...formData, paymentOption: 'COUNTER', paymentMethod: 'Thanh toán tại quầy' })
                    }
                    className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex flex-col justify-between relative overflow-hidden ${
                      formData.paymentOption === 'COUNTER'
                        ? 'border-museum-gold bg-museum-cream/80 text-museum-brown shadow-sm ring-2 ring-museum-gold/30'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-extrabold text-xs flex items-center gap-1.5 text-museum-brown">
                        <Building2 className="w-4 h-4 text-museum-gold shrink-0" />
                        <span>Thanh toán tại quầy</span>
                      </span>
                      {formData.paymentOption === 'COUNTER' && (
                        <CheckCircle2 className="w-4 h-4 text-museum-gold shrink-0" />
                      )}
                    </div>
                    <p className="text-[11px] text-gray-500 font-medium leading-relaxed">
                      Thanh toán trực tiếp tại quầy vé của bảo tàng khi đến
                    </p>
                    <span className="mt-2 text-[10px] bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded-md inline-block w-fit">
                      🏛️ Nhận vé sau khi thu tiền
                    </span>
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              className={`w-full py-3 text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md text-sm flex items-center justify-center gap-2 ${
                isFreeTicket
                  ? 'bg-emerald-600 hover:bg-emerald-700'
                  : formData.paymentOption === 'COUNTER'
                  ? 'bg-amber-700 hover:bg-amber-800'
                  : 'bg-museum-brown hover:bg-museum-brown-dk'
              }`}
            >
              {isFreeTicket ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-100" />
                  <span>Xác nhận & Nhận vé điện tử (0 VNĐ)</span>
                </>
              ) : formData.paymentOption === 'COUNTER' ? (
                <>
                  <Building2 className="w-4 h-4 text-amber-200" />
                  <span>Xác nhận & Đặt vé thanh toán tại quầy ({formatCurrency(totalPrice)})</span>
                </>
              ) : (
                <>
                  <span>Xác nhận đơn hàng & Tạo mã QR Thanh toán</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        )}

        {/* STEP 2: Real Online Payment QR Display (Only when ONLINE_QR option selected) */}
        {step === 2 && currentBooking && currentBooking.totalPrice > 0 && formData.paymentOption === 'ONLINE_QR' && (
          <div className="space-y-4">
            {/* Order Summary Header */}
            <div className="p-3.5 bg-museum-ivory rounded-2xl border border-museum-gold/30 space-y-2">
              <div className="flex items-center justify-between border-b border-museum-gold/20 pb-1.5">
                <h4 className="font-extrabold text-museum-brown text-xs flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-museum-gold" />
                  <span>ĐƠN ĐẶT VÉ: {currentBooking.orderCode || currentBooking.ticketCode}</span>
                </h4>
                {/* Payment Status Badge */}
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    paymentStatusState === PAYMENT_STATUS.PENDING
                      ? 'bg-amber-100 text-amber-800 border border-amber-300'
                      : paymentStatusState === PAYMENT_STATUS.CHECKING
                      ? 'bg-blue-100 text-blue-800 border border-blue-300 animate-pulse'
                      : paymentStatusState === PAYMENT_STATUS.SUCCESS
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-red-100 text-red-800 border border-red-300'
                  }`}
                >
                  {paymentStatusState}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px]">
                <div>
                  <span className="text-gray-500">Khách hàng:</span> <strong>{formData.name}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Số lượng:</span> <strong>{formData.quantity} vé ({formData.ticketType})</strong>
                </div>
                <div>
                  <span className="text-gray-500">Ngày tham quan:</span> <strong className="text-emerald-700">{formData.visitDate}</strong>
                </div>
                <div>
                  <span className="text-gray-500">Tổng thanh toán:</span>{' '}
                  <strong className="text-museum-gold text-xs font-black">{formatCurrency(totalPrice)}</strong>
                </div>
              </div>
            </div>

            {/* PAYMENT QR CODE DISPLAY CONTAINER */}
            <div className="bg-white border-2 border-museum-gold/40 rounded-2xl p-4 shadow-md text-center space-y-3 relative overflow-hidden">
              <div className="bg-museum-cream/80 py-1.5 px-3 rounded-xl font-bold text-museum-brown text-xs inline-flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-museum-gold" />
                <span>QUÉT MÃ QR ĐỂ THANH TOÁN (VIETQR / VNPAY)</span>
              </div>

              {/* REAL PAYMENT QR CODE IMAGE */}
              <div className="flex justify-center my-1 relative">
                {isVerifying ? (
                  <div className="w-48 h-48 bg-gray-50 rounded-2xl border flex flex-col items-center justify-center space-y-2 animate-pulse">
                    <RefreshCw className="w-8 h-8 text-museum-gold animate-spin" />
                    <span className="text-[11px] font-bold text-museum-brown">Đang kiểm tra giao dịch...</span>
                    <span className="text-[10px] text-gray-500">Vui lòng chờ trong giây lát</span>
                  </div>
                ) : (
                  <div className="p-2 bg-white rounded-2xl border border-gray-200 shadow-sm relative group">
                    <img
                      src={paymentQRUrl}
                      alt="Mã QR Thanh Toán Ngân Hàng"
                      className="w-48 h-48 object-contain rounded-xl"
                      onError={(e) => {
                        e.target.onerror = null;
                        e.target.style.display = 'none';
                      }}
                    />
                    <div className="text-[10px] text-gray-400 mt-1">Mở app Ngân hàng để quét QR</div>
                  </div>
                )}
              </div>

              {/* BANK ACCOUNT DETAILS */}
              <div className="bg-museum-ivory p-3.5 rounded-xl border border-museum-gold/20 text-left space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Ngân hàng:</span>
                  <strong className="text-museum-brown font-bold">{paymentConfig.bankId} (MBBank)</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <strong className="font-mono font-bold text-museum-brown text-sm">{paymentConfig.accountNo}</strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(paymentConfig.accountNo, 'acc')}
                      className="p-1 text-museum-brown hover:text-museum-gold hover:bg-white rounded-md border border-gray-200 transition-colors cursor-pointer"
                      title="Sao chép số tài khoản"
                    >
                      {copiedField === 'acc' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Chủ tài khoản:</span>
                  <strong className="font-bold text-museum-brown uppercase">{paymentConfig.accountName}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-gray-500">Số tiền:</span>
                  <strong className="font-extrabold text-museum-gold text-sm">{formatCurrency(totalPrice)}</strong>
                </div>

                <div className="flex items-center justify-between pt-1 border-t border-museum-gold/20">
                  <span className="text-gray-500">Nội dung chuyển khoản:</span>
                  <div className="flex items-center gap-2">
                    <strong className="font-mono font-black text-emerald-800 text-xs bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      {currentBooking.orderCode || currentBooking.ticketCode}
                    </strong>
                    <button
                      type="button"
                      onClick={() => handleCopy(currentBooking.orderCode || currentBooking.ticketCode, 'memo')}
                      className="p-1 text-museum-brown hover:text-museum-gold hover:bg-white rounded-md border border-gray-200 transition-colors cursor-pointer"
                      title="Sao chép nội dung chuyển khoản"
                    >
                      {copiedField === 'memo' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons for Copying */}
              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleCopy(paymentConfig.accountNo, 'acc')}
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-600" />
                  <span>Sao chép STK</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleCopy(currentBooking.orderCode || currentBooking.ticketCode, 'memo')}
                  className="py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold rounded-xl transition-colors flex items-center justify-center gap-1.5 cursor-pointer text-[11px]"
                >
                  <Copy className="w-3.5 h-3.5 text-gray-600" />
                  <span>Sao chép Nội dung</span>
                </button>
              </div>
            </div>

            {/* Error simulation banner if failed */}
            {paymentStatusState === PAYMENT_STATUS.FAILED && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
                  <span>Thanh toán chưa được ghi nhận! Vui lòng hoàn tất chuyển khoản và thử lại.</span>
                </div>
                <button
                  onClick={() => handleConfirmPaid(false)}
                  className="px-3 py-1 bg-red-600 text-white font-bold rounded-lg hover:bg-red-700 text-xs shrink-0 cursor-pointer"
                >
                  Kiểm tra lại
                </button>
              </div>
            )}

            {/* Action footer */}
            <div className="flex items-center gap-2 pt-2">
              <button
                type="button"
                disabled={isVerifying}
                onClick={() => setStep(1)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                &larr; Quay lại
              </button>

              <button
                type="button"
                disabled={isVerifying}
                onClick={() => handleConfirmPaid(false)}
                className="flex-1 py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer text-xs"
              >
                {isVerifying ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin text-museum-gold" />
                    <span>Đang kiểm tra thanh toán với Ngân hàng...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-museum-gold" />
                    <span>Tôi đã thanh toán ({formatCurrency(totalPrice)})</span>
                  </>
                )}
              </button>

              <button
                type="button"
                disabled={isVerifying}
                onClick={() => handleConfirmPaid(true)}
                className="px-2 py-3 bg-gray-200 hover:bg-red-100 text-gray-500 hover:text-red-700 text-[10px] font-semibold rounded-xl"
                title="Giả lập tình huống lỗi ngân hàng"
              >
                Thử Giả Lập Lỗi
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Final Result Display (Ticket QR / Counter Order Notice / Free Ticket) */}
        {step === 3 && currentBooking && (
          <div className="space-y-4 text-center py-2">
            {currentBooking.paymentStatus === 'Chờ thanh toán tại quầy' || currentBooking.paymentMethod === 'Thanh toán tại quầy' ? (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-lg font-extrabold text-museum-brown uppercase tracking-wide">
                    Đặt vé thành công!
                  </h3>
                  <p className="text-xs text-amber-900 font-medium mt-1.5 bg-amber-50 p-3 rounded-xl border border-amber-300 shadow-2xs">
                    📍 <strong>Thông báo:</strong> Vui lòng cung cấp mã đặt vé cho nhân viên tại quầy và thanh toán khi đến bảo tàng.
                  </p>
                </div>

                {/* COUNTER ORDER DETAILS CARD */}
                <div className="bg-museum-ivory border-2 border-museum-gold/40 p-4 rounded-2xl flex flex-col items-center justify-center space-y-3 shadow-xs text-xs text-gray-800">
                  <div className="w-full bg-white rounded-xl p-4 border border-museum-gold/30 space-y-2.5 text-left font-medium">
                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-gray-500 font-bold">Phương thức thanh toán:</span>
                      <strong className="text-museum-brown font-extrabold text-xs bg-museum-cream px-2.5 py-1 rounded-lg border border-museum-gold/30">
                        Thanh toán tại quầy
                      </strong>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-gray-500 font-bold">Tổng tiền:</span>
                      <strong className="text-museum-gold font-black text-sm">
                        {formatCurrency(currentBooking.totalPrice)}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center pb-2 border-b border-gray-100">
                      <span className="text-gray-500 font-bold">Mã đặt vé:</span>
                      <strong className="font-mono text-museum-brown font-black text-sm bg-gray-50 px-2.5 py-1 rounded-lg border border-gray-200">
                        {currentBooking.orderCode || currentBooking.ticketCode}
                      </strong>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-gray-500 font-bold">Trạng thái:</span>
                      <span className="font-bold text-amber-800 bg-amber-100 border border-amber-300 px-3 py-1 rounded-full text-xs">
                        ⏳ Chờ thanh toán tại quầy
                      </span>
                    </div>
                  </div>

                  {/* QR Code Identification for Counter Ticket */}
                  <div className="pt-2 border-t border-museum-gold/20 flex flex-col items-center space-y-1 w-full">
                    <div className="text-[10px] font-bold text-museum-gold uppercase tracking-wider">
                      MÃ QR XÁC ĐỊNH ĐƠN ĐẶT VÉ
                    </div>
                    <QRCode value={currentBooking.qrCode || currentBooking.orderCode} size={140} />
                    <p className="text-[10px] text-gray-500 mt-1">
                      Mã QR xác định đơn vé (Sẽ được kích hoạt soát vé sau khi nhân viên thu tiền tại quầy)
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>

                <div>
                  <h3 className="text-base font-extrabold text-museum-brown">
                    {currentBooking.totalPrice === 0 ? 'ĐẶT VÉ MIỄN PHÍ THÀNH CÔNG!' : 'ĐẶT VÉ THÀNH CÔNG!'}
                  </h3>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {currentBooking.totalPrice === 0
                      ? `Vé điện tử miễn phí kèm mã QR đã được tạo thành công và gửi tới ${currentBooking.email}.`
                      : `Vé điện tử kèm mã QR soát vé đã được lưu vào hệ thống và gửi tới ${currentBooking.email}.`}
                  </p>
                </div>

                {/* E-TICKET QR CODE CARD */}
                <div className="bg-museum-ivory border-2 border-museum-gold/40 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2 shadow-xs">
                  <div className="text-[10px] font-bold text-museum-gold uppercase tracking-wider">
                    MÃ QR VÉ THAM QUAN BẢO TÀNG (GATE ENTRY)
                  </div>
                  <QRCode value={currentBooking.qrCode || currentBooking.ticketCode} size={160} />
                  <div className="text-xs font-bold text-museum-brown">
                    Mã vé: <span className="text-museum-gold font-mono">{currentBooking.ticketCode}</span>
                  </div>
                  <div className="text-[11px] text-gray-600 font-medium">
                    {currentBooking.ticketType} ({currentBooking.quantity} vé) — Ngày: {currentBooking.visitDate}
                  </div>
                  <div className="text-[10px] text-amber-800 bg-amber-50 px-3 py-1 rounded-full font-bold border border-amber-300">
                    {currentBooking.totalPrice === 0
                      ? '✓ Trạng thái: VÉ MIỄN PHÍ (Hợp lệ khi soát vé tại cổng)'
                      : '⏳ Trạng thái: CHỜ THANH TOÁN'}
                  </div>
                  {currentBooking.totalPrice > 0 && (
                    <p className="text-[11px] text-amber-900 font-medium leading-tight bg-amber-50/90 p-2.5 rounded-xl border border-amber-200 text-center w-full mt-1">
                      📍 <strong>Lưu ý:</strong> Vui lòng mang vé điện tử này đến quầy vé của bảo tàng để thanh toán
                    </p>
                  )}
                </div>
              </>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  navigate('/my-tickets');
                }}
                className="px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Xem trong "Vé của tôi" &rarr;
              </button>

              <button
                onClick={() => handlePrintETicket(currentBooking)}
                className="px-4 py-2.5 bg-museum-gold hover:bg-museum-gold-lt text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Tải vé/phiếu PDF</span>
              </button>

              <button
                onClick={handleResetModal}
                className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};
