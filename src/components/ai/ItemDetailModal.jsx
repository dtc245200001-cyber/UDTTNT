import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, MapPin, Calendar, Clock, Landmark, Users, Ticket, Info, ExternalLink } from 'lucide-react';

const FALLBACK_IMG = '/images/museum-hero.jpg';

const TYPE_TITLES = {
  gallery: 'Thông Tin Chi Tiết Chuyên Đề',
  exhibition: 'Thông Tin Chi Tiết Triển Lãm',
  event: 'Thông Tin Chi Tiết Sự Kiện',
  ticket: 'Thông Tin Chi Tiết Vé Tham Quan',
};

const TYPE_PATHS = {
  gallery: '/galleries',
  exhibition: '/exhibitions',
  event: '/events',
  ticket: '/tickets',
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
};

const formatPrice = (price) => {
  if (!price && price !== 0) return '';
  if (price === 0) return 'Miễn phí';
  return new Intl.NumberFormat('vi-VN').format(price) + 'đ';
};

export const ItemDetailModal = ({ item, isOpen, onClose }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.body.style.overflow = 'unset';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !item) return null;

  const modalTitle = TYPE_TITLES[item.type] || 'Thông Tin Chi Tiết';
  const targetPath = TYPE_PATHS[item.type] || '/galleries';
  const displayImage = item.image || (item.gallery_images && item.gallery_images[0]) || FALLBACK_IMG;
  const isOngoing = item.status && (item.status.toLowerCase().includes('đang') || item.status.toLowerCase().includes('dang'));

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-[75] flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-[#E8DDCC] transform transition-all duration-300 scale-100 font-sans"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-[#E8DDCC] bg-[#FAF6EF] shrink-0">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-[#B8860B]" />
            <h3 className="text-base sm:text-lg font-extrabold text-[#3E2712] uppercase tracking-tight">
              {modalTitle}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-stone-400 hover:text-[#3E2712] hover:bg-[#F5EFE0] rounded-xl transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-museum-brown">
          {/* Large Image Banner */}
          <div className="aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden bg-museum-cream relative shadow-md border border-museum-gold/20">
            <img
              src={displayImage}
              alt={item.name}
              onError={(e) => {
                e.target.src = FALLBACK_IMG;
              }}
              className="w-full h-full object-cover"
            />
            {item.status && (
              <div
                className={`absolute top-3 left-3 flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full shadow-md ${
                  isOngoing ? 'bg-emerald-600 text-white' : 'bg-museum-brown text-museum-cream'
                }`}
              >
                {isOngoing && <span className="w-2 h-2 rounded-full bg-emerald-300 animate-pulse" />}
                <span>{item.status}</span>
              </div>
            )}
            {item.artifacts_count > 0 && (
              <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                <Landmark className="w-3.5 h-3.5 text-museum-gold" />
                <span>{item.artifacts_count} hiện vật</span>
              </div>
            )}
            {item.seats_remaining > 0 && (
              <div className="absolute top-3 right-3 bg-blue-700/85 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-200" />
                <span>Còn {item.seats_remaining} chỗ</span>
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-extrabold text-museum-brown leading-tight">
              {item.name}
            </h2>

            <div className="flex flex-wrap items-center gap-2.5 text-xs sm:text-sm font-semibold">
              {(item.start_date || item.end_date) && (
                <div className="flex items-center gap-1.5 bg-museum-ivory px-3.5 py-1.5 rounded-xl border border-museum-cream text-museum-gold">
                  <Calendar className="w-4 h-4 shrink-0 text-museum-gold" />
                  <span>
                    Thời gian:{' '}
                    <strong>
                      {formatDate(item.start_date)} – {formatDate(item.end_date)}
                    </strong>
                  </span>
                </div>
              )}

              {item.date && (
                <div className="flex items-center gap-1.5 bg-museum-ivory px-3.5 py-1.5 rounded-xl border border-museum-cream text-museum-gold">
                  <Clock className="w-4 h-4 shrink-0 text-museum-gold" />
                  <span>
                    Ngày diễn ra:{' '}
                    <strong>
                      {formatDate(item.date)} {item.time ? `· ${item.time}` : ''}
                    </strong>
                  </span>
                </div>
              )}

              {item.type === 'ticket' && item.price !== undefined && (
                <div className="flex items-center gap-1.5 bg-emerald-50 px-3.5 py-1.5 rounded-xl border border-emerald-200 text-emerald-800">
                  <Ticket className="w-4 h-4 shrink-0 text-emerald-600" />
                  <span>
                    Giá vé: <strong>{formatPrice(item.price)}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Location text */}
          {item.location && (
            <div className="p-4 bg-museum-cream/90 rounded-2xl border border-museum-gold/30 flex items-center gap-2.5 text-xs sm:text-sm font-bold text-museum-brown shadow-xs">
              <MapPin className="w-4.5 h-4.5 text-museum-gold shrink-0" />
              <span>📍 Địa điểm tổ chức:</span>
              <span className="text-museum-gold-lt font-extrabold text-sm sm:text-base">
                {item.location}
              </span>
            </div>
          )}

          {/* Detailed Content / Description */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-museum-brown/80 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-museum-gold" />
              <span>NỘI DUNG CHI TIẾT</span>
            </h4>
            <div className="p-4 sm:p-5 bg-gray-50 rounded-2xl border border-gray-100 text-xs sm:text-sm text-gray-700 leading-relaxed font-normal whitespace-pre-line shadow-inner">
              {item.detailed_content ||
                item.description ||
                'Hiện chưa có thêm nội dung chi tiết bổ sung cho mục này.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-[#E8DDCC] bg-[#FAF6EF]/50 flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              onClose();
              navigate(targetPath);
            }}
            className="h-10 px-4 typo-btn text-[#3E2712] hover:text-[#B8860B] transition-colors cursor-pointer flex items-center gap-1.5 font-bold text-xs sm:text-sm"
          >
            <span>Xem trang danh sách</span>
            <ExternalLink className="w-4 h-4 text-museum-gold" />
          </button>
          <button
            onClick={onClose}
            className="btn-primary h-10 px-6 typo-btn rounded-full transition-colors cursor-pointer shadow-md"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
