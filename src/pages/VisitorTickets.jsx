import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/utils/formatters';
import { TicketBookingModal } from '@/components/tickets/TicketBookingModal';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import {
  Ticket, Clock, MapPin, Calendar, Users, Star,
  Landmark, ChevronRight, CheckCircle, Info, ShieldCheck, Phone, Mail, Sparkles
} from 'lucide-react';

// ─── Thông tin chung của bảo tàng ────────────────────────────────────────────
const MUSEUM_INFO = [
  {
    icon: Clock,
    label: 'Giờ mở cửa',
    value: '08:00 – 17:00',
    sub: 'Thứ 3 – Chủ nhật',
    iconColor: 'text-[#8B5A1E]',
  },
  {
    icon: Calendar,
    label: 'Ngày đóng cửa',
    value: 'Thứ Hai hàng tuần',
    sub: '& Các ngày lễ lớn',
    iconColor: 'text-amber-700',
  },
  {
    icon: MapPin,
    label: 'Địa chỉ tham quan',
    value: '1 Tràng Tiền, Hà Nội',
    sub: 'Hoàn Kiếm, Thủ đô',
    iconColor: 'text-[#8B5A1E]',
  },
  {
    icon: Phone,
    label: 'Hotline hỗ trợ',
    value: '(024) 3825 2853',
    sub: 'Tư vấn đặt vé đoàn',
    iconColor: 'text-emerald-700',
  },
  {
    icon: Mail,
    label: 'Email liên hệ',
    value: 'btqgvn@gmail.com',
    sub: 'Hỗ trợ khách 24/7',
    iconColor: 'text-[#8B5A1E]',
  },
];

const BENEFITS = [
  'Tham quan toàn bộ các phòng trưng bày thường xuyên & chuyên đề',
  'Chiêm ngưỡng hiện vật lịch sử và bảo vật quốc gia hàng nghìn năm',
  'Trải nghiệm không gian văn hóa di sản đặc sắc của dân tộc Việt Nam',
  'Hỗ trợ hướng dẫn viên và tai nghe thuyết minh thông minh (đặt trước)',
  'Được phép chụp ảnh lưu niệm trong khuôn viên bảo tàng',
];

export const VisitorTickets = () => {
  const [searchParams] = useSearchParams();
  const { tickets, isAuthenticated, currentUser, addToast } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [restoredFormData, setRestoredFormData] = useState(null);

  // Restore pending ticket checkout after login
  useEffect(() => {
    if (isAuthenticated) {
      const pendingDataStr = localStorage.getItem('pending_ticket_checkout');
      const shouldResume = searchParams.get('resume_booking') === '1' || !!pendingDataStr;
      if (pendingDataStr && shouldResume) {
        try {
          const parsed = JSON.parse(pendingDataStr);
          localStorage.removeItem('pending_ticket_checkout');
          if (parsed.selectedTicket) setSelectedTicket(parsed.selectedTicket);
          if (parsed.formData) {
            setRestoredFormData({
              ...parsed.formData,
              name: currentUser?.name || parsed.formData.name,
              email: currentUser?.email || parsed.formData.email,
              phone: currentUser?.phone || parsed.formData.phone,
            });
          }
          setIsModalOpen(true);
          addToast('Đã khôi phục đơn đặt vé của bạn. Vui lòng xác nhận để hoàn tất đặt vé!', 'success');
        } catch (err) {
          console.error('Failed to parse pending ticket checkout', err);
        }
      }
    }
  }, [isAuthenticated, currentUser, searchParams]);

  // Chỉ hiện vé đang bán (active)
  const activeTickets = (tickets || []).filter((t) => t.active !== false);

  const handleBookTicket = (ticket = null) => {
    setSelectedTicket(ticket);
    setIsModalOpen(true);
  };

  return (
    <div className="min-h-screen bg-[#FBF7F0] font-sans pb-12 relative overflow-hidden animate-fadeIn">

      {/* ── 1. Hero Banner: Thiết kế cao cấp đồng bộ với Chuyên đề & Hiện vật ── */}
      <div className="relative min-h-[220px] md:h-[240px] bg-[#200e05] overflow-hidden select-none flex items-center">
        {/* Right side museum image with glass cabinets & statues */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-[70%] opacity-35 md:opacity-100 pointer-events-none">
          <img
            src="/images/museum-gallery-banner.jpg"
            alt="Vé tham quan Bảo tàng Quốc gia"
            className="w-full h-full object-cover object-center"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 10%, rgba(0,0,0,0.25) 22%, rgba(0,0,0,0.50) 36%, rgba(0,0,0,0.78) 52%, #000 72%)',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 10%, rgba(0,0,0,0.25) 22%, rgba(0,0,0,0.50) 36%, rgba(0,0,0,0.78) 52%, #000 72%)'
            }}
            onError={(e) => { e.target.src = '/images/museum-hero.jpg'; }}
          />
        </div>

        {/* Lớp phủ gradient mềm lên trên ảnh tạo độ tương phản trong suốt cực tốt */}
        <div 
          className="absolute inset-0 pointer-events-none hidden md:block"
          style={{
            background: 'linear-gradient(to right, #200e05 0%, #200e05 35%, rgba(32,14,5,0.85) 44%, rgba(32,14,5,0.60) 54%, rgba(32,14,5,0.30) 66%, rgba(32,14,5,0.10) 78%, transparent 90%)'
          }}
        />

        {/* Content container */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-0 flex flex-col justify-center">
          <div className="max-w-full md:max-w-[65%] relative z-10">
            {/* Breadcrumb: TRANG CHỦ / VÉ THAM QUAN */}
            <div className="relative z-10">
              <Breadcrumb
                items={[
                  { label: 'TRANG CHỦ', path: '/' },
                  { label: 'VÉ THAM QUAN' },
                ]}
                variant="dark"
              />
            </div>

            {/* Title: Serif bold, trắng sáng, sắc nét và dễ nhìn */}
            <h1 
              className="typo-page-title text-white tracking-wide leading-tight relative z-10"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,.45)' }}
            >
              VÉ THAM QUAN BẢO TÀNG
            </h1>

            {/* Description */}
            <p className="typo-body text-[#F5EFE0]/80 line-clamp-2 mt-2 max-w-xl relative z-10">
              Khám phá kho tàng di sản văn hóa hàng nghìn năm của dân tộc. Đặt vé trực tuyến nhanh chóng qua mã QR, nhận vé điện tử tức thì không cần xếp hàng tại quầy.
            </p>

            {/* Action buttons + gold line */}
            <div className="flex flex-wrap items-center gap-3 mt-4 relative z-10">
              <button
                onClick={() => handleBookTicket()}
                className="btn-primary h-11 px-6 typo-btn gap-2 rounded-full shadow-md transition-all duration-200 hover:-translate-y-0.5 cursor-pointer border border-[#D4A359]/40"
              >
                <Ticket className="w-4 h-4 text-amber-200" />
                <span>Đặt vé ngay</span>
              </button>
              <Link
                to="/my-tickets"
                className="h-11 px-6 typo-btn gap-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all duration-200 border border-white/25 backdrop-blur-xs hover:-translate-y-0.5 inline-flex items-center"
              >
                <CheckCircle className="w-4 h-4 text-[#D4A359]" />
                <span>Tra cứu vé đã đặt</span>
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ── 2. Quick-Info Bar: Thông tin bảo tàng thanh lịch, thoáng đãng, dễ đọc ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-5 relative z-10">
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-4 sm:p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 lg:gap-0 lg:divide-x lg:divide-stone-100">
            {MUSEUM_INFO.map(({ icon: Icon, label, value, sub, iconColor }) => (
              <div key={label} className="flex items-center gap-3.5 px-3">
                <div className="w-10 h-10 rounded-xl bg-[#F7F3EE] border border-stone-200/60 flex items-center justify-center shrink-0">
                  <Icon className={`w-5 h-5 ${iconColor}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">{label}</div>
                  <div className="text-xs sm:text-sm font-extrabold text-stone-800 leading-snug truncate" title={value}>{value}</div>
                  <div className="text-[11px] text-stone-500 truncate">{sub}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── 3. Danh sách loại vé tham quan ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-8 relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-serif font-extrabold text-[#200e05] tracking-tight">CÁC LOẠI VÉ THAM QUAN</h2>
            <p className="text-stone-500 text-xs sm:text-sm mt-1">Chọn loại vé phù hợp và tiến hành đặt vé trực tuyến nhanh chóng</p>
          </div>
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 text-emerald-800 border border-emerald-200/70 rounded-full px-4 py-1.5 text-xs font-bold shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Thanh toán QR an toàn
          </div>
        </div>

        {activeTickets.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-2xl border border-stone-200/80 shadow-xs">
            <Ticket className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-700 font-bold">Hiện chưa có loại vé nào đang mở bán.</p>
            <p className="text-stone-400 text-xs sm:text-sm mt-1">Vui lòng quay lại sau hoặc liên hệ bảo tàng để được hỗ trợ.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

      {/* ── 4. Quyền lợi & Lưu ý tham quan ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-8 relative z-10">
        <div className="bg-white rounded-2xl border border-stone-200/80 p-6 sm:p-8 shadow-[0_4px_20px_rgba(0,0,0,0.03)]">
          <div className="flex flex-col md:flex-row gap-8 items-start">
            <div className="flex-1">
              <h3 className="text-lg font-serif font-extrabold text-[#200e05] mb-4 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-[#8B5A1E]" />
                Quyền lợi khi mua vé tham quan
              </h3>
              <ul className="space-y-3">
                {BENEFITS.map((b) => (
                  <li key={b} className="flex items-start gap-2.5 text-stone-700 text-xs sm:text-sm">
                    <span className="w-5 h-5 rounded-full bg-[#F7F3EE] border border-[#8B5A1E]/30 flex items-center justify-center shrink-0 mt-0.5">
                      <CheckCircle className="w-3.5 h-3.5 text-[#8B5A1E]" />
                    </span>
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="flex-1">
              <h3 className="text-lg font-serif font-extrabold text-[#200e05] mb-4 flex items-center gap-2">
                <Info className="w-5 h-5 text-[#8B5A1E]" />
                Lưu ý quan trọng khi tham quan
              </h3>
              <ul className="space-y-3 text-stone-700 text-xs sm:text-sm">
                {[
                  'Miễn phí vé tham quan cho trẻ em dưới 6 tuổi và người cao tuổi từ 75 tuổi trở lên',
                  'Xuất trình vé điện tử có mã QR tại cổng kiểm soát vé để quét vào cửa nhanh',
                  'Không mang chất dễ cháy nổ, đồ ăn nước uống có mùi vào khu vực trưng bày',
                  'Giữ gìn trật tự và tuân thủ các chỉ dẫn của nhân viên và biển báo bảo tàng',
                  'Khách đoàn có nhu cầu hướng dẫn viên vui lòng liên hệ trước ít nhất 24 giờ',
                ].map((note) => (
                  <li key={note} className="flex items-start gap-2.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#8B5A1E] shrink-0 mt-2" />
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── 5. Bottom CTA Banner ── */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 pb-12 relative z-10">
        <div className="bg-gradient-to-r from-[#200e05] via-[#3a1a0c] to-[#200e05] rounded-2xl p-8 sm:p-10 text-white text-center relative overflow-hidden shadow-lg border border-[#D4A359]/20">
          <div className="absolute inset-0 opacity-5 pointer-events-none">
            <Landmark className="absolute top-4 right-8 w-32 h-32 text-[#D4A359]" />
          </div>
          <div className="relative z-10">
            <h3 className="text-2xl md:text-3xl font-serif font-extrabold mb-3">
              Sẵn sàng khám phá tinh hoa di sản dân tộc?
            </h3>
            <p className="text-[#F5EFE0]/80 mb-6 max-w-lg mx-auto text-xs sm:text-sm leading-relaxed">
              Đặt vé trực tuyến tiện lợi, thanh toán qua mã QR bảo mật cao và nhận vé điện tử tức thì — không mất thời gian chờ đợi tại quầy vé!
            </p>
            <button
              onClick={() => handleBookTicket()}
              className="btn-primary inline-flex items-center gap-2 h-12 px-8 typo-btn rounded-full shadow-lg hover:shadow-xl transition-all duration-200 hover:-translate-y-0.5 cursor-pointer border border-[#D4A359]/40"
            >
              <Ticket className="w-4 h-4 text-amber-200" />
              <span>Đặt vé tham quan ngay</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Bottom Quote Banner */}
        <div className="flex items-center justify-center gap-3 pt-10 text-stone-400 text-xs tracking-wider uppercase select-none">
          <div className="h-[1px] w-20 sm:w-36 bg-stone-300" />
          <span>Bảo tồn di sản – Lan tỏa văn hóa dân tộc</span>
          <div className="h-[1px] w-20 sm:w-36 bg-stone-300" />
        </div>
      </section>

      {/* Decorative Lotus Watermark in Bottom Left */}
      <div className="fixed bottom-0 left-0 pointer-events-none opacity-20 z-0 select-none">
        <svg width="220" height="180" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M120 180C120 180 80 120 80 80C80 40 120 10 120 10C120 10 160 40 160 80C160 120 120 180 120 180Z" stroke="#B8860B" strokeWidth="1.5" strokeOpacity="0.5"/>
          <path d="M120 180C120 180 50 140 40 100C30 60 70 30 70 30C70 30 90 70 120 180Z" stroke="#B8860B" strokeWidth="1.2" strokeOpacity="0.4"/>
          <path d="M120 180C120 180 190 140 200 100C210 60 170 30 170 30C170 30 150 70 120 180Z" stroke="#B8860B" strokeWidth="1.2" strokeOpacity="0.4"/>
          <path d="M120 180C120 180 20 160 10 130C0 100 30 80 30 80C30 80 60 110 120 180Z" stroke="#B8860B" strokeWidth="1.2" strokeOpacity="0.3"/>
          <path d="M120 180C120 180 220 160 230 130C240 100 210 80 210 80C210 80 180 110 120 180Z" stroke="#B8860B" strokeWidth="1.2" strokeOpacity="0.3"/>
          <path d="M40 185C80 175 160 175 200 185" stroke="#B8860B" strokeWidth="1.5" strokeOpacity="0.4"/>
        </svg>
      </div>

      {/* Booking Modal */}
      <TicketBookingModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setSelectedTicket(null);
          setRestoredFormData(null);
        }}
        selectedTicket={selectedTicket}
        initialFormData={restoredFormData}
      />
    </div>
  );
};

// ─── Component card loại vé ───────────────────────────────────────────────────
const CARD_THEMES = [
  { headerBg: 'from-[#200e05] to-[#3a1a0c]', badge: 'bg-[#B8860B] text-white' },
  { headerBg: 'from-[#3a1a0c] to-[#5a2e16]', badge: 'bg-[#8B5A1E] text-white' },
  { headerBg: 'from-[#2e231e] to-[#1a1411]', badge: 'bg-stone-700 text-white' },
];

const TicketCard = ({ ticket, index, onBook }) => {
  const theme = CARD_THEMES[index % CARD_THEMES.length];

  return (
    <div className="group bg-white rounded-2xl shadow-xs hover:shadow-lg hover:-translate-y-1 border border-stone-200/80 overflow-hidden transition-all duration-300 flex flex-col">
      {/* Card header */}
      <div className={`bg-gradient-to-br ${theme.headerBg} p-5 relative overflow-hidden`}>
        <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center justify-between gap-3">
            <div className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center border border-white/10">
              <Ticket className="w-4 h-4 text-amber-200" />
            </div>
            <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full ${theme.badge} shadow-xs`}>
              Đang mở bán
            </span>
          </div>
          <h3 className="font-serif font-extrabold text-base sm:text-lg text-white mt-3 leading-snug line-clamp-2 min-h-[2.7em]">{ticket.name}</h3>
          <p className="text-[#F5EFE0]/70 text-xs mt-1 line-clamp-2">{ticket.description || 'Vé tham quan tiêu chuẩn toàn khu trưng bày'}</p>
        </div>
      </div>

      {/* Card body */}
      <div className="p-5 flex flex-col gap-4 flex-1">
        {/* Price */}
        <div className="flex items-baseline gap-1.5 pb-2 border-b border-stone-100">
          <span className="text-2xl sm:text-3xl font-serif font-black text-[#8B5A1E] leading-none">
            {formatCurrency(ticket.price)}
          </span>
          <span className="text-stone-400 text-xs">/ vé tham quan</span>
        </div>

        {/* Mini features */}
        <ul className="space-y-2">
          {[
            'Toàn quyền tham quan các gian trưng bày',
            'Vé điện tử lưu trên hệ thống & gửi về email',
            'Hiệu lực sử dụng trong ngày tham quan',
          ].map((feat) => (
            <li key={feat} className="flex items-center gap-2 text-xs text-stone-600">
              <CheckCircle className="w-3.5 h-3.5 text-[#8B5A1E] shrink-0" />
              <span>{feat}</span>
            </li>
          ))}
        </ul>

        {/* CTA Button */}
        <button
          onClick={onBook}
          className="btn-primary mt-auto w-full h-11 typo-btn rounded-full transition-all duration-200 shadow-xs hover:shadow-md flex items-center justify-center gap-2 cursor-pointer group-hover:-translate-y-0.5"
        >
          <Ticket className="w-4 h-4 text-amber-200" />
          <span>Đặt vé này</span>
        </button>
      </div>
    </div>
  );
};
