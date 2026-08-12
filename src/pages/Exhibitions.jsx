import React from 'react';
import { useApp } from '@/context/AppContext';
import { Archive, Plus } from 'lucide-react';
import { ExhibitionCard } from '@/components/cards/ExhibitionCard';

export const Exhibitions = () => {
  const { exhibitions } = useApp();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Triển lãm</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
            QUẢN LÝ TRIỂN LÃM CHUYÊN ĐỀ
          </h2>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors">
          <Plus className="w-5 h-5" />
          <span>+ Tạo triển lãm mới</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exhibitions.map((item) => (
          <ExhibitionCard key={item.id} exhibition={item} />
        ))}
      </div>
    </div>
  );
};
