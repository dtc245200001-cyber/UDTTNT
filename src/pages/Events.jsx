import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { CalendarDays, MapPin, Users, Plus, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EventRegistrationModal } from '@/components/events/EventRegistrationModal';
import { formatDate } from '@/utils/formatters';

export const Events = () => {
  const navigate = useNavigate();
  const { events, isAuthenticated, currentUser } = useApp();

  const [pendingAuthEvent, setPendingAuthEvent] = useState(null);
  const [activeRegisterEvent, setActiveRegisterEvent] = useState(null);

  // Check if there was a pending event registration prior to logging in
  useEffect(() => {
    if (isAuthenticated) {
      const pendingReg = localStorage.getItem('pending_event_registration');
      if (pendingReg) {
        try {
          const { eventId } = JSON.parse(pendingReg);
          localStorage.removeItem('pending_event_registration');
          const targetEv = events.find((e) => e.id === eventId);
          if (targetEv) {
            setActiveRegisterEvent(targetEv);
          }
        } catch (err) {
          console.error('Failed to parse pending event registration', err);
        }
      }
    }
  }, [isAuthenticated, events]);

  const handleEventRegistration = (ev) => {
    setActiveRegisterEvent(ev);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Sự kiện</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
            SỰ KIỆN & TỌA ĐÀM VĂN HÓA
          </h2>
        </div>
        {currentUser?.role === 'admin' && (
          <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors cursor-pointer">
            <Plus className="w-5 h-5" />
            <span>+ Tạo sự kiện mới</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((ev) => {
          const isUserRegistered = currentUser?.registeredEvents?.includes(ev.id);

          return (
            <div
              key={ev.id}
              className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Badge>{ev.status}</Badge>
                  <span className="text-xs text-gray-400 font-semibold">{ev.id}</span>
                </div>
                <h3 className="font-bold text-base text-museum-brown leading-snug">{ev.title}</h3>
                <p className="text-xs text-gray-600 leading-relaxed">{ev.description}</p>
              </div>

              <div className="pt-4 border-t border-gray-100 space-y-3 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-4 h-4 text-museum-gold shrink-0" />
                  <span>
                    {formatDate(ev.date)} ({ev.time})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-museum-brown shrink-0" />
                  <span>{ev.location}</span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="flex items-center gap-1">
                    <Users className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Đã đăng ký: <strong>{ev.registered}/{ev.seats}</strong>
                    </span>
                  </span>
                  <span className="text-[11px] font-bold text-museum-brown">Diễn giả: {ev.speaker}</span>
                </div>

                <button
                  onClick={() => handleEventRegistration(ev)}
                  disabled={isUserRegistered}
                  className={`w-full py-2.5 rounded-xl font-bold text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 ${
                    isUserRegistered
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                      : 'bg-museum-brown hover:bg-museum-brown-dk text-white cursor-pointer'
                  }`}
                >
                  {isUserRegistered ? (
                    <>
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Đã đăng ký tham dự</span>
                    </>
                  ) : (
                    <span>Đăng ký tham dự miễn phí</span>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 1. Auth Required Modal */}
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

      {/* 2. Event Registration Form Modal */}
      <EventRegistrationModal
        event={activeRegisterEvent}
        isOpen={!!activeRegisterEvent}
        onClose={() => setActiveRegisterEvent(null)}
      />
    </div>
  );
};
