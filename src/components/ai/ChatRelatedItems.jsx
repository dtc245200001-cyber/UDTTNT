import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Eye } from 'lucide-react';

const TYPE_CONFIG = {
  gallery: {
    label: 'Chuyên đề trưng bày',
    navPath: '/galleries',
    defaultStatus: 'Đang diễn ra',
  },
  exhibition: {
    label: 'Triển lãm',
    navPath: '/exhibitions',
    defaultStatus: 'Đang diễn ra',
  },
  event: {
    label: 'Sự kiện',
    navPath: '/events',
    defaultStatus: 'Sắp diễn ra',
  },
  ticket: {
    label: 'Vé tham quan',
    navPath: '/tickets',
    defaultStatus: '',
  },
};

const FALLBACK_IMG = '/images/museum-hero.jpg';

export const ChatRelatedItems = ({ items, onViewDetail }) => {
  const navigate = useNavigate();
  if (!items || items.length === 0) return null;

  const firstType = items[0]?.type || 'gallery';
  const groupLabel = TYPE_CONFIG[firstType]?.label || 'Liên quan';

  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold text-museum-brown mb-2 opacity-80">
        {groupLabel} liên quan ({items.length})
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {items.map((item, idx) => {
          const cfg = TYPE_CONFIG[item.type] || TYPE_CONFIG.gallery;
          const statusLabel = item.status || cfg.defaultStatus;

          const handleOpen = () => {
            if (onViewDetail) {
              onViewDetail(item);
            } else {
              navigate(cfg.navPath);
            }
          };

          return (
            <div
              key={item.id || idx}
              role="button"
              tabIndex={0}
              onClick={handleOpen}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleOpen();
                }
              }}
              className="flex-shrink-0 w-64 bg-white rounded-xl p-2.5 border border-museum-gold/30 shadow-2xs hover:shadow-md hover:border-museum-gold transition-all cursor-pointer snap-center text-left"
            >
              <div className="flex gap-2.5">
                <img
                  src={item.image || FALLBACK_IMG}
                  alt={item.name}
                  onError={(e) => {
                    e.target.src = FALLBACK_IMG;
                  }}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-museum-cream/50"
                />
                <div className="flex-1 min-w-0 flex flex-col justify-center">
                  <h4 className="font-bold text-[13px] text-museum-brown line-clamp-2 leading-snug mb-1">
                    {item.name}
                  </h4>
                  {statusLabel && (
                    <div className="text-[10px] text-museum-gold font-semibold truncate mb-0.5 flex items-center gap-1">
                      {(statusLabel.toLowerCase().includes('đang') ||
                        statusLabel.toLowerCase().includes('dang')) && (
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0 inline-block" />
                      )}
                      <span className="truncate">{statusLabel}</span>
                    </div>
                  )}
                  {item.location && (
                    <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleOpen();
                }}
                className="mt-2.5 w-full py-1.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-[11px] rounded-md transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-3.5 h-3.5 text-museum-gold-lt" />
                <span>Xem chi tiết</span>
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
