import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Plus, ChevronRight, X, FolderTree } from 'lucide-react';

// Specific image mappings matching the screenshot
const categoryImageMap = {
  DM01: '/images/vu-khi-quan-su.jpg',
  DM02: '/images/events/hero-events.jpg',
  DM03: '/images/sach-co-chu-han.jpg',
  DM04: '/images/events/thang-long-night.jpg',
  DM05: '/images/trang-phuc-trieu-dinh.jpg',
  DM06: '/images/binh-gom.jpg',
  DM07: '/images/tuong-phat.jpg',
  DM08: '/images/trong-dong.jpg',
  DM09: '/images/tuong-da-linh-vat.jpg',
  DM10: '/images/events/chu-dau-ceramic.jpg',
  DM11: '/images/museum-hero.jpg',
  DM12: '/images/events/dong-son-drum.jpg',
  DM13: '/images/bia-tien-si.jpg',
};

export const Categories = () => {
  const navigate = useNavigate();
  const { categories, addToast } = useApp();

  // Local state to support adding custom categories interactively
  const [categoriesData, setCategoriesData] = useState(() => {
    try {
      const saved = localStorage.getItem('custom_categories');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch (e) {
      console.error(e);
    }
    return categories;
  });

  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatDesc, setNewCatDesc] = useState('');

  const handleAddCategory = (e) => {
    e.preventDefault();
    if (!newCatName.trim()) return;

    const nextIdNum = categoriesData.length + 1;
    const nextId = `DM${String(nextIdNum).padStart(2, '0')}`;
    const newCategory = {
      id: nextId,
      name: newCatName.trim(),
      count: 0,
      description: newCatDesc.trim() || 'Bộ sưu tập hiện vật bảo tàng được phân loại và lưu trữ theo chuyên đề.',
    };

    const updated = [...categoriesData, newCategory];
    setCategoriesData(updated);
    try {
      localStorage.setItem('custom_categories', JSON.stringify(updated));
    } catch (err) {
      console.error(err);
    }

    if (addToast) {
      addToast(`Đã thêm danh mục "${newCategory.name}" thành công!`, 'success');
    }

    setNewCatName('');
    setNewCatDesc('');
    setIsAddModalOpen(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8 max-w-[1400px] mx-auto font-sans w-full min-w-0">
      {/* Header: Breadcrumbs, Title and + Thêm danh mục Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumbs matching screenshot */}
          <div className="text-xs text-[#8C7A6B] font-medium mb-1">
            <Link to="/dashboard" className="hover:text-[#2B170B] transition-colors">
              Tổng quan
            </Link>
            <span className="mx-1.5 text-[#8C7A6B] font-normal">/</span>
            <span className="text-[#2B170B] font-semibold">Danh mục</span>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-[#2B170B] tracking-tight uppercase">
            DANH MỤC HIỆN VẬT
          </h1>
        </div>

        {/* Button + Thêm danh mục matching screenshot */}
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 bg-[#4A2810] hover:bg-[#381D0B] text-white font-bold text-xs sm:text-sm rounded-full shadow-sm transition-all transform hover:scale-[1.02] cursor-pointer"
        >
          <Plus className="w-4 h-4 text-[#D4A359]" />
          <span>+ Thêm danh mục</span>
        </button>
      </div>

      {/* Categories Grid (4 columns matching screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {categoriesData.map((c) => {
          const imageSrc = categoryImageMap[c.id] || '/images/dong-son-showcase.jpg';
          const isFeatured = c.id === 'DM02'; // Highlights DM02 with warm gold title as in screenshot

          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/artifacts?category=${encodeURIComponent(c.id)}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/artifacts?category=${encodeURIComponent(c.id)}`);
                }
              }}
              className="bg-white rounded-2xl p-5 border border-[#ECE4D4] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Top Row: Thumbnail with "tg" badge + Count */}
                <div className="flex items-center justify-between mb-3">
                  {/* Thumbnail Container */}
                  <div className="relative w-20 h-13 rounded-xl overflow-hidden bg-[#FAF5EB] border border-[#E2DAC9] shrink-0">
                    <img
                      src={imageSrc}
                      alt={c.name}
                      onError={(e) => {
                        e.target.src = '/images/dong-son-showcase.jpg';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* "tg" museum badge overlay */}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-[#FAF5EB]/95 border border-[#E2DAC9] text-[10px] font-bold text-[#B88128] font-serif shadow-2xs leading-none">
                      tg
                    </div>
                  </div>

                  {/* Artifact Count Badge */}
                  <span className="text-xs font-semibold text-[#8C7A6B]">
                    {c.count} hiện vật
                  </span>
                </div>

                {/* Category Title */}
                <h3
                  className={`font-bold text-sm sm:text-[15px] transition-colors line-clamp-2 leading-snug ${
                    isFeatured
                      ? 'text-[#B88128]'
                      : 'text-[#2B170B] group-hover:text-[#B88128]'
                  }`}
                >
                  {c.name}
                </h3>

                {/* Category Description */}
                <p className="text-xs text-[#8C7A6B] mt-1.5 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
              </div>

              {/* Card Footer: Category Code + Chevron arrow */}
              <div className="pt-3 mt-4 border-t border-[#F4EFE6] flex items-center justify-between text-xs text-[#8C7A6B] font-medium">
                <span>Mã: {c.id}</span>
                <ChevronRight className="w-4 h-4 text-[#C9974C] group-hover:translate-x-1 transition-transform" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Thêm danh mục mới */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-[#ECE4D4] space-y-4">
            <div className="flex items-center justify-between border-b border-[#F4EFE6] pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[#FAF5EB] flex items-center justify-center text-[#B88128]">
                  <FolderTree className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-base text-[#2B170B]">Thêm danh mục mới</h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddCategory} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-[#5B3A1F] uppercase mb-1">
                  Tên danh mục <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="Ví dụ: Cổ vật cung đình, Tiền cổ..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ECE4D4] text-xs text-[#2B170B] focus:outline-none focus:ring-2 focus:ring-[#C9974C] bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5B3A1F] uppercase mb-1">
                  Mô tả danh mục
                </label>
                <textarea
                  rows={3}
                  value={newCatDesc}
                  onChange={(e) => setNewCatDesc(e.target.value)}
                  placeholder="Mô tả tóm tắt về các hiện vật trong danh mục..."
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#ECE4D4] text-xs text-[#2B170B] focus:outline-none focus:ring-2 focus:ring-[#C9974C] bg-white resize-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-[#F4EFE6]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#4A2810] hover:bg-[#381D0B] text-white shadow-xs transition-colors cursor-pointer"
                >
                  Lưu danh mục
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
