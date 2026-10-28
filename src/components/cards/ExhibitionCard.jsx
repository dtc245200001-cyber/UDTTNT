import React from 'react';
import { MapPin, Calendar } from 'lucide-react';
import { formatDate } from '@/utils/formatters';

export const ExhibitionCard = ({ exhibition }) => {
  const isOngoing = exhibition.status === 'Đang diễn ra';

  return (
    <div className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 border border-stone-200/80 transition-all duration-300 group flex flex-col">
      <div className="aspect-[16/9] overflow-hidden relative bg-museum-cream">
        <img
          src={exhibition.image}
          alt={exhibition.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-3 left-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold text-white shadow-md ${
              isOngoing ? 'bg-danger' : 'bg-warning'
            }`}
          >
            {exhibition.status}
          </span>
        </div>
      </div>
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="typo-card-title text-museum-brown group-hover:text-museum-gold transition-colors min-h-[2.7em]">
            {exhibition.name}
          </h4>
          <div className="flex items-center gap-1.5 text-xs text-stone-500 mt-2">
            <Calendar className="w-3.5 h-3.5 text-museum-gold shrink-0" />
            <span>
              {formatDate(exhibition.startDate)} - {formatDate(exhibition.endDate)}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-stone-500 mt-3 pt-3 border-t border-stone-100">
          <MapPin className="w-3.5 h-3.5 text-museum-brown shrink-0" />
          <span>{exhibition.location}</span>
        </div>
      </div>
    </div>
  );
};
