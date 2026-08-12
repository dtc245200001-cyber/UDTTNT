import React, { useState } from 'react';
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
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { formatDate, formatCurrency } from '@/utils/formatters';

export const VisitorHome = () => {
  const { artifacts, exhibitions, events, tickets, addToast } = useApp();
  const [selectedAiArtifact, setSelectedAiArtifact] = useState(null);
  const [ticketModalOpen, setTicketModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);

  const featuredArtifacts = artifacts.slice(0, 6);
  const activeExhibitions = exhibitions;

  const handleBookTicket = (ticket) => {
    setSelectedTicket(ticket);
    setTicketModalOpen(true);
  };

  const confirmBooking = (e) => {
    e.preventDefault();
    setTicketModalOpen(false);
    addToast(`Đã đăng ký mua "${selectedTicket?.name}" thành công! Vui lòng nhận vé tại Quầy.`, 'success');
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
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-museum-gold/30 border border-museum-gold-lt/50 text-museum-gold-lt text-xs font-bold uppercase tracking-widest backdrop-blur-sm animate-bounce">
            <Sparkles className="w-4 h-4" />
            Trải nghiệm Bảo Tàng Tích Hợp Trợ Lý AI
          </div>

          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-tight uppercase drop-shadow-md">
            KHÁM PHÁ BẢO VẬT & <br />
            <span className="text-museum-gold-lt">DI SẢN VĂN HÓA VIỆT NAM</span>
          </h1>

          <p className="text-sm sm:text-lg text-museum-cream/90 max-w-2xl mx-auto leading-relaxed font-normal">
            Hành trình kết nối lịch sử hàng nghìn năm từ thời kỳ Đông Sơn, các triều đại Lý, Trần, Lê, Nguyễn đến tinh hoa di sản đương đại.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <a
              href="#artifacts"
              className="w-full sm:w-auto px-8 py-3.5 bg-museum-gold hover:bg-museum-gold-lt text-white font-extrabold text-sm rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5"
            >
              Khám phá hiện vật nổi bật
            </a>
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
        <div className="text-center space-y-2">
          <span className="text-xs font-bold uppercase tracking-widest text-museum-gold">
            BỘ SƯU TẬP QUỐC GIA
          </span>
          <h2 className="text-2xl sm:text-4xl font-extrabold text-museum-brown">
            HIỆN VẬT TIÊU BIỂU
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 max-w-xl mx-auto">
            Các bảo vật quốc gia mang giá trị lịch sử và nghệ thuật đặc sắc hàng đầu
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {featuredArtifacts.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-xl border border-gray-100 transition-all duration-300 flex flex-col group"
            >
              <div className="aspect-[4/3] overflow-hidden relative bg-museum-cream">
                <img
                  src={item.image}
                  alt={item.name}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
                <div className="absolute top-3 left-3">
                  <span className="bg-museum-brown/90 text-museum-cream text-[11px] font-bold px-3 py-1 rounded-full backdrop-blur-xs">
                    {item.culture}
                  </span>
                </div>
              </div>

              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <div className="text-xs text-museum-gold font-bold mb-1">{item.period}</div>
                  <h3 className="font-bold text-lg text-museum-brown group-hover:text-museum-gold transition-colors">
                    {item.name}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 mt-2 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-400">Vị trí: {item.location}</span>
                  <button
                    onClick={() => setSelectedAiArtifact(item)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-museum-cream hover:bg-museum-gold hover:text-white text-museum-brown text-xs font-bold rounded-lg transition-colors"
                  >
                    <Bot className="w-4 h-4 text-museum-gold group-hover:text-white" />
                    <span>AI phân tích</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
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
                  onClick={() => addToast(`Đã ghi danh tham dự "${ev.title}"!`, 'success')}
                  className="w-full mt-2 py-2 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold rounded-xl text-xs transition-colors shadow-xs"
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

      {/* AI Artifact Analysis Modal */}
      <Modal
        isOpen={!!selectedAiArtifact}
        onClose={() => setSelectedAiArtifact(null)}
        title={`🤖 AI Phân Tích: ${selectedAiArtifact?.name}`}
        maxWidth="max-w-2xl"
      >
        <div className="space-y-4">
          <div className="flex gap-4">
            <img
              src={selectedAiArtifact?.image}
              alt={selectedAiArtifact?.name}
              className="w-28 h-28 rounded-xl object-cover border border-museum-cream flex-shrink-0"
            />
            <div>
              <h4 className="font-extrabold text-lg text-museum-brown">{selectedAiArtifact?.name}</h4>
              <p className="text-xs text-museum-gold font-bold mt-1">
                {selectedAiArtifact?.culture} • {selectedAiArtifact?.period}
              </p>
              <p className="text-xs text-gray-500 mt-2">Vị trí: {selectedAiArtifact?.location}</p>
            </div>
          </div>
          <div className="p-4 bg-museum-cream/80 rounded-xl border border-museum-gold/30 text-xs sm:text-sm text-museum-brown-dk leading-relaxed italic">
            "{selectedAiArtifact?.aiAnalysis}"
          </div>
        </div>
      </Modal>

      {/* Ticket Booking Modal */}
      <Modal
        isOpen={ticketModalOpen}
        onClose={() => setTicketModalOpen(false)}
        title={`Đặt Vé: ${selectedTicket?.name}`}
        maxWidth="max-w-md"
      >
        <form onSubmit={confirmBooking} className="space-y-4 text-xs">
          <div className="p-3 bg-museum-cream rounded-xl text-museum-brown font-bold flex justify-between">
            <span>Loại vé: {selectedTicket?.name}</span>
            <span className="text-museum-gold">{formatCurrency(selectedTicket?.price)}</span>
          </div>
          <div>
            <label className="block font-bold text-museum-brown mb-1">Họ tên người nhận vé</label>
            <input type="text" required placeholder="Nguyễn Văn A" className="w-full p-2.5 bg-gray-50 border rounded-xl" />
          </div>
          <div>
            <label className="block font-bold text-museum-brown mb-1">Số điện thoại liên hệ</label>
            <input type="tel" required placeholder="0912 345 678" className="w-full p-2.5 bg-gray-50 border rounded-xl" />
          </div>
          <div>
            <label className="block font-bold text-museum-brown mb-1">Ngày tham quan dự kiến</label>
            <input type="date" required className="w-full p-2.5 bg-gray-50 border rounded-xl" />
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-museum-brown text-white font-bold rounded-xl hover:bg-museum-brown-dk transition-colors"
          >
            Xác nhận đặt vé
          </button>
        </form>
      </Modal>
    </div>
  );
};
