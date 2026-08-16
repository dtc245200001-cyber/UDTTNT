import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  Ticket,
  Calendar,
  MapPin,
  ChevronRight,
  Bot,
  Star,
  Clock,
  ArrowRight,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatCurrency } from '@/utils/formatters';

import { EventRegistrationModal } from '@/components/events/EventRegistrationModal';
import { ArtifactDetailModal } from '@/components/artifacts/ArtifactDetailModal';
import { ArtifactCard } from '@/components/cards/ArtifactCard';

export const VisitorHome = () => {
  const navigate = useNavigate();
  const { artifacts, exhibitions, events, tickets, categories, addToast, isAuthenticated, currentUser, registerForEvent, bookTicket } = useApp();
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [pendingAuthTicket, setPendingAuthTicket] = useState(null);
  const [pendingAuthEvent, setPendingAuthEvent] = useState(null);
  const [activeRegisterEvent, setActiveRegisterEvent] = useState(null);
  const [selectedArtifact, setSelectedArtifact] = useState(null);

  const [bookingFormData, setBookingFormData] = useState({
    name: '',
    phone: '',
    email: '',
    visitDate: '',
  });
  const [bookingErrors, setBookingErrors] = useState({});

  // Auto pre-fill user info if logged in or check pending ticket booking
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setBookingFormData((prev) => ({
        ...prev,
        name: currentUser.name || '',
        email: currentUser.email || '',
        phone: currentUser.phone || prev.phone || '',
        visitDate: prev.visitDate || new Date().toISOString().split('T')[0],
      }));
    }
  }, [isAuthenticated, currentUser]);

  const handleEventRegistration = (ev) => {
    setActiveRegisterEvent(ev);
  };

  const featuredArtifacts = artifacts.slice(0, 6);
  const activeExhibitions = exhibitions;

  const handleBookTicket = (ticket) => {
    if (!isAuthenticated) {
      setPendingAuthTicket(ticket);
      return;
    }

    setSelectedTicket(ticket);
    setBookingFormData({
      name: currentUser?.name || '',
      phone: currentUser?.phone || '',
      email: currentUser?.email || '',
      visitDate: new Date().toISOString().split('T')[0],
    });
    setBookingErrors({});
    setTicketModalOpen(true);
  };

  const validateBooking = () => {
    const errors = {};
    if (!bookingFormData.name.trim()) {
      errors.name = 'Vui lòng nhập họ tên người nhận vé.';
    }
    if (!bookingFormData.phone.trim()) {
      errors.phone = 'Vui lòng nhập số điện thoại liên hệ.';
    }
    if (!bookingFormData.email.trim() || !/\S+@\S+\.\S+/.test(bookingFormData.email.trim())) {
      errors.email = 'Vui lòng nhập email hợp lệ.';
    }
    if (!bookingFormData.visitDate) {
      errors.visitDate = 'Vui lòng chọn ngày tham quan dự kiến.';
    }
    setBookingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const confirmBooking = async (e) => {
    e.preventDefault();
    if (!validateBooking()) return;

    await bookTicket({
      name: bookingFormData.name,
      phone: bookingFormData.phone,
      email: bookingFormData.email,
      visitDate: bookingFormData.visitDate,
      ticketType: selectedTicket?.name,
      price: selectedTicket?.price,
    });

    setTicketModalOpen(false);
    setBookingFormData({ name: '', phone: '', email: '', visitDate: '' });
    setBookingErrors({});
    navigate('/my-tickets');
  };

  return (
    <div className="space-y-16 pb-16 animate-fadeIn">
      {/* Hero Section */}
      <section id="hero" className="relative h-[480px] sm:h-[560px] flex items-center justify-center overflow-hidden">
        <img
          src="/images/museum-hero.jpg"
          alt="Bảo tàng Việt Nam Hero"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/40" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center text-white space-y-6">
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight uppercase drop-shadow-md">
            KHÁM PHÁ BẢO VẬT & <br />
            <span className="text-museum-gold-lt">DI SẢN VĂN HÓA VIỆT NAM</span>
          </h1>

          <p className="text-sm sm:text-lg text-museum-cream/90 max-w-2xl mx-auto leading-relaxed font-normal">
            Hành trình kết nối lịch sử hàng nghìn năm từ thời kỳ Đông Sơn, các triều đại Lý, Trần, Lê, Nguyễn đến tinh hoa di sản đương đại.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <button
              onClick={() => navigate('/artifacts')}
              className="w-full sm:w-auto px-8 py-3.5 bg-museum-gold hover:bg-museum-gold-lt text-white font-extrabold text-sm rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              Khám phá toàn bộ 270 hiện vật &rarr;
            </button>
            <a
              href="#tickets"
              className="w-full sm:w-auto px-8 py-3.5 bg-white/10 hover:bg-white/20 text-white border border-white/30 font-extrabold text-sm rounded-xl backdrop-blur-sm transition-all"
            >
              <Ticket className="w-4 h-4 inline mr-2" />
              Đặt vé tham quan
            </a>
          </div>
        </div>
      </section>

      {/* Section 1: Hiện vật nổi bật */}
      <section id="artifacts" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <span className="text-xs font-bold uppercase tracking-widest text-museum-gold">
              BỘ SƯU TẬP QUỐC GIA
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-museum-brown mt-1">
              HIỆN VẬT TIÊU BIỂU
            </h2>
            <p className="text-xs sm:text-sm text-gray-500 max-w-xl mt-1">
              Các bảo vật quốc gia mang giá trị lịch sử và nghệ thuật đặc sắc hàng đầu
            </p>
          </div>
          <button
            onClick={() => navigate('/artifacts')}
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-museum-gold hover:text-museum-brown transition-colors cursor-pointer"
          >
            <span>Xem tất cả {artifacts.length} hiện vật</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredArtifacts.map((item) => (
            <ArtifactCard
              key={item.id}
              artifact={item}
              onClick={setSelectedArtifact}
            />
          ))}
        </div>

        <div className="text-center pt-2">
          <button
            onClick={() => navigate('/artifacts')}
            className="inline-flex items-center gap-2 px-8 py-3 bg-white hover:bg-museum-cream text-museum-brown font-extrabold text-xs sm:text-sm rounded-xl border-2 border-museum-gold/40 shadow-xs hover:shadow-md transition-all cursor-pointer"
          >
            <span>Xem thêm kho tàng 270 hiện vật theo {categories.length} danh mục</span>
            <ChevronRight className="w-4 h-4 text-museum-gold" />
          </button>
        </div>
      </section>

      {/* Section 2: Triển lãm đang diễn ra */}
      <section id="exhibitions" className="bg-museum-ivory py-12 border-y border-museum-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-museum-gold">
                KHÔNG GIAN TRƯNG BÀY
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-museum-brown mt-1">
                TRIỂN LÃM CHUYÊN ĐỀ
              </h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {activeExhibitions.slice(0, 3).map((ex) => (
              <div
                key={ex.id}
                className="bg-white rounded-2xl overflow-hidden shadow-xs border border-gray-100 hover:shadow-md transition-all group flex flex-col"
              >
                <div className="aspect-[16/9] relative overflow-hidden bg-museum-cream">
                  <img
                    src={ex.image}
                    alt={ex.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute top-3 left-3">
                    <Badge variant={ex.status === 'Đang diễn ra' ? 'danger' : 'warning'}>
                      {ex.status}
                    </Badge>
                  </div>
                </div>
                <div className="p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="font-bold text-base text-museum-brown group-hover:text-museum-gold transition-colors">
                      {ex.name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{ex.description}</p>
                  </div>
                  <div className="pt-3 border-t border-gray-100 text-xs text-gray-500 space-y-1">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-museum-gold" />
                      <span>{formatDate(ex.startDate)} - {formatDate(ex.endDate)}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-museum-brown" />
                      <span>{ex.location}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Section 3: Sự kiện & Tọa đàm */}
      <section id="events" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-museum-gold">
            HOẠT ĐỘNG VĂN HÓA
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-museum-brown">
            SỰ KIỆN NỔI BẬT
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {events.map((ev) => (
            <div key={ev.id} className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 flex flex-col justify-between space-y-4 hover:shadow-md transition-all">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-museum-gold bg-museum-cream px-2.5 py-0.5 rounded-full">
                    {ev.status}
                  </span>
                  <span className="text-xs text-gray-400 font-semibold">{formatDate(ev.date)}</span>
                </div>
                <h3 className="font-bold text-base text-museum-brown">{ev.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{ev.description}</p>
              </div>

              <div className="pt-3 border-t border-gray-100 text-xs space-y-2 text-gray-500">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-museum-gold" />
                  <span>{ev.time}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-museum-brown" />
                  <span>{ev.location}</span>
                </div>
                <button
                  onClick={() => handleEventRegistration(ev)}
                  className="w-full mt-2 py-2 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Đăng ký tham dự miễn phí
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Section 4: Vé tham quan & Giá niêm yết */}
      <section id="tickets" className="bg-museum-brown text-white py-14">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center space-y-2">
            <span className="text-xs font-bold uppercase tracking-widest text-museum-gold-lt">
              THÔNG TIN VÉ NĂM 2026
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              BẢNG GIÁ VÉ THAM QUAN
            </h2>
            <p className="text-xs sm:text-sm text-museum-cream/80 max-w-xl mx-auto">
              Đặt vé trực tuyến nhanh chóng, tiết kiệm thời gian chờ tại quầy
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {tickets.slice(0, 4).map((t) => (
              <div
                key={t.id}
                className="bg-white/10 border border-museum-gold-lt/30 backdrop-blur-md rounded-2xl p-6 flex flex-col justify-between space-y-4 hover:bg-white/15 transition-all"
              >
                <div>
                  <div className="text-xs font-bold text-museum-gold-lt uppercase">{t.id}</div>
                  <h3 className="font-bold text-lg text-white mt-1">{t.name}</h3>
                  <p className="text-xs text-museum-cream/80 mt-2 min-h-[36px]">{t.description}</p>
                </div>

                <div className="pt-4 border-t border-white/10 space-y-3">
                  <div className="text-2xl font-black text-museum-gold-lt">
                    {formatCurrency(t.price)}
                  </div>
                  <button
                    onClick={() => handleBookTicket(t)}
                    className="w-full py-2.5 bg-museum-gold hover:bg-museum-gold-lt text-white font-bold text-xs rounded-xl shadow-md transition-colors"
                  >
                    Đặt vé này
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>



      {/* Ticket Booking Modal */}
      <Modal
        isOpen={ticketModalOpen}
        onClose={() => {
          setTicketModalOpen(false);
          setBookingErrors({});
        }}
        title={`Đặt Vé: ${selectedTicket?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={confirmBooking} className="space-y-4 text-xs" noValidate>
          <div className="p-3 bg-museum-cream rounded-xl text-museum-brown font-bold flex justify-between">
            <span>Loại vé: {selectedTicket?.name}</span>
            <span className="text-museum-gold">{formatCurrency(selectedTicket?.price)}</span>
          </div>

          {/* 1. Họ tên */}
          <div>
            <label className="block font-bold text-museum-brown mb-1">
              Họ tên người nhận vé <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={bookingFormData.name}
              onChange={(e) => setBookingFormData({ ...bookingFormData, name: e.target.value })}
              placeholder="Nguyễn Văn A"
              className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
                bookingErrors.name ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
            {bookingErrors.name && <p className="text-xs text-danger mt-1">{bookingErrors.name}</p>}
          </div>

          {/* 2. Số điện thoại */}
          <div>
            <label className="block font-bold text-museum-brown mb-1">
              Số điện thoại liên hệ <span className="text-danger">*</span>
            </label>
            <input
              type="tel"
              value={bookingFormData.phone}
              onChange={(e) => setBookingFormData({ ...bookingFormData, phone: e.target.value })}
              placeholder="0912 345 678"
              className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
                bookingErrors.phone ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
            {bookingErrors.phone && <p className="text-xs text-danger mt-1">{bookingErrors.phone}</p>}
          </div>

          {/* 3. Email nhận vé (Đặt ngay sau Số điện thoại liên hệ) */}
          <div>
            <label className="block font-bold text-museum-brown mb-1">
              Email nhận vé <span className="text-danger">*</span>
            </label>
            <input
              type="email"
              value={bookingFormData.email}
              onChange={(e) => setBookingFormData({ ...bookingFormData, email: e.target.value })}
              placeholder="example@gmail.com"
              className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
                bookingErrors.email ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
            {bookingErrors.email && <p className="text-xs text-danger mt-1">{bookingErrors.email}</p>}
          </div>

          {/* 4. Ngày tham quan dự kiến */}
          <div>
            <label className="block font-bold text-museum-brown mb-1">
              Ngày tham quan dự kiến <span className="text-danger">*</span>
            </label>
            <input
              type="date"
              value={bookingFormData.visitDate}
              onChange={(e) => setBookingFormData({ ...bookingFormData, visitDate: e.target.value })}
              className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
                bookingErrors.visitDate ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
            {bookingErrors.visitDate && <p className="text-xs text-danger mt-1">{bookingErrors.visitDate}</p>}
          </div>

          {/* 5. Nút Xác nhận đặt vé */}
          <button
            type="submit"
            className="w-full py-3 bg-museum-brown text-white font-bold rounded-xl hover:bg-museum-brown-dk transition-colors cursor-pointer"
          >
            Xác nhận đặt vé
          </button>
        </form>
      </Modal>

      {/* Auth Required Modal for Ticket Booking */}
      <Modal
        isOpen={!!pendingAuthTicket}
        onClose={() => setPendingAuthTicket(null)}
        title="🔐 Yêu cầu đăng nhập để mua vé"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center py-2 font-sans">
          <div className="w-14 h-14 rounded-2xl bg-museum-cream text-museum-brown flex items-center justify-center mx-auto text-2xl shadow-xs border border-museum-gold/30">
            🎫
          </div>
          <div className="space-y-1">
            <h4 className="font-extrabold text-base text-museum-brown">
              Bạn cần đăng nhập để đặt vé
            </h4>
            <p className="text-xs text-gray-600 leading-relaxed max-w-sm mx-auto">
              Đăng nhập tài khoản giúp hệ thống tạo vé điện tử kèm mã QR check-in và lưu vào mục <strong>"Vé của tôi"</strong> cho bạn.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
            <button
              onClick={() => {
                if (pendingAuthTicket) {
                  localStorage.setItem('pending_ticket_booking', JSON.stringify(pendingAuthTicket));
                }
                setPendingAuthTicket(null);
                navigate('/login');
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Đăng nhập ngay
            </button>
            <button
              onClick={() => {
                setPendingAuthTicket(null);
                navigate('/register');
              }}
              className="w-full sm:w-auto px-5 py-2.5 bg-museum-cream hover:bg-museum-gold/20 text-museum-brown font-bold text-xs rounded-xl border border-museum-gold/40 transition-colors cursor-pointer"
            >
              Đăng ký tài khoản
            </button>
          </div>
        </div>
      </Modal>

      {/* Auth Required Modal for Event Registration */}
      <Modal
        isOpen={!!pendingAuthEvent}
        onClose={() => setPendingAuthEvent(null)}
        title="🔐 Yêu cầu đăng nhập"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-museum-cream text-museum-brown flex items-center justify-center mx-auto text-xl shadow-xs">
            🔐
          </div>
          <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">
            Vui lòng đăng nhập tài khoản để đăng ký tham dự sự kiện.
          </p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (pendingAuthEvent) {
                  localStorage.setItem(
                    'pending_event_registration',
                    JSON.stringify({ eventId: pendingAuthEvent.id, eventTitle: pendingAuthEvent.title })
                  );
                }
                setPendingAuthEvent(null);
                navigate('/login');
              }}
              className="px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Đăng nhập
            </button>
            <button
              onClick={() => setPendingAuthEvent(null)}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Để sau
            </button>
          </div>
        </div>
      </Modal>

      {/* Event Registration Modal */}
      <EventRegistrationModal
        event={activeRegisterEvent}
        isOpen={!!activeRegisterEvent}
        onClose={() => setActiveRegisterEvent(null)}
      />
      {/* Artifact Detail Modal */}
      <ArtifactDetailModal
        artifact={selectedArtifact}
        isOpen={!!selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
      />
    </div>
  );
};
