import React from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Ticket, Calendar, Clock, MapPin, User, Phone, Mail, ArrowLeft, Download } from 'lucide-react';
import { formatCurrency, formatDate } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';
import { QRCodeSVG } from 'qrcode.react';

export const MyTickets = () => {
  const { bookedTickets, currentUser } = useApp();

  // Filter tickets by current user or show all booked tickets in session
  const userTickets = (bookedTickets || []).filter(
    (t) =>
      !currentUser ||
      !t.email ||
      t.email.toLowerCase() === currentUser.email?.toLowerCase() ||
      t.userId === currentUser.id
  );

  return (
    <div className="min-h-screen bg-museum-ivory py-10 px-4 sm:px-6 lg:px-8 font-sans animate-fadeIn">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-museum-brown hover:text-museum-gold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại trang chủ</span>
          </Link>
          <div className="text-xs font-semibold text-gray-500">
            Xin chào, <strong className="text-museum-brown">{currentUser?.name || 'Quý khách'}</strong>
          </div>
        </div>

        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-museum-brown tracking-tight flex items-center gap-2.5">
            <Ticket className="w-7 h-7 text-museum-gold" />
            <span>VÉ THAM QUAN CỦA TÔI</span>
          </h1>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Danh sách vé điện tử đã đặt trực tuyến. Vui lòng xuất trình mã QR tại quầy soát vé khi đến tham quan.
          </p>
        </div>

        {/* Tickets List */}
        {userTickets.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs space-y-4">
            <div className="w-16 h-16 rounded-3xl bg-museum-cream flex items-center justify-center text-museum-gold text-2xl mx-auto shadow-xs">
              🎫
            </div>
            <h3 className="font-extrabold text-lg text-museum-brown">Chưa có vé nào được đặt</h3>
            <p className="text-xs sm:text-sm text-gray-500 max-w-md mx-auto">
              Bạn chưa có lịch sử đặt vé tham quan nào. Hãy chọn loại vé và ngày tham quan phù hợp để khám phá bảo tàng ngay hôm nay!
            </p>
            <Link
              to="/#tickets"
              className="inline-flex items-center gap-2 px-6 py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors"
            >
              <Ticket className="w-4 h-4" />
              <span>Đặt vé tham quan ngay</span>
            </Link>
          </div>
        ) : (
          <div className="space-y-6">
            {userTickets.map((ticket) => (
              <div
                key={ticket.id || ticket.ticketCode}
                className="bg-white rounded-3xl border border-museum-gold/30 shadow-md overflow-hidden flex flex-col md:flex-row hover:shadow-lg transition-all"
              >
                {/* Left Ticket Details */}
                <div className="flex-1 p-6 space-y-4">
                  <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-gray-400">Mã vé:</span>
                      <span className="font-black text-sm text-museum-brown tracking-wider bg-museum-cream px-2.5 py-0.5 rounded-lg border border-museum-gold/30">
                        {ticket.ticketCode || ticket.id}
                      </span>
                    </div>
                    <Badge variant="emerald">{ticket.status || 'Đã xác nhận'}</Badge>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-lg font-black text-museum-brown">{ticket.ticketType || 'Vé tham quan'}</h3>
                    <p className="text-xs text-gray-500">Bảo tàng Lịch sử Quốc gia Việt Nam</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs text-gray-600 bg-museum-ivory/50 p-4 rounded-2xl border border-gray-100">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-museum-gold shrink-0" />
                      <span>Người nhận: <strong>{ticket.name}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar className="w-4 h-4 text-museum-gold shrink-0" />
                      <span>Ngày tham quan: <strong>{ticket.visitDate}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-museum-gold shrink-0" />
                      <span>SĐT: {ticket.phone || 'N/A'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4 text-museum-gold shrink-0" />
                      <span className="truncate">Email: {ticket.email || 'N/A'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <div className="text-xs text-gray-500">
                      Số lượng: <strong className="text-museum-brown">{ticket.quantity || 1} vé</strong> · {ticket.paymentMethod || 'Thanh toán tại quầy'}
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-gray-400 font-medium">Tổng tiền</div>
                      <div className="text-lg font-black text-museum-gold">
                        {formatCurrency((ticket.price || 50000) * (ticket.quantity || 1))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Right QR Code Stub */}
                <div className="bg-museum-cream/60 p-6 md:w-56 flex flex-col items-center justify-center text-center border-t md:border-t-0 md:border-l border-dashed border-museum-gold/50 space-y-3">
                  <div className="bg-white p-3 rounded-2xl shadow-xs border border-gray-200">
                    <QRCodeSVG
                      value={`MUSEUM-TICKET:${ticket.ticketCode || ticket.id}|DATE:${ticket.visitDate}|USER:${ticket.name}`}
                      size={110}
                      level="M"
                      includeMargin={false}
                    />
                  </div>
                  <div className="text-[11px] font-bold text-museum-brown tracking-wider">
                    MÃ QR CHECK-IN
                  </div>
                  <div className="text-[10px] text-gray-400">
                    Quét tại cửa soát vé
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
