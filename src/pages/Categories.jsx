import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { FolderTree, Plus, ChevronRight } from 'lucide-react';

export const Categories = () => {
  const navigate = useNavigate();
  const { categories } = useApp();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Danh mục</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
            DANH MỤC HIỆN VẬT
          </h2>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors">
          <Plus className="w-5 h-5" />
          <span>+ Thêm danh mục</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {categories.map((c) => (
          <div
            key={c.id}
            role="button"
            tabIndex={0}
            onClick={() => navigate(`/admin/artifacts?category=${encodeURIComponent(c.id)}`)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                navigate(`/admin/artifacts?category=${encodeURIComponent(c.id)}`);
              }
            }}
            className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 hover:shadow-md transition-all duration-200 flex flex-col justify-between group cursor-pointer"
          >
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-xl bg-museum-cream flex items-center justify-center text-museum-gold">
                  <FolderTree className="w-5 h-5" />
                </div>
                <span className="text-xs font-bold text-museum-brown bg-museum-ivory px-2.5 py-1 rounded-full border border-museum-cream">
                  {c.count} hiện vật
                </span>
              </div>
              <h3 className="font-bold text-base text-museum-brown group-hover:text-museum-gold transition-colors">
                {c.name}
              </h3>
              <p className="text-xs text-gray-500 mt-2 line-clamp-2 leading-relaxed">
                {c.description}
              </p>
            </div>
            <div className="pt-4 mt-4 border-t border-gray-100 flex items-center justify-between text-xs text-museum-brown font-semibold">
              <span>Mã: {c.id}</span>
              <ChevronRight className="w-4 h-4 text-museum-gold group-hover:translate-x-1 transition-transform" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
