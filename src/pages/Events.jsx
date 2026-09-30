import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { CalendarDays, MapPin, Users, Plus, CheckCircle2, Clock, Sparkles, Search, ArrowRight } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { EventRegistrationModal } from '@/components/events/EventRegistrationModal';
import { formatDate } from '@/utils/formatters';

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

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden h-[255px] bg-[#3a2213]">
        
        {/* Full pre-designed background image with gradient overlay */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(90deg, #3a2213 0%, #3a2213 35%, rgba(58,34,19,0.85) 50%, rgba(58,34,19,0) 80%), url('/images/events/hero-events.jpg') right center / cover no-repeat`
        }} />

        {/* Lotus overlay in banner */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('/images/lotus-left.svg')] bg-no-repeat" style={{ backgroundPosition: '-50px bottom', backgroundSize: '400px' }} />

        {/* Content Container */}
        <div className="relative max-w-7xl mx-auto px-6 h-full flex flex-col justify-center">
          <div className="max-w-max relative z-10">
            <p className="text-sm font-medium mb-2">
              <span className="text-[#E8E0D5]">Tổng quan</span> 
              <span className="text-white/40 mx-2">/</span> 
              <span className="text-[#c8952e]">Sự kiện</span>
            </p>
            <h1 className="text-[28px] md:text-[44px] lg:text-[48px] font-[800] text-white leading-tight uppercase whitespace-nowrap">
              SỰ KIỆN & TỌA ĐÀM VĂN HÓA
            </h1>
            <p className="text-[#FAF8F5] text-[16px] md:text-[17px] mt-2 mb-6">
              Các sự kiện văn hóa, tọa đàm và triển lãm đặc biệt của Bảo tàng
            </p>

            <div className="relative w-full md:w-[680px]">
              <div className="absolute inset-y-0 left-5 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-stone-400" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sự kiện, chủ đề, thời gian..." 
                className="w-full h-[54px] pl-14 pr-16 bg-white rounded-full border-none shadow-lg text-base focus:outline-none focus:ring-2 focus:ring-[#c8952e] text-gray-800"
              />
              <div className="absolute inset-y-0 right-2 flex items-center">
                <button className="w-10 h-10 bg-[#c8952e] hover:bg-[#b8860b] text-white rounded-full flex items-center justify-center transition-colors shadow-sm">
                  <Search className="h-4 w-4" />
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
            className="group inline-flex items-center text-[15px] font-semibold text-[#3a2213] hover:text-[#c8952e] transition-colors"
          >
            {showAllEvents ? 'Thu gọn' : 'Xem tất cả'}
            <ArrowRight className="ml-1.5 w-4 h-4 transition-transform group-hover:translate-x-1" />
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
                <div key={ev.id} className="group bg-white rounded-[18px] p-[12px] overflow-hidden border border-stone-100 hover:-translate-y-1 transition-all duration-300 flex flex-col" style={{ boxShadow: '0 6px 24px rgba(92,58,30,0.08)' }}>
                  
                  {/* Image Container */}
                  <div className="relative h-[125px] w-full rounded-[12px] overflow-hidden mb-4 shrink-0">
                    {imageUrl ? (
                      <img src={imageUrl} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#8B5A1E] to-[#B8860B] flex items-center justify-center">
                        <CalendarDays className="w-10 h-10 text-white/30" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-2 left-2">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-[12px] font-bold text-museum-brown shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${ss.dot}`} />
                        {ev.status}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col flex-1 gap-4 px-1">
                    {/* Title + Desc */}
                    <div>
                      <h3 className="font-bold text-[20px] text-[#3a2213] leading-snug line-clamp-1 mb-1.5">{ev.title}</h3>
                      <p className="text-[15px] text-stone-500 leading-relaxed line-clamp-2">{ev.description}</p>
                    </div>

                    {/* Info */}
                    <div className="space-y-2.5 text-[14px] text-stone-600 mt-auto">
                      <div className="flex items-center gap-3">
                        <CalendarDays className="w-4 h-4 text-[#c8952e] shrink-0" />
                        <span className="font-medium">{formatDate(ev.date)} {ev.time && `— ${ev.time}`}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <MapPin className="w-4 h-4 text-[#c8952e] shrink-0" />
                        <span>{ev.location}</span>
                      </div>
                      {ev.speaker && (
                        <div className="flex items-center gap-3">
                          <Sparkles className="w-4 h-4 text-[#c8952e] shrink-0" />
                          <span className="font-bold text-[#3a2213]">Diễn giả: {ev.speaker}</span>
                        </div>
                      )}
                    </div>

                    {/* Capacity */}
                    {ev.seats > 0 && (
                      <div className="space-y-2 mt-2">
                        <div className="flex items-center justify-between text-[14px]">
                          <span className="flex items-center gap-1.5 text-stone-500 font-medium">
                            <Users className="w-4 h-4 text-emerald-600" />Đăng ký
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
                      className={`w-full h-[44px] rounded-full font-bold text-[14px] transition-all flex items-center justify-center gap-2 mt-2 ${
                        isUserRegistered
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : 'bg-[#3a2213] hover:bg-[#5a3a1f] text-white cursor-pointer group/btn'
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
