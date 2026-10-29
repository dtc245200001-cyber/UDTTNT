import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Heart } from 'lucide-react';
import { useApp } from '@/context/AppContext';

function highlightMatch(text, term) {
  if (!term || !term.trim() || !text) return text;
  const words = term
    .trim()
    .split(/\s+/)
    .filter((w) => w.length > 1)
    .map((w) => w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  if (words.length === 0) return text;
  const regex = new RegExp(`(${words.join('|')})`, 'gi');
  const parts = String(text).split(regex);
  return parts.map((part, i) =>
    regex.test(part) ? (
      <mark key={i} className="bg-[#D9A441]/35 text-[#5B3A1F] font-bold rounded-xs px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  );
}

export const ArtifactCard = ({ artifact, onClick, highlightTerm = '' }) => {
  const navigate = useNavigate();
  const { userFavorites = [], favoritesSummary, toggleArtifactFavorite } = useApp();

  const isFav = artifact ? (userFavorites || []).includes(artifact.id) : false;
  const itemLikes = artifact ? (favoritesSummary?.artifact_likes?.[artifact.id] || 0) : 0;

  // Helper to format display location: "Tầng 1 · Phòng A · Kệ 01"
  const locationText =
    artifact?.location ||
    (artifact?.displayLocation
      ? `${artifact.displayLocation.floor} · ${artifact.displayLocation.room} · ${artifact.displayLocation.shelf}`
      : 'Tầng 1 · Phòng A · Kệ 01');

  const handleClick = () => {
    if (onClick) {
      onClick(artifact);
    } else {
      navigate(`/artifacts/${artifact.id}`);
    }
  };

  return (
    <div
      onClick={handleClick}
      className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 border border-stone-200/80 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
    >
      <div>
        <div className="aspect-[4/3] overflow-hidden bg-museum-cream relative">
          <img
            src={artifact.image || './images/museum-hero.jpg'}
            alt={artifact.name}
            onError={(e) => {
              e.target.src = './images/museum-hero.jpg';
            }}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-3 right-3 flex items-center gap-1.5">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                toggleArtifactFavorite(artifact.id);
              }}
              className={`px-2 py-0.5 rounded-full ${
                isFav
                  ? 'bg-red-500/90 text-white shadow-xs'
                  : 'bg-black/50 hover:bg-black/70 text-white'
              } flex items-center gap-1 text-[11px] font-semibold transition-all cursor-pointer backdrop-blur-xs`}
              title={isFav ? `Đã yêu thích (${itemLikes} lượt)` : `Lưu yêu thích (${itemLikes} lượt)`}
            >
              <Heart className={`w-3 h-3 ${isFav ? 'fill-white text-white' : 'text-white stroke-[2]'}`} />
              {itemLikes > 0 && <span className="text-[10px]">{itemLikes}</span>}
            </button>
            <div className="bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2 py-0.5 rounded-full">
              {artifact.id}
            </div>
          </div>
          {(artifact.badge || artifact.period || artifact.culture) && (
            <div className="absolute top-3 left-3 bg-museum-brown/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              {artifact.badge || artifact.period || artifact.culture}
            </div>
          )}
        </div>

        <div className="p-4 space-y-1.5">
          <h4 className="typo-card-title text-museum-brown group-hover:text-museum-gold transition-colors min-h-[2.7em]">
            {highlightMatch(artifact.name, highlightTerm)}
          </h4>
          {artifact.date && (
            <p className="typo-meta text-xs font-semibold text-museum-gold">Niên đại: {artifact.date}</p>
          )}
          <p className="typo-body text-xs text-stone-500 line-clamp-2 leading-relaxed font-normal">
            {artifact.description}
          </p>
        </div>
      </div>

      {/* Card Footer: Display Location Only (NO "AI phân tích" button) */}
      <div className="px-4 pb-4 pt-2.5 border-t border-stone-100 flex items-center gap-1.5 text-xs font-medium text-stone-600">
        <MapPin className="w-3.5 h-3.5 text-museum-gold shrink-0" />
        <span className="truncate">Vị trí: {locationText}</span>
      </div>
    </div>
  );
};
