import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import { Ticket, Calendar, User, Phone, Mail, QrCode as QrIcon, Printer, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { QRCode } from '@/components/ui/QRCode';
import { exportToPDF } from '@/utils/exportHelpers';

export const MyTickets = () => {
  const { currentUser, isAuthenticated, bookedTickets } = useApp();
  const navigate = useNavigate();
  const [selectedTicketForPrint, setSelectedTicketForPrint] = useState(null);

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
      <div style="border: 2px dashed #5C2C16; padding: 20px; border-radius: 12px; max-width: 500px; margin: 0 auto; background: #FFFDF9;">
        <div style="text-align: center; border-bottom: 1px solid #ddd; padding-bottom: 10px; margin-bottom: 15px;">
          <h2 style="color: #5C2C16; margin: 0;">BẢO TÀNG QUỐC GIA VIỆT NAM</h2>
          <p style="color: #C5A059; margin: 5px 0 0 0; font-size: 13px; font-weight: bold;">VÉ THAM QUAN ĐIỆN TỬ</p>
        </div>
        <table style="width: 100%; border: none; font-size: 13px;">
          <tr><td><strong>Mã vé:</strong></td><td style="color: #5C2C16; font-weight: bold;">${ticket.ticketCode}</td></tr>
          <tr><td><strong>Họ tên:</strong></td><td>${ticket.name}</td></tr>
          <tr><td><strong>Loại vé:</strong></td><td>${ticket.ticketType}</td></tr>
          <tr><td><strong>Số lượng:</strong></td><td>${ticket.quantity || 1} vé</td></tr>
          <tr><td><strong>Tổng tiền:</strong></td><td style="color: #C5A059; font-weight: bold;">${formatCurrency(ticket.totalPrice || ticket.price)}</td></tr>
          <tr><td><strong>Ngày tham quan:</strong></td><td>${ticket.visitDate}</td></tr>
          <tr><td><strong>Trạng thái:</strong></td><td style="color: green; font-weight: bold;">${ticket.status}</td></tr>
        </table>
        <div style="text-align: center; margin-top: 20px; padding-top: 15px; border-top: 1px solid #ddd;">
          <img src="https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(ticket.qrCode || ticket.ticketCode)}" alt="QR Code" width="140"/>
          <p style="font-size: 11px; color: #666; margin-top: 5px;">Quét mã QR tại cổng soát vé tự động để vào cổng</p>
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
            className="text-xs text-museum-brown hover:text-museum-gold font-semibold flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Trang chủ
          </button>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-museum-brown tracking-tight flex items-center gap-2">
            <Ticket className="w-7 h-7 text-museum-gold" />
            VÉ THAM QUAN CỦA TÔI
          </h1>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Quản lý danh sách vé điện tử đã đặt & mã QR check-in tại cổng bảo tàng.
          </p>
        </div>

        <button
          onClick={() => navigate('/#tickets')}
          className="px-5 py-2.5 bg-museum-gold hover:bg-museum-gold-lt text-white font-bold text-xs rounded-xl shadow-md transition-colors w-fit cursor-pointer"
        >
          + Đặt thêm vé mới
        </button>
      </div>

      {/* Ticket List / Empty state */}
      {userTickets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-4">
          <div className="w-20 h-20 bg-museum-cream rounded-2xl flex items-center justify-center text-museum-brown mx-auto">
            <Ticket className="w-10 h-10" />
          </div>
          <h3 className="text-lg font-bold text-museum-brown">Bạn chưa có vé điện tử nào</h3>
          <p className="text-xs text-gray-500 max-w-sm mx-auto">
            Hãy đặt vé trực tuyến ngay để trải nghiệm quy trình tham quan nhanh chóng, không phải chờ đợi tại quầy vé!
          </p>
          <button
            onClick={() => navigate('/#tickets')}
            className="px-6 py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors"
          >
            Đặt vé tham quan ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {userTickets.map((t) => (
            <div
              key={t.id}
              className="bg-white rounded-3xl border border-museum-gold/30 shadow-md hover:shadow-lg transition-all overflow-hidden flex flex-col justify-between relative group"
            >
              {/* Top Accent Bar */}
              <div className="bg-museum-brown text-white p-4 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Ticket className="w-5 h-5 text-museum-gold-lt" />
                  <span className="font-extrabold text-sm tracking-wider">{t.ticketCode}</span>
                </div>
                <Badge variant="emerald" className="bg-emerald-500 text-white font-bold text-[10px]">
                  ✓ {t.status}
                </Badge>
              </div>

              {/* Main Ticket Body */}
              <div className="p-5 space-y-4 flex-1">
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
                  <div className="sm:col-span-7 space-y-2 text-xs">
                    <div>
                      <span className="text-[11px] text-gray-400 font-semibold block uppercase">Loại vé</span>
                      <strong className="text-sm font-bold text-museum-brown">{t.ticketType}</strong>
                    </div>

                    <div className="grid grid-cols-2 gap-2 pt-1">
                      <div>
                        <span className="text-[10px] text-gray-400 block">Số lượng</span>
                        <span className="font-bold text-gray-800">{t.quantity || 1} vé</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-gray-400 block">Tổng tiền</span>
                        <span className="font-bold text-museum-gold">
                          {formatCurrency(t.totalPrice || t.price)}
                        </span>
                      </div>
                    </div>

                    <div className="pt-1">
                      <span className="text-[10px] text-gray-400 block">Ngày tham quan dự kiến</span>
                      <span className="font-semibold text-emerald-700 flex items-center gap-1 mt-0.5">
                        <Calendar className="w-3.5 h-3.5" />
                        {t.visitDate}
                      </span>
                    </div>

                    <div className="pt-1 border-t border-gray-100 text-[11px] text-gray-500 space-y-0.5">
                      <div>Người nhận: <strong>{t.name}</strong></div>
                      <div>Email: {t.email}</div>
                      <div>Thanh toán: <span className="font-semibold text-museum-brown">{t.paymentMethod || 'Tại quầy'}</span></div>
                    </div>
                  </div>

                  {/* QR Code Section */}
                  <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-museum-ivory/60 rounded-2xl border border-museum-cream text-center">
                    <QRCode value={t.qrCode || t.ticketCode} size={110} />
                    <span className="text-[10px] text-gray-500 font-medium mt-1.5 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Mã QR hợp lệ
                    </span>
                  </div>
                </div>
              </div>

              {/* Bottom Action Footer */}
              <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] text-gray-400">
                  Ngày đặt: {t.createdAt}
                </span>
                <button
                  onClick={() => handlePrintTicket(t)}
                  className="px-4 py-1.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5 text-museum-gold-lt" />
                  <span>In / Tải vé PDF</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
