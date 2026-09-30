import React from 'react';
import { Eye, MapPin } from 'lucide-react';

export const ChatArtifactCards = ({ artifacts, onViewDetail }) => {
  if (!artifacts || artifacts.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold text-museum-brown mb-2 opacity-80">
        Hiện vật liên quan ({artifacts.length})
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {artifacts.map((art) => (
          <div
            key={art.id}
            role="button"
            tabIndex={0}
            onClick={() => onViewDetail(art)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onViewDetail(art);
              }
            }}
            className="flex-shrink-0 w-64 bg-white rounded-xl p-2.5 border border-museum-gold/30 shadow-2xs hover:shadow-md hover:border-museum-gold transition-all cursor-pointer snap-center text-left"
          >
            <div className="flex gap-2.5">
              <img
                src={art.image || './images/museum-hero.jpg'}
                alt={art.name}
                onError={(e) => {
                  e.target.src = './images/museum-hero.jpg';
                }}
                className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-museum-cream/50"
              />
              <div className="flex-1 min-w-0 flex flex-col justify-center">
                <h4 className="font-bold text-[13px] text-museum-brown line-clamp-2 leading-snug mb-1">
                  {art.name}
                </h4>
                {art.period && (
                  <div className="text-[10px] text-museum-gold font-semibold truncate mb-0.5">
                    {art.period}
                  </div>
                )}
                <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                  <span className="truncate">
                    {art.location || (art.displayLocation ? `${art.displayLocation.floor}` : 'Tầng 1')}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onViewDetail(art);
              }}
              className="mt-2.5 w-full py-1.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-[11px] rounded-md transition-colors flex items-center justify-center gap-1.5"
            >
              <Eye className="w-3.5 h-3.5 text-museum-gold-lt" />
              <span>Xem chi tiết</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
