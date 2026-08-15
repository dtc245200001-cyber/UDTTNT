import React, { useEffect } from 'react';
import { X, MapPin, Calendar, Tag, Info, Landmark } from 'lucide-react';

export const ArtifactDetailModal = ({ artifact, isOpen, onClose }) => {
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

  if (!isOpen || !artifact) return null;

  // Helper for displaying virtual location text
  const locationText =
    artifact?.location ||
    (artifact?.displayLocation
      ? `${artifact.displayLocation.floor} · ${artifact.displayLocation.room} · ${artifact.displayLocation.shelf}`
      : 'Tầng 1 · Phòng A · Kệ 01');

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/65 backdrop-blur-xs animate-fadeIn"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col overflow-hidden border border-museum-cream transform transition-all duration-300 scale-100 font-sans"
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 sm:px-6 py-4 border-b border-gray-100 bg-museum-ivory shrink-0">
          <div className="flex items-center gap-2">
            <Landmark className="w-5 h-5 text-museum-gold" />
            <h3 className="text-base sm:text-lg font-extrabold text-museum-brown uppercase tracking-tight">
              Thông Tin Chi Tiết Hiện Vật
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-museum-brown hover:bg-museum-cream rounded-xl transition-colors cursor-pointer"
            title="Đóng cửa sổ"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body (Scrollable) */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 text-museum-brown">
          {/* Artifact Large Image */}
          <div className="aspect-[16/9] sm:aspect-[21/9] rounded-2xl overflow-hidden bg-museum-cream relative shadow-md border border-museum-gold/20">
            <img
              src={artifact.image || './images/museum-hero.jpg'}
              alt={artifact.name}
              onError={(e) => {
                e.target.src = './images/museum-hero.jpg';
              }}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-xs text-white text-xs font-semibold px-3 py-1 rounded-full shadow-sm">
              Mã số: {artifact.id}
            </div>
            {artifact.culture && (
              <div className="absolute top-3 left-3 bg-museum-brown/90 text-museum-cream text-xs font-bold px-3 py-1 rounded-full shadow-sm">
                {artifact.culture}
              </div>
            )}
          </div>

          {/* Title & Metadata */}
          <div className="space-y-3">
            <h2 className="text-xl sm:text-2xl font-extrabold text-museum-brown leading-tight">
              {artifact.name}
            </h2>

            <div className="flex flex-wrap items-center gap-3 text-xs sm:text-sm font-semibold">
              {artifact.date && (
                <div className="flex items-center gap-1.5 bg-museum-ivory px-3.5 py-1.5 rounded-xl border border-museum-cream text-museum-gold">
                  <Calendar className="w-4 h-4 shrink-0 text-museum-gold" />
                  <span>Niên đại: <strong>{artifact.date}</strong></span>
                </div>
              )}

              {artifact.period && (
                <div className="flex items-center gap-1.5 bg-museum-ivory px-3.5 py-1.5 rounded-xl border border-museum-cream text-museum-brown">
                  <Tag className="w-4 h-4 shrink-0 text-museum-gold" />
                  <span>Thời kỳ: <strong>{artifact.period}</strong></span>
                </div>
              )}
            </div>
          </div>

          {/* Virtual Display Location */}
          <div className="p-4 bg-museum-cream/90 rounded-2xl border border-museum-gold/30 flex items-center gap-2.5 text-xs sm:text-sm font-bold text-museum-brown shadow-xs">
            <MapPin className="w-4.5 h-4.5 text-museum-gold shrink-0" />
            <span>📍 Vị trí trưng bày:</span>
            <span className="text-museum-gold-lt font-extrabold text-sm sm:text-base">{locationText}</span>
          </div>

          {/* Detailed Description */}
          <div className="space-y-2">
            <h4 className="font-extrabold text-xs uppercase tracking-wider text-museum-brown/80 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-museum-gold" />
              <span>MÔ TẢ CHI TIẾT</span>
            </h4>
            <div className="p-4 sm:p-5 bg-gray-50 rounded-2xl border border-gray-100 text-xs sm:text-sm text-gray-700 leading-relaxed font-normal whitespace-pre-line shadow-inner">
              {artifact.description || 'Chưa có thông tin mô tả chi tiết cho hiện vật này.'}
            </div>
          </div>

          {/* Optional Extended Details */}
          {(artifact.material || artifact.dimensions || artifact.origin) && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {artifact.material && (
                <div className="p-3 bg-museum-ivory rounded-xl border border-museum-cream/60">
                  <span className="text-gray-400 font-medium block mb-0.5">Chất liệu</span>
                  <span className="font-bold text-museum-brown">{artifact.material}</span>
                </div>
              )}
              {artifact.dimensions && (
                <div className="p-3 bg-museum-ivory rounded-xl border border-museum-cream/60">
                  <span className="text-gray-400 font-medium block mb-0.5">Kích thước</span>
                  <span className="font-bold text-museum-brown">{artifact.dimensions}</span>
                </div>
              )}
              {artifact.origin && (
                <div className="p-3 bg-museum-ivory rounded-xl border border-museum-cream/60">
                  <span className="text-gray-400 font-medium block mb-0.5">Nguồn gốc</span>
                  <span className="font-bold text-museum-brown">{artifact.origin}</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 border-t border-gray-100 bg-gray-50 flex justify-end shrink-0">
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs sm:text-sm rounded-xl transition-colors cursor-pointer shadow-md"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
