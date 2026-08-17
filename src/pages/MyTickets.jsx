import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  Ticket,
  Calendar,
  User,
  Phone,
  Mail,
  Printer,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  CreditCard,
  QrCode as QrIcon,
  ShieldCheck,
} from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { QRCode } from '@/components/ui/QRCode';
import { exportToPDF } from '@/utils/exportHelpers';

export const MyTickets = () => {
  const { currentUser, isAuthenticated, bookedTickets, resendTicketEmail } = useApp();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4 font-sans animate-fadeIn">
        <div className="w-16 h-16 bg-amber-50 text-museum-gold rounded-full flex items-center justify-center mx-auto text-2xl shadow-xs">
          <Ticket className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-museum-brown">VUI LÒNG ĐĂNG NHẬP</h2>
        <p className="text-sm text-gray-500 max-w-md mx-auto">
          Bạn cần đăng nhập tài khoản khách để xem danh sách vé điện tử đã mua và mã QR tham quan.
        </p>
        <button
          onClick={() => navigate('/login?redirect=/my-tickets')}
          className="px-6 py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors"
        >
          Đăng nhập ngay
        </button>
      </div>
    );
  }

  // Filter tickets belonging to logged-in user
  const userTickets = (bookedTickets || []).filter(
    (b) =>
      !currentUser ||
      !b.email ||
      (b.userEmail && b.userEmail.toLowerCase() === currentUser.email?.toLowerCase()) ||
      (b.email && b.email.toLowerCase() === currentUser.email?.toLowerCase()) ||
      b.userId === currentUser.id
  );

  const handlePrintTicket = (ticket) => {
    const ticketHtml = `
      <div style="border: 2px dashed #5C2C16; padding: 24px; border-radius: 16px; max-width: 500px; margin: 0 auto; background: #FFFDF9; font-family: sans-serif;">
        <div style="text-align: center; border-bottom: 1px solid #E5D5C0; padding-bottom: 12px; margin-bottom: 16px;">
          <h2 style="color: #5C2C16; margin: 0; font-size: 20px;">BẢO TÀNG QUỐC GIA VIỆT NAM</h2>
          <p style="color: #C5A059; margin: 4px 0 0 0; font-size: 13px; font-weight: bold; tracking-wide;">VÉ THAM QUAN ĐIỆN TỬ CHÍNH THỨC</p>
        </div>
        <table style="width: 100%; border: none; font-size: 13px; line-height: 1.6;">
          <tr><td><strong>Mã vé:</strong></td><td style="color: #5C2C16; font-weight: bold; font-family: monospace;">${ticket.ticketCode}</td></tr>
          <tr><td><strong>Mã đơn hàng:</strong></td><td style="font-family: monospace;">${ticket.orderCode || ticket.ticketCode}</td></tr>
          <tr><td><strong>Họ tên người nhận:</strong></td><td>${ticket.name}</td></tr>
          <tr><td><strong>Loại vé:</strong></td><td>${ticket.ticketType}</td></tr>
          <tr><td><strong>Số lượng:</strong></td><td>${ticket.quantity || 1} vé</td></tr>
          <tr><td><strong>Tổng thanh toán:</strong></td><td style="color: #C5A059; font-weight: bold;">${formatCurrency(ticket.totalPrice || (ticket.price * (ticket.quantity || 1)))}</td></tr>
          <tr><td><strong>Ngày tham quan:</strong></td><td style="color: #047857; font-weight: bold;">${ticket.visitDate}</td></tr>
          <tr><td><strong>Trạng thái:</strong></td><td style="color: #047857; font-weight: bold;">✓ ${ticket.status || ticket.paymentStatus || 'Đã thanh toán'}</td></tr>
        </table>
        <div style="text-align: center; margin-top: 20px; padding-top: 16px; border-top: 1px solid #E5D5C0;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=${encodeURIComponent(ticket.qrCode || ticket.ticketCode)}" alt="QR Code" width="180" height="180" style="border-radius: 12px; border: 1px solid #E5D5C0; background: #fff; padding: 8px;"/>
          <p style="font-size: 12px; color: #5C2C16; font-weight: bold; margin-top: 10px; margin-bottom: 2px;">QR VÉ VÀO CỔNG BẢO TÀNG</p>
          <p style="font-size: 11px; color: #78716C; margin: 0;">Đưa mã QR này cho nhân viên soát vé khi vào tham quan</p>
        </div>
      </div>
    `;
    exportToPDF(`Ve_dientu_${ticket.ticketCode}`, ticketHtml);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 font-sans animate-fadeIn">
      {/* Header Breadcrumb & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <button
            onClick={() => navigate('/')}
            className="text-xs text-museum-brown hover:text-museum-gold font-semibold flex items-center gap-1 mb-2 cursor-pointer transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Trang chủ
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-museum-brown tracking-tight flex items-center gap-2">
            <Ticket className="w-7 h-7 text-museum-gold" />
            VÉ THAM QUAN CỦA TÔI
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Quản lý danh sách vé điện tử đã đặt & mã QR check-in chính thức tại cổng bảo tàng.
          </p>
        </div>

        <button
          onClick={() => navigate('/#tickets')}
          className="px-5 py-2.5 bg-museum-gold hover:bg-museum-gold-lt text-white font-bold text-xs rounded-xl shadow-md transition-colors w-fit cursor-pointer flex items-center gap-1.5"
        >
          <Ticket className="w-4 h-4" />
          <span>+ Đặt thêm vé mới</span>
        </button>
      </div>

      {/* Ticket List / Empty state */}
      {userTickets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-4">
          <div className="w-20 h-20 bg-museum-cream rounded-2xl flex items-center justify-center text-museum-brown mx-auto">
            <Ticket className="w-10 h-10 text-museum-gold" />
          </div>
          <h3 className="text-lg font-bold text-museum-brown">Bạn chưa có vé điện tử nào</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Hãy đặt vé trực tuyến ngay để trải nghiệm quy trình tham quan nhanh chóng, không phải chờ đợi tại quầy vé!
          </p>
          <button
            onClick={() => navigate('/#tickets')}
            className="px-6 py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
          >
            Đặt vé tham quan ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userTickets.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-3xl border border-museum-gold/30 shadow-md hover:shadow-xl transition-all duration-300 overflow-hidden flex flex-col justify-between relative group"
            >
              {/* Header Bar: Order Code & Status */}
              <div className="bg-museum-brown text-white px-5 py-3.5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-museum-gold" />
                  <span className="font-extrabold text-sm tracking-wider font-mono">
                    {t.orderCode || t.ticketCode}
                  </span>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-[11px] font-bold shadow-xs flex items-center gap-1 ${
                    t.status === 'Đã thanh toán' || t.paymentStatus === 'Đã thanh toán' || t.status === 'Đã xác nhận'
                      ? 'bg-emerald-500 text-white'
                      : t.status === 'Chờ thanh toán tại quầy' || t.paymentStatus === 'Chờ thanh toán tại quầy'
                      ? 'bg-amber-600 text-white'
                      : t.status === 'Đang kiểm tra thanh toán' || t.paymentStatus === 'Đang kiểm tra thanh toán'
                      ? 'bg-blue-500 text-white animate-pulse'
                      : t.status === 'Thanh toán thất bại'
                      ? 'bg-red-500 text-white'
                      : 'bg-amber-500 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>{t.status || t.paymentStatus || 'Đã thanh toán'}</span>
                </span>
              </div>

              {/* Main Ticket Card Content: Left Details & Right QR Card */}
              <div className="p-5 flex-1 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-stretch">
                  {/* Left Column: Ticket Details */}
                  <div className="sm:col-span-6 space-y-3 text-xs flex flex-col justify-between border-b sm:border-b-0 sm:border-r border-museum-gold/20 pb-4 sm:pb-0 sm:pr-3">
                    <div>
                      <span className="text-[10px] text-gray-400 font-bold block uppercase tracking-wider mb-0.5">
                        Loại vé tham quan
                      </span>
                      <strong className="text-sm font-extrabold text-museum-brown block">
                        {t.ticketType}
                      </strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1 border-t border-gray-100">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Số lượng</span>
                        <span className="font-bold text-gray-800 text-xs">{t.quantity || 1} vé</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Tổng thanh toán</span>
                        <span className="font-extrabold text-museum-gold text-xs">
                          {formatCurrency(t.totalPrice || (t.price * (t.quantity || 1)))}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1 border-t border-gray-100">
                      <span className="text-[10px] text-gray-400 block">Ngày tham quan dự kiến</span>
                      <span className="font-bold text-emerald-700 flex items-center gap-1 mt-0.5 text-xs">
                        <Calendar className="w-3.5 h-3.5" />
                        {t.visitDate}
                      </span>
                    </div>

                    <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-600 space-y-1">
                      <div>
                        <span className="text-gray-400">Người nhận:</span>{' '}
                        <strong className="text-museum-brown">{t.name}</strong>
                      </div>
                      <div className="truncate">
                        <span className="text-gray-400">Email:</span> {t.email}
                      </div>
                      <div>
                        <span className="text-gray-400">Thanh toán:</span>{' '}
                        <span className="font-bold text-museum-brown">{t.paymentMethod || 'VNPay / VietQR'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: E-TICKET DEDICATED QR CARD OR COUNTER NOTICE */}
                  <div className="sm:col-span-6 flex flex-col items-center justify-center">
                    {t.paymentMethod === 'counter' || t.payment_method === 'counter' || t.status === 'Chờ thanh toán tại quầy' || t.paymentStatus === 'pending' || t.paymentStatus === 'Chờ thanh toán tại quầy' ? (
                      <div className="w-full bg-amber-50 border-2 border-amber-300 rounded-2xl p-4 shadow-sm text-center space-y-2.5">
                        <div className="bg-amber-600 text-white text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                          <Ticket className="w-3 h-3 text-amber-100" />
                          <span>⏳ CHƯA THANH TOÁN – VUI LÒNG THANH TOÁN TẠI QUẦY KHI ĐẾN BẢO TÀNG</span>
                        </div>

                        {/* Counter QR Code */}
                        <div className="flex justify-center my-1 bg-white p-2 rounded-2xl border border-amber-200 shadow-2xs">
                          <QRCode
                            value={t.qrCode || JSON.stringify({ order_code: t.orderCode || t.ticketCode, sig: t.qrSignature || '' })}
                            size={150}
                            className="bg-white"
                          />
                        </div>

                        <div className="space-y-1">
                          <span className="text-[10px] text-amber-900 font-bold uppercase tracking-wider block">
                            MÃ ĐƠN HÀNG: <strong className="font-mono text-museum-brown text-sm">{t.orderCode || t.ticketCode}</strong>
                          </span>
                        </div>

                        <p className="text-[10px] text-amber-800 font-medium leading-tight bg-white/90 p-2 rounded-xl border border-amber-200 text-left">
                          📍 <strong>Ghi chú:</strong> Vé có hiệu lực đến hết ngày <strong>{t.visitDate}</strong>. Vui lòng xuất trình mã QR này và họ tên người nhận vé tại quầy.
                        </p>
                      </div>
                    ) : (
                      <div className="w-full bg-museum-ivory border-2 border-museum-gold/40 rounded-2xl p-4 shadow-sm hover:shadow-md transition-all duration-300 text-center space-y-2.5 group/qr hover:-translate-y-1">
                        {/* E-Ticket Header Badge */}
                        <div className="bg-museum-brown text-museum-gold text-[10px] font-bold px-3 py-1 rounded-full uppercase tracking-wider inline-flex items-center gap-1 shadow-2xs">
                          <Ticket className="w-3 h-3 text-museum-gold" />
                          <span>🎫 VÉ ĐIỆN TỬ BẢO TÀNG - ĐÃ THANH TOÁN</span>
                        </div>

                        {/* QR Code Container */}
                        <div className="flex justify-center my-1">
                          <QRCode
                            value={t.qrCode || t.ticketCode}
                            size={160}
                            className="shadow-xs bg-white"
                          />
                        </div>

                        {/* Clean QR Information Below Image */}
                        <div className="space-y-1 pt-1 border-t border-museum-gold/20">
                          <div className="text-xs font-black text-museum-brown uppercase tracking-wide flex items-center justify-center gap-1">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                            <span>QR VÉ VÀO CỔNG</span>
                          </div>
                          <p className="text-[10px] text-gray-500 leading-tight">
                            Đưa mã QR này cho nhân viên để quét khi vào bảo tàng.
                          </p>
                        </div>

                        {/* Concise Ticket Info List */}
                        <div className="bg-white/80 rounded-xl p-2 border border-museum-gold/20 text-[10px] space-y-0.5 text-left font-medium text-gray-700">
                          <div className="flex justify-between">
                            <span className="text-gray-400">Mã vé:</span>
                            <span className="font-mono font-bold text-museum-brown">{t.ticketCode}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Trạng thái:</span>
                            <span className="font-bold text-emerald-700">✓ {t.status || 'Đã thanh toán'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-gray-400">Ngày đi:</span>
                            <span className="font-bold text-gray-800">{t.visitDate}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="px-5 py-3.5 bg-gray-50 border-t border-gray-100 flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="text-[11px] text-gray-400 font-medium">
                  Ngày đặt: {t.createdAt}
                </span>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => resendTicketEmail(t.orderCode || t.ticketCode)}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 hover:shadow-md"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Gửi lại vé qua email</span>
                  </button>

                  <button
                    onClick={() => handlePrintTicket(t)}
                    className="px-4 py-2 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center gap-1.5 hover:shadow-md"
                  >
                    <Printer className="w-3.5 h-3.5 text-museum-gold" />
                    <span>In / Tải vé PDF</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
