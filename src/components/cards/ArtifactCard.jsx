import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin } from 'lucide-react';

export const ArtifactCard = ({ artifact, onClick }) => {
  const navigate = useNavigate();

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
      className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 border border-gray-100 transition-all duration-300 cursor-pointer group flex flex-col justify-between"
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
          <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
            {artifact.id}
          </div>
          {artifact.period && (
            <div className="absolute top-3 left-3 bg-museum-brown/90 text-white text-[10px] font-bold px-2.5 py-1 rounded-full">
              {artifact.period}
            </div>
          )}
        </div>

        <div className="p-4 space-y-1.5">
          <h4 className="font-bold text-base text-museum-brown group-hover:text-museum-gold transition-colors line-clamp-1">
            {artifact.name}
          </h4>
          {artifact.date && (
            <p className="text-xs font-semibold text-museum-gold">Niên đại: {artifact.date}</p>
          )}
          <p className="text-xs text-gray-500 line-clamp-2 leading-relaxed font-normal">
            {artifact.description}
          </p>
        </div>
      </div>

      {/* Card Footer: Display Location Only (NO "AI phân tích" button) */}
      <div className="px-4 pb-4 pt-2.5 border-t border-gray-100 flex items-center gap-1.5 text-xs font-medium text-gray-600">
        <MapPin className="w-3.5 h-3.5 text-museum-gold shrink-0" />
        <span className="truncate">Vị trí: {locationText}</span>
      </div>
    </div>
  );
};
