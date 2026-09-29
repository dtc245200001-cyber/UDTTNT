import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/utils/formatters';
import { TicketBookingModal } from '@/components/tickets/TicketBookingModal';
import {
  Ticket, Clock, MapPin, Calendar, Users, Star,
  Landmark, ChevronRight, CheckCircle, Info, ShieldCheck, Phone, Mail
} from 'lucide-react';

// ─── Thông tin chung của bảo tàng ────────────────────────────────────────────
const MUSEUM_INFO = [
  { icon: Clock, label: 'Giờ mở cửa', value: 'Thứ 3 – Chủ nhật: 8:00 – 17:00' },
  { icon: Calendar, label: 'Ngày đóng cửa', value: 'Thứ Hai & các ngày lễ lớn' },
  { icon: MapPin, label: 'Địa chỉ', value: '1 Tràng Tiền, Hoàn Kiếm, Hà Nội' },
  { icon: Phone, label: 'Điện thoại', value: '(024) 3825 2853' },
  { icon: Mail, label: 'Email', value: 'btqgvn@gmail.com' },
];

const BENEFITS = [
  'Tham quan toàn bộ 4 khu trưng bày thường xuyên',
  'Xem các hiện vật lịch sử độc đáo hàng nghìn năm',
  'Trải nghiệm không gian văn hóa dân tộc Việt Nam',
  'Hỗ trợ thuyết minh theo yêu cầu (đặt trước)',
  'Chụp ảnh, quay phim trong khuôn viên bảo tàng',
];

export const VisitorTickets = () => {
  const { tickets } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  // Chỉ hiện vé đang bán (active)
  const activeTickets = (tickets || []).filter((t) => t.active !== false);

  const handleBookTicket = (ticket = null) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans">

      {/* ── Hero Banner ─────────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-museum-brown via-[#3d1f0d] to-[#1a0a04] text-white">
        {/* Decorative overlay */}
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554907984-15263bfd63bd?w=1600&q=80')] bg-cover bg-center opacity-10" />
        <div className="absolute inset-0 bg-gradient-to-r from-museum-brown/90 via-museum-brown/70 to-transparent" />

        <div className="relative max-w-6xl mx-auto px-6 py-16 md:py-24">
          <div className="max-w-2xl">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-amber-300/70 text-sm mb-6">
              <Link to="/" className="hover:text-museum-gold transition-colors">Trang chủ</Link>
              <ChevronRight className="w-4 h-4" />
              <span className="text-museum-gold font-semibold">Vé tham quan</span>
            </nav>

            <div className="inline-flex items-center gap-2 bg-museum-gold/20 border border-museum-gold/40 rounded-full px-4 py-1.5 text-museum-gold text-xs font-bold uppercase tracking-widest mb-5">
              <Ticket className="w-3.5 h-3.5" />
              <span>Đặt vé trực tuyến</span>
            </div>

            <h1 className="text-3xl md:text-5xl font-black tracking-tight leading-tight mb-5">
              VÉ THAM QUAN<br />
              <span className="text-museum-gold">BẢO TÀNG QUỐC GIA</span>
            </h1>

            <p className="text-amber-100/80 text-base md:text-lg leading-relaxed mb-8 max-w-xl">
              Khám phá kho tàng di sản văn hóa hàng nghìn năm của dân tộc Việt Nam.
              Đặt vé trực tuyến — thanh toán nhanh qua QR, nhận vé điện tử ngay lập tức.
            </p>

            <div className="flex flex-wrap gap-4">
              <button
                onClick={() => handleBookTicket()}
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-museum-gold hover:bg-amber-500 text-white font-bold text-sm rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
              >
                <Ticket className="w-5 h-5" />
                Đặt vé ngay
              </button>
              <Link
                to="/my-tickets"
                className="inline-flex items-center gap-2 px-6 py-3.5 bg-white/10 hover:bg-white/20 border border-white/30 text-white font-bold text-sm rounded-2xl transition-all duration-200"
              >
                <CheckCircle className="w-5 h-5 text-museum-gold" />
                Xem vé đã đặt
              </Link>
            </div>
          </div>
        </div>

        {/* Decorative bottom curve */}
        <div className="absolute bottom-0 left-0 right-0 h-10 bg-[#faf8f5] rounded-t-[3rem]" />
      </section>

      {/* ── Thông tin bảo tàng ───────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 -mt-2 pb-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {MUSEUM_INFO.map(({ icon: Icon, label, value }) => (
            <div key={label} className="bg-white rounded-2xl p-4 shadow-sm border border-amber-900/8 flex flex-col gap-2">
              <div className="w-8 h-8 rounded-xl bg-museum-cream flex items-center justify-center">
                <Icon className="w-4 h-4 text-museum-gold" />
              </div>
              <div>
                <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{label}</div>
                <div className="text-[11px] font-semibold text-museum-brown leading-snug mt-0.5">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── Danh sách loại vé ────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">CÁC LOẠI VÉ THAM QUAN</h2>
            <p className="text-stone-500 text-sm mt-1">Chọn loại vé phù hợp và đặt ngay trong vài phút</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-4 py-1.5 text-xs font-bold">
            <ShieldCheck className="w-3.5 h-3.5" />
            Thanh toán an toàn
          </div>
        </div>

        {activeTickets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-3xl border border-amber-900/8">
            <Ticket className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">Hiện chưa có loại vé nào đang bán.</p>
            <p className="text-stone-400 text-sm mt-1">Vui lòng quay lại sau hoặc liên hệ bảo tàng trực tiếp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {activeTickets.map((ticket, i) => (
              <TicketCard
                key={ticket.id}
                ticket={ticket}
                index={i}
                onBook={() => handleBookTicket(ticket)}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Quyền lợi khi mua vé ─────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-10">
        <div className="bg-gradient-to-br from-museum-brown/5 to-museum-gold/5 border border-museum-gold/20 rounded-3xl p-8 md:p-10">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <h3 className="text-xl font-extrabold text-museum-brown mb-5 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-museum-gold" />
                Quyền lợi khi mua vé
              </h3>
              <ul className="space-y-3">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-stone-700 text-sm">
                    <span className="w-5 h-5 rounded-full bg-museum-gold/20 border border-museum-gold/40 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-3 h-3 text-museum-gold" />
                    </span>
                    {b}
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-1">
              <h3 className="text-xl font-extrabold text-museum-brown mb-5 flex items-center gap-2">
                <Info className="w-5 h-5 text-museum-gold" />
                Lưu ý khi tham quan
              </h3>
              <ul className="space-y-3 text-stone-700 text-sm">
                {[
                  'Trẻ em dưới 6 tuổi và người cao tuổi trên 75 tuổi miễn phí',
                  'Mang theo vé điện tử (QR code) khi đến cổng vào',
                  'Không hút thuốc, không mang đồ ăn vào khu trưng bày',
                  'Giữ yên lặng và tuân thủ hướng dẫn của nhân viên',
                  'Liên hệ trước để đặt dịch vụ thuyết minh theo nhóm',
                ].map((note) => (
                  <li key={note} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-museum-gold shrink-0 mt-1.5" />
                    {note}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA bottom ───────────────────────────────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pb-16">
        <div className="bg-gradient-to-r from-museum-brown to-[#3d1f0d] rounded-3xl p-8 md:p-10 text-white text-center relative overflow-hidden">
          <div className="absolute inset-0 opacity-5">
            <Landmark className="absolute top-4 right-8 w-32 h-32 text-museum-gold" />
          </div>
          <div className="relative">
            <h3 className="text-2xl md:text-3xl font-extrabold mb-3">
              Sẵn sàng khám phá di sản?
            </h3>
            <p className="text-amber-200/80 mb-7 max-w-lg mx-auto text-sm md:text-base">
              Đặt vé ngay hôm nay, thanh toán qua QR nhanh chóng,
              nhận vé điện tử tức thì — không cần xếp hàng tại quầy!
            </p>
            <button
              onClick={() => handleBookTicket()}
              className="inline-flex items-center gap-2 px-8 py-4 bg-museum-gold hover:bg-amber-500 text-white font-bold text-base rounded-2xl shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5"
            >
              <Ticket className="w-5 h-5" />
              Đặt vé tham quan ngay
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </section>

      {/* ── Booking Modal ─────────────────────────────────────────────────────── */}
      <TicketBookingModal
        isOpen={isModalOpen}
        onClose={() => { setIsModalOpen(false); setSelectedTicket(null); }}
        selectedTicket={selectedTicket}
      />
    </div>
  );
};

// ─── Component card loại vé ───────────────────────────────────────────────────
const CARD_COLORS = [
  { bg: 'from-museum-brown to-[#3d1f0d]', badge: 'bg-museum-gold/20 text-museum-gold border-museum-gold/30' },
  { bg: 'from-amber-700 to-amber-900', badge: 'bg-amber-100 text-amber-800 border-amber-300' },
  { bg: 'from-stone-700 to-stone-900', badge: 'bg-stone-100 text-stone-700 border-stone-300' },
];

const TicketCard = ({ ticket, index, onBook }) => {
  const color = CARD_COLORS[index % CARD_COLORS.length];

  return (
    <div className="group bg-white rounded-3xl shadow-sm border border-amber-900/8 overflow-hidden hover:shadow-lg transition-all duration-300 hover:-translate-y-1 flex flex-col">
      {/* Card header */}
      <div className={`bg-gradient-to-br ${color.bg} p-6 relative overflow-hidden`}>
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5" />
        <div className="absolute -right-2 -bottom-4 w-16 h-16 rounded-full bg-white/5" />
        <div className="relative">
          <div className="flex items-start justify-between gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <Ticket className="w-5 h-5 text-white" />
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${color.badge}`}>
              Đang bán
            </span>
          </div>
          <h3 className="font-extrabold text-lg text-white mt-3 leading-tight">{ticket.name}</h3>
          <p className="text-white/65 text-xs mt-1 line-clamp-2">{ticket.description || 'Vé tham quan tiêu chuẩn toàn khu trưng bày'}</p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Price */}
        <div className="flex items-end gap-2">
          <span className="text-3xl font-extrabold text-museum-gold leading-none">
            {formatCurrency(ticket.price)}
          </span>
          <span className="text-stone-400 text-sm pb-0.5">/ vé</span>
        </div>

        {/* Mini features */}
        <ul className="space-y-1.5">
          {[
            'Vào tất cả khu trưng bày',
            'Có hiệu lực trong ngày',
            'Nhận vé điện tử qua email',
          ].map((feat) => (
            <li key={feat} className="flex items-center gap-2 text-xs text-stone-600">
              <CheckCircle className="w-3.5 h-3.5 text-museum-gold flex-none" />
              {feat}
            </li>
          ))}
        </ul>

        {/* CTA */}
        <button
          onClick={onBook}
          className="mt-auto w-full py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl transition-all duration-200 hover:shadow-md flex items-center justify-center gap-2 group-hover:-translate-y-0.5"
        >
          <Ticket className="w-4 h-4" />
          Đặt vé này
        </button>
      </div>
    </div>
  );
};
