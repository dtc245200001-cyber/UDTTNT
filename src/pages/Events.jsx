import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { CalendarDays, MapPin, Users, Plus, CheckCircle2, Clock, Sparkles, Search, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { EventRegistrationModal } from '@/components/events/EventRegistrationModal';
import { formatDate } from '@/utils/formatters';
import { Breadcrumb } from '@/components/common/Breadcrumb';

export const Events = () => {
  const navigate = useNavigate();
  const { events, isAuthenticated, currentUser } = useApp();

  const [pendingAuthEvent, setPendingAuthEvent] = useState(null);
  const [activeRegisterEvent, setActiveRegisterEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Restore pending event registration after login
  useEffect(() => {
    if (isAuthenticated) {
      const pendingReg = localStorage.getItem('pending_event_registration');
      if (pendingReg) {
        try {
          const { eventId } = JSON.parse(pendingReg);
          localStorage.removeItem('pending_event_registration');
          const targetEv = events.find((e) => e.id === eventId);
          if (targetEv) setActiveRegisterEvent(targetEv);
        } catch (err) {
          console.error('Failed to parse pending event registration', err);
        }
      }
    }
  }, [isAuthenticated, events]);

  const handleEventRegistration = (ev) => {
    setActiveRegisterEvent(ev);
  };

  const getEventImage = (id) => {
    if (id === 'EV001') return '/images/events/dong-son-drum.jpg';
    if (id === 'EV002') return '/images/events/chu-dau-ceramic.jpg';
    if (id === 'EV003') return '/images/events/thang-long-night.jpg';
    return null; 
  };

  const statusStyle = (s) => {
    if (s === 'Đang diễn ra') return { dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-700' };
    if (s === 'Sắp diễn ra') return { dot: 'bg-amber-400', text: 'text-amber-700' };
    return { dot: 'bg-gray-400', text: 'text-gray-600' };
  };

  const filteredEvents = events.filter(e => {
    if (!searchQuery.trim()) return true;
    
    const searchLower = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const searchableText = `${e.title} ${e.description} ${e.speaker || ''} ${e.location} ${formatDate(e.date)}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return searchableText.includes(searchLower);
  });

  const displayedEvents = (!searchQuery.trim() && events.length > 3 && !showAllEvents) 
    ? [...filteredEvents].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 3) 
    : filteredEvents;

  return (
    <div className="min-h-screen bg-[#faf6ef] font-sans pb-16 relative">
      {/* Decorative lotus left & right */}
      <div className="pointer-events-none absolute bottom-0 left-0 w-64 h-96 bg-[url('/images/lotus-left.svg')] bg-no-repeat bg-bottom bg-contain opacity-10" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-96 bg-[url('/images/lotus-right.svg')] bg-no-repeat bg-bottom bg-contain opacity-10" />

      {/* ── Hero Banner: Chiều cao chuẩn linh hoạt, nền màu nâu di sản ── */}
      <div className="relative overflow-hidden min-h-[260px] md:h-[280px] bg-[#3a2213] flex flex-col justify-center py-6 select-none">
        
        {/* Full pre-designed background image with gradient overlay */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(90deg, #3a2213 0%, #3a2213 35%, rgba(58,34,19,0.85) 50%, rgba(58,34,19,0) 80%), url('/images/events/hero-events.jpg') right center / cover no-repeat`
        }} />

        {/* Lotus overlay in banner */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('/images/lotus-left.svg')] bg-no-repeat" style={{ backgroundPosition: '-50px bottom', backgroundSize: '400px' }} />

        {/* Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <div className="max-w-2xl relative z-10">
            {/* Breadcrumb: TRANG CHỦ / SỰ KIỆN */}
            <div className="relative z-10">
              <Breadcrumb
                items={[
                  { label: 'TRANG CHỦ', path: '/' },
                  { label: 'SỰ KIỆN' },
                ]}
                variant="dark"
              />
            </div>

            {/* Title: Serif bold, large, white */}
            <h1 
              className="typo-page-title text-white tracking-wide leading-tight uppercase relative z-10"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,.45)' }}
            >
              SỰ KIỆN & TỌA ĐÀM VĂN HÓA
            </h1>

            {/* Description */}
            <p className="typo-body text-[#FAF8F5]/85 mt-2 mb-4 line-clamp-2 max-w-xl relative z-10">
              Các sự kiện văn hóa, tọa đàm và triển lãm đặc biệt của Bảo tàng.
            </p>

            {/* Embedded Search Box (Standardized h-11) */}
            <div className="relative w-full max-w-xl">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-stone-400" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sự kiện, chủ đề, thời gian..." 
                className="w-full h-11 pl-11 pr-20 bg-white rounded-full border border-stone-200/80 shadow-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5A1E]/30 text-gray-800 placeholder:text-stone-400"
              />
              <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer transition-colors"
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  className="w-8 h-8 btn-primary rounded-full flex items-center justify-center transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A1E]/40"
                  title="Tìm kiếm"
                >
                  <Search className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10 space-y-6 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-[28px] bg-[#c8952e] rounded-full" />
            <h2 className="text-2xl font-bold text-[#3a2213] uppercase">
              SỰ KIỆN NỔI BẬT
            </h2>
          </div>
          <button 
            onClick={() => setShowAllEvents(!showAllEvents)}
            className="group inline-flex items-center gap-1.5 px-4 h-9 typo-btn text-xs sm:text-[13px] rounded-full bg-white border border-stone-200/80 shadow-2xs text-[#3a2213] hover:text-[#8B5A1E] hover:bg-stone-50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A1E]/40"
          >
            <span>{showAllEvents ? 'Thu gọn' : 'Xem tất cả'}</span>
            <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Events Grid */}
        {displayedEvents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-100 shadow-sm">
            <Search className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">Không tìm thấy sự kiện phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedEvents.map((ev) => {
              const isUserRegistered = currentUser?.registeredEvents?.includes(ev.id);
              const ss = statusStyle(ev.status);
              const pct = ev.seats ? Math.round((ev.registered / ev.seats) * 100) : 0;
              const imageUrl = getEventImage(ev.id) || ev.image;

              return (
                <div key={ev.id} className="group bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  
                  {/* Image Container */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-museum-cream">
                    {imageUrl ? (
                      <img src={imageUrl} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#8B5A1E] to-[#B8860B] flex items-center justify-center">
                        <CalendarDays className="w-10 h-10 text-white/30" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-xs rounded-full text-xs font-bold text-museum-brown shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${ss.dot}`} />
                        {ev.status}
                      </span>
                    </div>
                  </div>

                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    {/* Title + Desc */}
                    <div>
                      <h3 className="typo-card-title text-[#3a2213] group-hover:text-[#8B5A1E] transition-colors min-h-[2.7em] mb-1.5">{ev.title}</h3>
                      <p className="typo-body text-xs text-stone-500 leading-relaxed line-clamp-2">{ev.description}</p>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 text-xs text-stone-600 mt-auto">
                      <div className="flex items-center gap-2.5">
                        <CalendarDays className="w-3.5 h-3.5 text-[#c8952e] shrink-0" />
                        <span className="font-medium">{formatDate(ev.date)} {ev.time && `— ${ev.time}`}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-3.5 h-3.5 text-[#c8952e] shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                      {ev.speaker && (
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#c8952e] shrink-0" />
                          <span className="font-bold text-[#3a2213] truncate">Diễn giả: {ev.speaker}</span>
                        </div>
                      )}
                    </div>

                    {/* Capacity */}
                    {ev.seats > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-stone-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-stone-500 font-medium">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />Đăng ký
                          </span>
                          <span className="font-bold text-[#3a2213]">{ev.registered}/{ev.seats}</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-[#c8952e]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    )}

                    {/* CTA Button */}
                    <button
                      onClick={() => handleEventRegistration(ev)}
                      disabled={isUserRegistered}
                      className={`w-full h-11 rounded-full typo-btn transition-all flex items-center justify-center gap-2 mt-1 ${
                        isUserRegistered
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : 'btn-primary shadow-xs hover:shadow-md cursor-pointer group/btn'
                      }`}
                    >
                      {isUserRegistered ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>Đã đăng ký tham dự</span></>
                      ) : (
                        <>
                          <span>Đăng ký tham dự miễn phí</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Auth Modal ── */}
      <Modal isOpen={!!pendingAuthEvent} onClose={() => setPendingAuthEvent(null)} title="🔐 Yêu cầu đăng nhập" maxWidth="max-w-md">
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-museum-cream text-museum-brown flex items-center justify-center mx-auto text-xl shadow-xs">🔐</div>
          <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">Vui lòng đăng nhập để đăng ký tham dự sự kiện.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (pendingAuthEvent) localStorage.setItem('pending_event_registration', JSON.stringify({ eventId: pendingAuthEvent.id, eventTitle: pendingAuthEvent.title }));
                setPendingAuthEvent(null);
                navigate('/login');
              }}
              className="px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Đăng nhập
            </button>
            <button onClick={() => setPendingAuthEvent(null)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer">Để sau</button>
          </div>
        </div>
      </Modal>

      {/* ── Event Registration Modal ── */}
      <EventRegistrationModal event={activeRegisterEvent} isOpen={!!activeRegisterEvent} onClose={() => setActiveRegisterEvent(null)} />
    </div>
  );
};
