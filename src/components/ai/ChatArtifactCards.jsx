import React from 'react';
import { Eye, MapPin, Volume2, Square } from 'lucide-react';
import { narrator, useNarrator } from '@/components/ai/NarrationControls';
import { toGuideNarration } from '@/lib/narrationScript';

export const ChatArtifactCards = ({ artifacts, onViewDetail }) => {
  const { status, currentId, speak, stop } = useNarrator();

  if (!artifacts || artifacts.length === 0) return null;

  const handleNarrate = (e, art) => {
    e.stopPropagation();
    const narrationId = `artifact-${art.id}`;
    if (currentId === narrationId && (status === 'speaking' || status === 'loading')) {
      stop();
    } else {
      const description = art.description || `${art.name}, niên đại ${art.period || art.culture || 'cổ vật'}, vị trí trưng bày ${art.location || 'Bảo tàng Quốc gia'}.`;
      const guidedText = toGuideNarration(description, {
        artifactName: art.name,
        hasArtifacts: true,
      });
      speak(guidedText, { id: narrationId });
    }
  };

  return (
    <div className="mt-3">
      <div className="text-[11px] font-bold text-museum-brown mb-2 opacity-80">
        Hiện vật liên quan ({artifacts.length})
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-hide">
        {artifacts.map((art) => {
          const isNarrating = currentId === `artifact-${art.id}` && (status === 'speaking' || status === 'loading');

          return (
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
              className={`flex-shrink-0 w-[270px] sm:w-[280px] bg-white rounded-xl p-2.5 border transition-all cursor-pointer snap-center text-left flex flex-col justify-between min-h-[142px] ${
                isNarrating
                  ? 'border-museum-gold ring-2 ring-museum-gold/30 shadow-md bg-amber-50/20'
                  : 'border-museum-gold/30 shadow-2xs hover:shadow-md hover:border-museum-gold'
              }`}
            >
              <div className="flex gap-2.5 items-start">
                <img
                  src={art.image || '/images/museum-hero.jpg'}
                  alt={art.name}
                  onError={(e) => {
                    e.target.src = '/images/museum-hero.jpg';
                  }}
                  className="w-16 h-16 object-cover rounded-lg flex-shrink-0 bg-museum-cream/50 border border-stone-100"
                />
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-[12.5px] text-museum-brown line-clamp-2 leading-tight min-h-[32px] mb-1">
                    {art.name}
                  </h4>
                  <div className="text-[10px] text-museum-gold font-semibold truncate mb-0.5">
                    {art.period || 'Hiện vật bảo tàng'}
                  </div>
                  <div className="text-[10px] text-gray-500 truncate flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-gray-400 shrink-0" />
                    <span className="truncate">
                      {art.location || (art.displayLocation ? `${art.displayLocation.floor}` : 'Tầng 1')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons: Xem chi tiết + Nghe thuyết minh */}
              <div className="mt-2.5 flex items-center gap-1.5 pt-2 border-t border-stone-100">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail(art);
                  }}
                  className="flex-1 h-8 px-2 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-museum-gold-lt" />
                  <span>Chi tiết</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleNarrate(e, art)}
                  aria-label={`Nghe thuyết minh hiện vật ${art.name}`}
                  className={`h-8 px-2.5 font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer border ${
                    isNarrating
                      ? 'bg-museum-gold text-white border-museum-gold'
                      : 'bg-museum-cream hover:bg-museum-gold hover:text-white text-museum-brown border-museum-gold/30'
                  }`}
                  title="Nghe giọng thuyết minh hướng dẫn viên"
                >
                  {isNarrating ? (
                    <>
                      <Square className="w-3 h-3 fill-current" />
                      <span>Dừng</span>
                    </>
                  ) : (
                    <>
                      <Volume2 className="w-3.5 h-3.5 text-museum-gold" />
                      <span>Nghe</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
