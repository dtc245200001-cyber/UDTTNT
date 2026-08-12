import React from 'react';
import { useApp } from '@/context/AppContext';
import { CalendarDays, MapPin, Users, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/utils/formatters';

export const Events = () => {
  const { events } = useApp();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Sự kiện</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
            SỰ KIỆN & TỌA ĐÀM
          </h2>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors">
          <Plus className="w-5 h-5" />
          <span>+ Tạo sự kiện mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {events.map((ev) => (
          <div key={ev.id} className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between hover:shadow-md transition-all">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Badge>{ev.status}</Badge>
                <span className="text-xs text-gray-400 font-semibold">{ev.id}</span>
              </div>
              <h3 className="font-bold text-base text-museum-brown leading-snug">{ev.title}</h3>
              <p className="text-xs text-gray-600 leading-relaxed">{ev.description}</p>
            </div>

            <div className="pt-4 mt-4 border-t border-gray-100 space-y-2 text-xs text-gray-500">
              <div className="flex items-center gap-2">
                <CalendarDays className="w-4 h-4 text-museum-gold" />
                <span>{formatDate(ev.date)} ({ev.time})</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-museum-brown" />
                <span>{ev.location}</span>
              </div>
              <div className="flex items-center justify-between pt-1">
                <span className="flex items-center gap-1">
                  <Users className="w-4 h-4 text-emerald-600" />
                  <span>Đã đăng ký: <strong>{ev.registered}/{ev.seats}</strong></span>
                </span>
                <span className="text-[11px] font-bold text-museum-brown">Diễn giả: {ev.speaker}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
