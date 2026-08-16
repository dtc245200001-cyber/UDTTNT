import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { formatCurrency } from '@/utils/formatters';
import { Ticket, CreditCard, ShieldCheck, CheckCircle2, AlertCircle, RefreshCw, Mail, Calendar, User, Phone, QrCode } from 'lucide-react';
import { QRCode } from '@/components/ui/QRCode';

export const TicketBookingModal = ({ isOpen, onClose, selectedTicket }) => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, bookTicket, tickets, addToast } = useApp();

  // Step 1: Form, Step 2: Confirmation & Payment, Step 3: Result (Success/Failure)
  const [step, setStep] = useState(1);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    ticketType: selectedTicket?.name || 'Vé Người lớn',
    price: selectedTicket?.price || 50000,
    quantity: 1,
    visitDate: '',
    paymentMethod: 'VNPay',
  });

  const [errors, setErrors] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentResult, setPaymentResult] = useState(null); // 'success' | 'failure' | null
  const [createdBooking, setCreatedBooking] = useState(null);

  // Sync when selectedTicket changes or modal opens
  useEffect(() => {
    if (selectedTicket) {
      setFormData((prev) => ({
        ...prev,
        ticketType: selectedTicket.name,
        price: selectedTicket.price,
      }));
    }
    if (currentUser) {
      setFormData((prev) => ({
        ...prev,
        name: currentUser.name || prev.name,
        email: currentUser.email || prev.email,
      }));
    }
  }, [selectedTicket, currentUser, isOpen]);

  const unitPrice = formData.price || 50000;
  const totalPrice = unitPrice * (formData.quantity || 1);

  const validateStep1 = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập họ tên người nhận vé.';
    if (!formData.phone.trim()) newErrors.phone = 'Vui lòng nhập số điện thoại liên hệ.';
    if (!formData.email.trim() || !/\S+@\S+\.\S+/.test(formData.email.trim())) {
      newErrors.email = 'Vui lòng nhập email hợp lệ nhận vé điện tử.';
    }
    if (!formData.visitDate) newErrors.visitDate = 'Vui lòng chọn ngày tham quan dự kiến.';
    if ((formData.quantity || 0) < 1) newErrors.quantity = 'Số lượng vé tối thiểu là 1.';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToConfirmation = (e) => {
    e.preventDefault();
    if (!isAuthenticated) {
      addToast('Bạn cần đăng nhập tài khoản để thực hiện đặt vé!', 'error');
      onClose();
      navigate('/login?redirect=/my-tickets');
      return;
    }

    if (validateStep1()) {
      setStep(2);
    }
  };

  const handleExecutePayment = (simulateFailure = false) => {
    setIsProcessing(true);
    setPaymentResult(null);

    setTimeout(() => {
      setIsProcessing(false);
      if (simulateFailure) {
        setPaymentResult('failure');
        addToast('Thanh toán thất bại: Giao dịch bị hủy hoặc tài khoản không đủ cân đối!', 'error');
      } else {
        const res = bookTicket({
          name: formData.name,
          phone: formData.phone,
          email: formData.email,
          ticketType: formData.ticketType,
          price: unitPrice,
          quantity: formData.quantity,
          visitDate: formData.visitDate,
          paymentMethod: formData.paymentMethod,
          status: 'Đã thanh toán',
        });
        setCreatedBooking(res.booking);
        setPaymentResult('success');
        setStep(3);
      }
    }, 1500);
  };

  const handleResetModal = () => {
    setStep(1);
    setIsProcessing(false);
    setPaymentResult(null);
    setCreatedBooking(null);
    setErrors({});
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleResetModal}
      title={
        step === 1
          ? `🎫 Đặt Vé Tham Quan: ${formData.ticketType}`
          : step === 2
          ? '💳 Xác Nhận & Thanh Toán'
          : '🎉 Kết Quả Thanh Toán Vé'
      }
      maxWidth="max-w-lg"
    >
      <div className="space-y-5 text-xs font-sans">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-gray-100 pb-3">
          <div className={`flex items-center gap-1.5 font-bold ${step >= 1 ? 'text-museum-brown' : 'text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-museum-gold text-white flex items-center justify-center text-[10px]">1</span>
            <span>Thông tin vé</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-1.5 font-bold ${step >= 2 ? 'text-museum-brown' : 'text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-museum-gold text-white flex items-center justify-center text-[10px]">2</span>
            <span>Thanh toán</span>
          </div>
          <div className="w-8 h-0.5 bg-gray-200" />
          <div className={`flex items-center gap-1.5 font-bold ${step === 3 ? 'text-museum-brown' : 'text-gray-400'}`}>
            <span className="w-5 h-5 rounded-full bg-museum-gold text-white flex items-center justify-center text-[10px]">3</span>
            <span>Vé điện tử QR</span>
          </div>
        </div>

        {/* STEP 1: Form Selection */}
        {step === 1 && (
          <form onSubmit={handleProceedToConfirmation} className="space-y-4">
            {!isAuthenticated && (
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Yêu cầu đăng nhập trước khi hoàn tất thủ tục đặt vé.</span>
              </div>
            )}

            {/* Ticket Type selector */}
            <div>
              <label className="block font-bold text-museum-brown mb-1">Loại vé tham quan</label>
              <select
                value={formData.ticketType}
                onChange={(e) => {
                  const selected = tickets.find((t) => t.name === e.target.value);
                  setFormData({
                    ...formData,
                    ticketType: e.target.value,
                    price: selected ? selected.price : formData.price,
                  });
                }}
                className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold font-bold text-museum-brown"
              >
                {tickets.map((t) => (
                  <option key={t.id} value={t.name}>
                    {t.name} — {formatCurrency(t.price)}
                  </option>
                ))}
              </select>
            </div>

            {/* Quantity & Auto calculation */}
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
                <label className="block font-bold text-museum-brown mb-1">Tổng tiền tính tự động</label>
                <div className="p-2.5 bg-museum-cream border border-museum-gold/40 rounded-xl font-black text-sm text-museum-gold">
                  {formatCurrency(totalPrice)}
                </div>
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
                min={new Date().toISOString().split('T')[0]}
                value={formData.visitDate}
                onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
                className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold ${
                  errors.visitDate ? 'border-danger bg-red-50' : 'border-gray-200'
                }`}
              />
              {errors.visitDate && <p className="text-[11px] text-danger mt-1">{errors.visitDate}</p>}
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold rounded-xl transition-colors cursor-pointer shadow-md text-sm"
            >
              Tiếp tục: Xác nhận đơn & Thanh toán &rarr;
            </button>
          </form>
        )}

        {/* STEP 2: Confirmation & Payment Gateway Selection */}
        {step === 2 && (
          <div className="space-y-4">
            <div className="p-4 bg-museum-ivory rounded-2xl border border-museum-gold/30 space-y-2">
              <h4 className="font-bold text-museum-brown text-sm border-b border-museum-gold/20 pb-1">
                📋 TỔNG QUAN ĐƠN ĐẶT VÉ
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-gray-500 block text-[10px]">Loại vé:</span>
                  <strong className="text-museum-brown">{formData.ticketType}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Số lượng & Đơn giá:</span>
                  <strong>{formData.quantity} vé × {formatCurrency(unitPrice)}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Ngày tham quan:</span>
                  <strong className="text-emerald-700">{formData.visitDate}</strong>
                </div>
                <div>
                  <span className="text-gray-500 block text-[10px]">Người nhận vé:</span>
                  <strong>{formData.name} ({formData.phone})</strong>
                </div>
              </div>
              <div className="pt-2 border-t border-museum-gold/20 flex justify-between items-center font-black text-sm">
                <span className="text-museum-brown">TỔNG THANH TOÁN:</span>
                <span className="text-museum-gold text-base">{formatCurrency(totalPrice)}</span>
              </div>
            </div>

            {/* Payment Gateway Options */}
            <div>
              <label className="block font-bold text-museum-brown mb-2">
                Chọn Cổng Thanh Toán Trực Tuyến:
              </label>
              <div className="grid grid-cols-3 gap-2">
                {['VNPay', 'MoMo', 'Stripe'].map((method) => (
                  <button
                    key={method}
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentMethod: method })}
                    className={`p-3 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                      formData.paymentMethod === method
                        ? 'border-museum-brown bg-museum-cream text-museum-brown shadow-xs'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    {method === 'VNPay' && '🔴 VNPay'}
                    {method === 'MoMo' && '💗 Ví MoMo'}
                    {method === 'Stripe' && '💳 Thẻ Stripe'}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulation Options for Payment Failure handling */}
            {paymentResult === 'failure' && (
              <div className="p-3 bg-red-50 border border-red-200 text-danger rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 shrink-0" />
                  <span>Thanh toán thất bại! Vui lòng kiểm tra lại tài khoản hoặc thử lại.</span>
                </div>
                <button
                  onClick={() => handleExecutePayment(false)}
                  className="px-3 py-1 bg-danger text-white font-bold rounded-lg hover:bg-red-700 text-xs shrink-0 cursor-pointer"
                >
                  Thử lại
                </button>
              </div>
            )}

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="px-4 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                &larr; Quay lại
              </button>

              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleExecutePayment(false)}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-colors shadow-md flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang kết nối cổng {formData.paymentMethod}...</span>
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4 text-emerald-200" />
                    <span>Xác nhận Thanh toán ({formatCurrency(totalPrice)})</span>
                  </>
                )}
              </button>

              {/* Demo test button to simulate failure */}
              <button
                type="button"
                disabled={isProcessing}
                onClick={() => handleExecutePayment(true)}
                className="px-2 py-3 bg-gray-200 hover:bg-red-100 text-gray-600 hover:text-danger text-[10px] font-semibold rounded-xl"
                title="Giả lập tình huống thanh toán thất bại"
              >
                Giả lập Lỗi
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Success Result & E-Ticket QR Code */}
        {step === 3 && createdBooking && (
          <div className="space-y-4 text-center py-2">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div>
              <h3 className="text-base font-extrabold text-museum-brown">THANH TOÁN THÀNH CÔNG!</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Vé điện tử kèm mã QR đã được khởi tạo và gửi tới email <strong>{createdBooking.email}</strong>.
              </p>
            </div>

            {/* Generated QR Code Card */}
            <div className="bg-museum-ivory border border-museum-gold/30 p-4 rounded-2xl flex flex-col items-center justify-center space-y-2">
              <QRCode value={createdBooking.qrCode} size={130} />
              <div className="text-xs font-bold text-museum-brown">
                Mã vé: <span className="text-museum-gold font-mono">{createdBooking.ticketCode}</span>
              </div>
              <div className="text-[11px] text-gray-500">
                {createdBooking.ticketType} ({createdBooking.quantity} vé) — Ngày: {createdBooking.visitDate}
              </div>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => {
                  onClose();
                  navigate('/my-tickets');
                }}
                className="px-6 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Xem trong "Vé của tôi" &rarr;
              </button>

              <button
                onClick={handleResetModal}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
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
