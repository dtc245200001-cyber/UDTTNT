import React from 'react';
import { useNavigate } from 'react-router-dom';

export const ArtifactCard = ({ artifact }) => {
  const navigate = useNavigate();

  return (
    <div
      onClick={() => navigate(`/artifacts/${artifact.id}`)}
      className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-gray-100 transition-all duration-300 cursor-pointer group flex flex-col"
    >
      <div className="aspect-[4/3] overflow-hidden bg-museum-cream relative">
        <img
          src={artifact.image}
          alt={artifact.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-xs text-white text-[11px] font-semibold px-2.5 py-1 rounded-full">
          {artifact.id}
        </div>
      </div>
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div>
          <h4 className="font-bold text-base text-museum-brown group-hover:text-museum-gold transition-colors line-clamp-1">
            {artifact.name}
          </h4>
          <p className="text-xs font-medium text-gray-500 mt-1">{artifact.culture}</p>
        </div>
        <p className="text-xs text-gray-400 font-normal mt-2">{artifact.period}</p>
      </div>
    </div>
  );
};
