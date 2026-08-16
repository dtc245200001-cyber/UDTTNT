import React, { useState, useMemo, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Search, Sparkles, Filter, ChevronDown, RefreshCw } from 'lucide-react';
import { ArtifactCard } from '@/components/cards/ArtifactCard';
import { ArtifactDetailModal } from '@/components/artifacts/ArtifactDetailModal';
import { EmptyState } from '@/components/ui/EmptyState';

const BATCH_SIZE = 16;

export const ExploreArtifacts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialCategory = searchParams.get('category') || 'Tất cả';
  const initialQuery = searchParams.get('q') || '';

  const { artifacts, categories } = useApp();

  const [searchTerm, setSearchTerm] = useState(initialQuery);
  const [selectedCategory, setSelectedCategory] = useState(initialCategory);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [selectedArtifact, setSelectedArtifact] = useState(null);

  // Sync category or search query from URL params
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  // Filtered Artifacts list
  const filteredArtifacts = useMemo(() => {
    return artifacts.filter((item) => {
      const matchSearch =
        !searchTerm.trim() ||
        (item.name && item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.description && item.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.culture && item.culture.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.period && item.period.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.id && item.id.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchCategory =
        selectedCategory === 'Tất cả' ||
        item.category === selectedCategory ||
        item.categoryId === selectedCategory;

      return matchSearch && matchCategory;
    });
  }, [artifacts, searchTerm, selectedCategory]);

  // Reset pagination on filter change
  const handleCategorySelect = (catName) => {
    setSelectedCategory(catName);
    setVisibleCount(BATCH_SIZE);
    if (catName === 'Tất cả') {
      searchParams.delete('category');
    } else {
      searchParams.set('category', catName);
    }
    setSearchParams(searchParams);
  };

  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearchTerm(val);
    setVisibleCount(BATCH_SIZE);
    if (!val.trim()) {
      searchParams.delete('q');
    } else {
      searchParams.set('q', val);
    }
    setSearchParams(searchParams);
  };

  const handleLoadMore = () => {
    setVisibleCount((prev) => prev + BATCH_SIZE);
  };

  const displayedArtifacts = filteredArtifacts.slice(0, visibleCount);
  const hasMore = visibleCount < filteredArtifacts.length;

  return (
    <div className="min-h-screen bg-museum-ivory py-8 px-4 sm:px-6 lg:px-8 font-sans animate-fadeIn">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header Title Banner */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-museum-cream border border-museum-gold/40 text-museum-brown text-xs font-extrabold uppercase tracking-wider shadow-xs">
            <Sparkles className="w-4 h-4 text-museum-gold" />
            <span>Kho Tàng Di Sản Quốc Gia</span>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black text-museum-brown tracking-tight">
            KHÁM PHÁ HIỆN VẬT BẢO TÀNG
          </h1>
          <p className="text-sm sm:text-base text-gray-600 leading-relaxed font-normal">
            Khám phá hơn 270 hiện vật, bảo vật quốc gia và tư liệu lịch sử quý hiếm qua {categories.length} danh mục đặc sắc, đại diện cho 4.000 năm văn hiến dân tộc.
          </p>
        </div>

        {/* Search & Category Filter Section */}
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 space-y-5">
          {/* Search Input */}
          <div className="relative max-w-2xl mx-auto">
            <Search className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={handleSearchChange}
              placeholder="Tìm kiếm hiện vật theo tên, niên đại, văn hóa, chất liệu..."
              className="w-full pl-12 pr-4 py-3 bg-gray-50 text-sm text-gray-800 rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold focus:bg-white transition-all shadow-inner"
            />
            {searchTerm && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  searchParams.delete('q');
                  setSearchParams(searchParams);
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-gray-400 hover:text-museum-brown"
              >
                Xóa
              </button>
            )}
          </div>

          {/* 8 Categories Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
            <button
              onClick={() => handleCategorySelect('Tất cả')}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs flex-shrink-0 cursor-pointer ${
                selectedCategory === 'Tất cả'
                  ? 'bg-museum-brown text-white shadow-md'
                  : 'bg-gray-100 text-gray-700 hover:bg-museum-cream hover:text-museum-brown'
              }`}
            >
              Tất cả ({artifacts.length})
            </button>
            {categories.map((cat) => {
              const count = artifacts.filter((a) => a.category === cat.name || a.categoryId === cat.id).length;
              const isSelected = selectedCategory === cat.name || selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.name)}
                  className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all shadow-xs flex-shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-museum-brown text-white shadow-md'
                      : 'bg-gray-100 text-gray-700 hover:bg-museum-cream hover:text-museum-brown'
                  }`}
                >
                  {cat.name} ({count})
                </button>
              );
            })}
          </div>
        </div>

        {/* Counter Summary */}
        <div className="flex items-center justify-between text-xs sm:text-sm text-gray-500 font-medium px-1">
          <div>
            Đang hiển thị: <strong className="text-museum-brown font-extrabold">{displayedArtifacts.length}</strong> / {filteredArtifacts.length} hiện vật phù hợp
            {selectedCategory !== 'Tất cả' && (
              <span className="ml-2 text-museum-gold font-bold">({selectedCategory})</span>
            )}
          </div>
        </div>

        {/* Artifacts Grid */}
        {displayedArtifacts.length === 0 ? (
          <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-xs">
            <EmptyState message="Không tìm thấy hiện vật nào phù hợp với điều kiện tìm kiếm." />
            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('Tất cả');
                searchParams.delete('q');
                searchParams.delete('category');
                setSearchParams(searchParams);
              }}
              className="mt-4 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors inline-flex items-center gap-2 cursor-pointer"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Xem tất cả hiện vật</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayedArtifacts.map((item) => (
              <ArtifactCard
                key={item.id}
                artifact={item}
                onClick={() => setSelectedArtifact(item)}
              />
            ))}
          </div>
        )}

        {/* Load More Button */}
        {hasMore && (
          <div className="text-center pt-4">
            <button
              onClick={handleLoadMore}
              className="inline-flex items-center gap-2 px-8 py-3.5 bg-white hover:bg-museum-cream text-museum-brown font-extrabold text-sm rounded-2xl border-2 border-museum-gold shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 cursor-pointer"
            >
              <span>Xem thêm hiện vật ({filteredArtifacts.length - visibleCount} còn lại)</span>
              <ChevronDown className="w-5 h-5 text-museum-gold animate-bounce" />
            </button>
          </div>
        )}
      </div>

      {/* Artifact Detail Modal */}
      <ArtifactDetailModal
        artifact={selectedArtifact}
        isOpen={!!selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
      />
    </div>
  );
};
