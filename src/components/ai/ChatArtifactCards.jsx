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
              className={`flex-shrink-0 w-68 bg-white rounded-xl p-2.5 border transition-all cursor-pointer snap-center text-left ${
                isNarrating
                  ? 'border-museum-gold ring-2 ring-museum-gold/30 shadow-md bg-amber-50/20'
                  : 'border-museum-gold/30 shadow-2xs hover:shadow-md hover:border-museum-gold'
              }`}
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

              {/* Action Buttons: Xem chi tiết + Nghe thuyết minh */}
              <div className="mt-2.5 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onViewDetail(art);
                  }}
                  className="flex-1 min-h-[36px] py-1.5 px-2 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5 text-museum-gold-lt" />
                  <span>Chi tiết</span>
                </button>
                <button
                  type="button"
                  onClick={(e) => handleNarrate(e, art)}
                  aria-label={`Nghe thuyết minh hiện vật ${art.name}`}
                  className={`min-h-[36px] py-1.5 px-2.5 font-bold text-[11px] rounded-lg transition-colors flex items-center justify-center gap-1 cursor-pointer border ${
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
