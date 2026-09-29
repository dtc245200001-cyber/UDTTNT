import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { CalendarDays, MapPin, Users, Plus, CheckCircle2, Clock, Sparkles } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { EventRegistrationModal } from '@/components/events/EventRegistrationModal';
import { formatDate } from '@/utils/formatters';

export const Events = () => {
  const navigate = useNavigate();
  const { events, isAuthenticated, currentUser } = useApp();

  const [pendingAuthEvent, setPendingAuthEvent] = useState(null);
  const [activeRegisterEvent, setActiveRegisterEvent] = useState(null);

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

  const statusStyle = (s) => {
    if (s === 'Đang diễn ra') return { dot: 'bg-emerald-500 animate-pulse', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', glow: 'ring-2 ring-emerald-200' };
    if (s === 'Sắp diễn ra') return { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200', glow: '' };
    return { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border-gray-200', glow: '' };
  };

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans pb-12">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-museum-brown via-[#3d1f0d] to-[#1a0a04] mb-8">
        <div className="absolute inset-0 opacity-10 bg-[url('/images/museum-hero.jpg')] bg-cover bg-top" />
        <div className="absolute inset-0 bg-gradient-to-r from-museum-brown/95 to-museum-brown/50" />
        <div className="relative max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="text-xs text-amber-300/60 mb-2">Tổng quan / <span className="text-museum-gold font-bold">Sự kiện</span></p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-museum-gold/20 border border-museum-gold/40 flex items-center justify-center flex-none">
                <CalendarDays className="w-5 h-5 text-museum-gold" />
              </div>
              SỰ KIỆN & TỌA ĐÀM VĂN HÓA
            </h1>
            <p className="text-amber-200/60 text-sm mt-1.5">Các sự kiện văn hóa, tọa đàm và triển lãm đặc biệt của Bảo tàng</p>
          </div>
          {currentUser?.role === 'admin' && (
            <button className="inline-flex items-center gap-2 px-5 py-3 bg-museum-gold hover:bg-amber-500 text-white font-bold text-sm rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 flex-none">
              <Plus className="w-5 h-5" />
              + Tạo sự kiện mới
            </button>
          )}
        </div>
        {/* Summary stats */}
        <div className="relative max-w-7xl mx-auto px-6 pb-8 flex flex-wrap gap-3">
          {[
            { label: 'Đang diễn ra', count: events.filter(e => e.status === 'Đang diễn ra').length, color: 'bg-emerald-500' },
            { label: 'Sắp diễn ra', count: events.filter(e => e.status === 'Sắp diễn ra').length, color: 'bg-amber-400' },
            { label: 'Tổng sự kiện', count: events.length, color: 'bg-museum-gold' },
          ].map(s => (
            <div key={s.label} className="flex items-center gap-2 bg-white/10 backdrop-blur border border-white/20 rounded-xl px-3 py-1.5">
              <span className={`w-2 h-2 rounded-full ${s.color}`} />
              <span className="text-white/80 text-xs font-medium">{s.label}:</span>
              <span className="text-white font-bold text-xs">{s.count}</span>
            </div>
          ))}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#faf8f5] rounded-t-[2rem]" />
      </div>

      {/* ── Events Grid ── */}
      <div className="max-w-7xl mx-auto px-6">
        {events.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-100">
            <CalendarDays className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">Chưa có sự kiện nào.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {events.map((ev) => {
              const isUserRegistered = currentUser?.registeredEvents?.includes(ev.id);
              const ss = statusStyle(ev.status);
              const pct = ev.seats ? Math.round((ev.registered / ev.seats) * 100) : 0;

              return (
                <div key={ev.id} className={`group bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col ${ss.glow}`}>
                  {/* Color top bar */}
                  <div className={`h-1.5 w-full ${ev.status === 'Đang diễn ra' ? 'bg-gradient-to-r from-emerald-400 to-emerald-600' : ev.status === 'Sắp diễn ra' ? 'bg-gradient-to-r from-amber-300 to-amber-500' : 'bg-gradient-to-r from-stone-300 to-stone-400'}`} />

                  <div className="p-5 flex flex-col flex-1 gap-4">
                    {/* Status + ID */}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${ss.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                        {ev.status}
                      </span>
                      <span className="text-[10px] text-stone-400 font-mono">{ev.id}</span>
                    </div>

                    {/* Title + Desc */}
                    <div>
                      <h3 className="font-extrabold text-base text-museum-brown leading-snug mb-1.5">{ev.title}</h3>
                      <p className="text-xs text-stone-500 leading-relaxed line-clamp-3">{ev.description}</p>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 text-xs text-stone-500">
                      <div className="flex items-center gap-2">
                        <CalendarDays className="w-3.5 h-3.5 text-museum-gold shrink-0" />
                        <span className="font-medium">{formatDate(ev.date)} {ev.time && `— ${ev.time}`}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-3.5 h-3.5 text-museum-brown shrink-0" />
                        <span>{ev.location}</span>
                      </div>
                      {ev.speaker && (
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-museum-gold shrink-0" />
                          <span className="font-semibold text-museum-brown">Diễn giả: {ev.speaker}</span>
                        </div>
                      )}
                    </div>

                    {/* Capacity */}
                    {ev.seats > 0 && (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1 text-stone-500"><Users className="w-3.5 h-3.5 text-emerald-600" />Đăng ký</span>
                          <span className="font-bold text-museum-brown">{ev.registered}/{ev.seats}</span>
                        </div>
                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 90 ? 'bg-red-500' : pct >= 70 ? 'bg-amber-500' : 'bg-emerald-500'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    )}

                    {/* CTA Button */}
                    <button
                      onClick={() => handleEventRegistration(ev)}
                      disabled={isUserRegistered}
                      className={`mt-auto w-full py-2.5 rounded-2xl font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                        isUserRegistered
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : 'bg-museum-brown hover:bg-museum-brown-dk text-white cursor-pointer hover:shadow-md hover:-translate-y-0.5'
                      }`}
                    >
                      {isUserRegistered ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>Đã đăng ký tham dự</span></>
                      ) : (
                        <span>Đăng ký tham dự miễn phí</span>
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
