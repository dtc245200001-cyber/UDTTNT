import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Search, ChevronDown, RefreshCw, LayoutGrid, SlidersHorizontal } from 'lucide-react';
import { ArtifactCard } from '@/components/cards/ArtifactCard';
import { ArtifactDetailModal } from '@/components/artifacts/ArtifactDetailModal';
import { EmptyState } from '@/components/ui/EmptyState';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { useVoiceSearch } from '@/hooks/useVoiceSearch';
import { searchArtifacts } from '@/lib/searchArtifacts';

const BATCH_SIZE = 12;

// SVG Icon for Voice Search (native SVG, no extra dependencies)
const MicIcon = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>
    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
    <line x1="12" x2="12" y1="19" y2="22" />
  </svg>
);

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
  const resultsRef = useRef(null);

  // Sync category or search query from URL params
  useEffect(() => {
    const cat = searchParams.get('category');
    if (cat) setSelectedCategory(cat);
    const q = searchParams.get('q');
    if (q) setSearchTerm(q);
  }, [searchParams]);

  // Hook useVoiceSearch
  const voice = useVoiceSearch({
    onFinalTranscript: (finalText) => {
      if (!finalText.trim()) return;
      setSearchTerm(finalText);
      setVisibleCount(BATCH_SIZE);
      searchParams.set('q', finalText);
      setSearchParams(searchParams);

      // Cuộn mượt tới danh sách kết quả sau khi tìm bằng giọng nói
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 150);
    },
  });

  // Toggle voice search
  const handleToggleVoice = () => {
    if (voice.listening) {
      voice.stop();
    } else {
      voice.start();
    }
  };

  // Alt+M shortcut to toggle voice search
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.altKey && (e.key === 'm' || e.key === 'M')) {
        e.preventDefault();
        handleToggleVoice();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [voice.listening, voice.supported]);

  // Filtered Artifacts list using smart searchArtifacts engine
  const searchResult = useMemo(() => {
    if (!searchTerm.trim()) {
      const list =
        selectedCategory === 'Tất cả'
          ? artifacts
          : artifacts.filter(
              (item) => item.category === selectedCategory || item.categoryId === selectedCategory
            );
      return {
        results: list,
        interpretedQuery: '',
        usedFilters: {},
        suggestions: [],
      };
    }
    return searchArtifacts(searchTerm, artifacts, categories, {
      forcedCategory: selectedCategory,
    });
  }, [artifacts, categories, searchTerm, selectedCategory]);

  const filteredArtifacts = searchResult.results;



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
    <div className="min-h-screen bg-[#FBF7F0] animate-fadeIn font-sans pb-12 relative overflow-hidden">
      {/* ── Hero Banner: Chiều cao chuẩn 220-240px, nền màu nâu tối, ảnh bảo tàng mờ dần ── */}
      <div className="relative min-h-[220px] md:h-[240px] bg-[#200e05] overflow-hidden select-none flex items-center">
        {/* Right side museum image with glass cabinets & statues */}
        <div className="absolute right-0 top-0 bottom-0 w-full md:w-[70%] opacity-35 md:opacity-100 pointer-events-none">
          <img
            src="/images/museum-gallery-banner.jpg"
            alt="Khám phá hiện vật bảo tàng"
            className="w-full h-full object-cover object-center"
            style={{
              WebkitMaskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 10%, rgba(0,0,0,0.25) 22%, rgba(0,0,0,0.50) 36%, rgba(0,0,0,0.78) 52%, #000 72%)',
              maskImage: 'linear-gradient(to right, transparent 0%, rgba(0,0,0,0.08) 10%, rgba(0,0,0,0.25) 22%, rgba(0,0,0,0.50) 36%, rgba(0,0,0,0.78) 52%, #000 72%)'
            }}
            onError={(e) => { e.target.src = '/images/museum-hero.jpg'; }}
          />
        </div>

        {/* Lớp phủ gradient mềm lên trên ảnh (pointer-events-none) */}
        <div 
          className="absolute inset-0 pointer-events-none hidden md:block"
          style={{
            background: 'linear-gradient(to right, #200e05 0%, #200e05 35%, rgba(32,14,5,0.85) 44%, rgba(32,14,5,0.60) 54%, rgba(32,14,5,0.30) 66%, rgba(32,14,5,0.10) 78%, transparent 90%)'
          }}
        />

        {/* Content container */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-0 flex flex-col justify-center">
          <div className="max-w-full md:max-w-[60%] relative z-10">
            {/* Breadcrumb: TRANG CHỦ / KHÁM PHÁ HIỆN VẬT */}
            <div className="relative z-10">
              <Breadcrumb
                items={[
                  { label: 'TRANG CHỦ', path: '/' },
                  { label: 'KHÁM PHÁ HIỆN VẬT' },
                ]}
                variant="dark"
              />
            </div>

            {/* Title: Serif bold, large, white */}
            <h1 
              className="typo-page-title text-white tracking-wide leading-tight relative z-10"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,.45)' }}
            >
              KHÁM PHÁ HIỆN VẬT
            </h1>

            {/* Description */}
            <p className="typo-body text-[#F5EFE0]/80 line-clamp-2 mt-2 max-w-xl relative z-10">
              Không gian lưu giữ và giới thiệu hơn {artifacts.length} hiện vật, bảo vật quốc gia và tư liệu lịch sử qua {categories.length} danh mục đặc sắc của Bảo tàng.
            </p>

            {/* Short gold divider bar */}
            <div className="w-14 h-[2px] bg-[#D4A359] mt-3 rounded-full relative z-10" />
          </div>
        </div>
      </div>

      {/* ── Main Content Container ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-6 pt-5 relative z-10">
        {/* ── Filter Tabs & Search Bar (Khung thanh lọc phong cách Chuyên đề) ── */}
        <div className="bg-white px-4 sm:px-5 py-3 rounded-2xl md:rounded-full border border-stone-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Categories Horizontal Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 [&::-webkit-scrollbar]:hidden scroll-smooth flex-1 min-w-0">
            <button
              onClick={() => handleCategorySelect('Tất cả')}
              className={`relative h-9 sm:h-10 px-3.5 sm:px-4 rounded-full typo-btn text-xs sm:text-[13px] tracking-normal transition-all duration-200 shrink-0 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A1E]/40 ${
                selectedCategory === 'Tất cả'
                  ? 'bg-[#8B5A1E] text-white shadow-xs font-bold'
                  : 'bg-[#F4EFEA] hover:bg-[#EAE2D8] text-[#5C4535] font-semibold'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
              <span>Tất cả</span>
              <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ml-1.5 shrink-0 inline-flex items-center justify-center leading-none ${
                selectedCategory === 'Tất cả' ? 'bg-[#B8860B] text-white' : 'bg-stone-200/80 text-stone-600'
              }`}>
                {artifacts.length}
              </span>
            </button>
            {categories.map((cat) => {
              const count = artifacts.filter((a) => a.category === cat.name || a.categoryId === cat.id).length;
              const isSelected = selectedCategory === cat.name || selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => handleCategorySelect(cat.name)}
                  className={`relative h-9 sm:h-10 px-3.5 sm:px-4 rounded-full typo-btn text-xs sm:text-[13px] tracking-normal transition-all duration-200 shrink-0 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A1E]/40 ${
                    isSelected
                      ? 'bg-[#8B5A1E] text-white shadow-xs font-bold'
                      : 'bg-[#F4EFEA] hover:bg-[#EAE2D8] text-[#5C4535] font-semibold'
                  }`}
                >
                  <span>{cat.name}</span>
                  <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ml-1.5 shrink-0 inline-flex items-center justify-center leading-none ${
                    isSelected ? 'bg-[#B8860B] text-white' : 'bg-stone-200/80 text-stone-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-col gap-1 w-full md:w-96 shrink-0">
            <div className="flex items-center gap-2.5 w-full">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={voice.listening ? (voice.interimTranscript || 'Đang nghe bạn nói...') : searchTerm}
                  onChange={handleSearchChange}
                  placeholder={voice.listening ? 'Đang nghe bạn nói...' : 'Tìm theo tên hiện vật, niên đại, văn hóa...'}
                  className={`search-input w-full pl-10 pr-20 text-xs sm:text-sm transition-all duration-200 ${
                    voice.listening
                      ? 'border-[#B8860B] ring-2 ring-[#B8860B]/30 bg-[#FFFDF8] text-[#5B3A1F] font-medium placeholder:text-[#B8860B]'
                      : 'placeholder:text-stone-400'
                  }`}
                />

                {/* Right controls inside input: Clear button & Voice Mic */}
                <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                  {searchTerm && !voice.listening && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        searchParams.delete('q');
                        setSearchParams(searchParams);
                      }}
                      className="w-7 h-7 flex items-center justify-center text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer transition-colors rounded-full hover:bg-stone-100"
                      title="Xóa tìm kiếm"
                    >
                      ✕
                    </button>
                  )}

                  {/* Voice Mic Button (SVG only, brown/gold palette #5B3A1F, #B8860B, #D9A441, min 44px for mobile) */}
                  {voice.supported ? (
                    <div className="relative flex items-center justify-center">
                      <button
                        type="button"
                        onClick={handleToggleVoice}
                        aria-label={voice.listening ? 'Dừng nhận dạng giọng nói' : 'Tìm kiếm hiện vật bằng giọng nói (Alt+M)'}
                        title={voice.listening ? 'Dừng nhận dạng giọng nói (Alt+M)' : 'Tìm kiếm bằng giọng nói (Alt+M)'}
                        className={`min-w-[44px] min-h-[44px] w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all duration-300 cursor-pointer relative ${
                          voice.listening
                            ? 'bg-gradient-to-br from-[#8B5A1E] via-[#B8860B] to-[#D9A441] text-white shadow-[0_0_15px_rgba(184,134,11,0.5)]'
                            : 'text-[#5B3A1F] hover:text-[#B8860B] hover:bg-[#F4EFEA]'
                        }`}
                      >
                        {/* Pulsing ripple wave animation when listening */}
                        {voice.listening && (
                          <>
                            <span className="absolute inset-0 rounded-full bg-[#B8860B]/40 animate-ping pointer-events-none" />
                            <span className="absolute -inset-1 rounded-full border border-[#D9A441] animate-pulse pointer-events-none" />
                          </>
                        )}
                        <MicIcon className={`w-4 h-4 transition-transform ${voice.listening ? 'scale-110 text-white animate-bounce' : 'text-[#5B3A1F]'}`} />
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>

              <button
                type="button"
                className="w-11 h-11 rounded-full bg-white border border-stone-200 flex items-center justify-center text-stone-600 hover:text-[#8B5A1E] hover:bg-stone-50 shadow-2xs shrink-0 cursor-pointer transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A1E]/40"
                title="Bộ lọc nâng cao"
              >
                <SlidersHorizontal className="w-4 h-4" />
              </button>
            </div>

            {/* Listening Live Indicator */}
            {voice.listening && (
              <div className="flex items-center justify-between px-2 pt-1">
                <div className="flex items-center gap-2 text-xs font-bold text-[#8B5A1E]">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span>Đang nghe bạn nói... (Nói xong sẽ tự tìm)</span>
                </div>
                <button
                  type="button"
                  onClick={voice.stop}
                  className="text-[11px] text-stone-500 hover:text-[#8B5A1E] underline font-medium cursor-pointer"
                >
                  Dừng nghe
                </button>
              </div>
            )}

            {/* Unsupported Browser Notice */}
            {!voice.supported && (
              <p className="text-[11px] text-stone-400 italic px-2">
                Tìm kiếm giọng nói hoạt động tốt nhất trên Chrome hoặc Edge
              </p>
            )}

            {/* Privacy notice */}
            <div className="text-[10px] text-stone-400 text-right px-1 select-none">
              Giọng nói được xử lý bởi trình duyệt của bạn
            </div>
          </div>
        </div>

        {/* Voice Error Alert */}
        {voice.error && (
          <div className="bg-amber-50/90 border border-amber-200 text-amber-900 px-4 py-3 rounded-2xl text-xs sm:text-sm flex items-center justify-between gap-3 shadow-xs animate-fadeIn">
            <div className="flex items-center gap-2">
              <span className="text-base">⚠️</span>
              <span>{voice.error}</span>
            </div>
            <button
              type="button"
              onClick={voice.reset}
              className="text-amber-700 hover:text-amber-950 font-bold px-2 py-1 rounded-md hover:bg-amber-100 transition-colors cursor-pointer"
            >
              ✕ Đóng
            </button>
          </div>
        )}

        {/* Counter Summary */}
        <div ref={resultsRef} className="flex items-center justify-between text-xs sm:text-sm text-stone-500 font-medium px-1 pt-1">
          <div>
            Đang hiển thị: <strong className="text-[#8B5A1E] font-extrabold">{displayedArtifacts.length}</strong> / {filteredArtifacts.length} hiện vật phù hợp
            {selectedCategory !== 'Tất cả' && (
              <span className="ml-2 text-[#B8860B] font-bold">({selectedCategory})</span>
            )}
          </div>
        </div>

        {/* Artifacts Grid */}
        {displayedArtifacts.length === 0 ? (
          <div className="bg-white rounded-2xl p-10 sm:p-12 text-center border border-stone-100 shadow-xs">
            <EmptyState
              title="Chưa có hiện vật nào phù hợp"
              subtitle={
                searchTerm
                  ? `Không tìm thấy hiện vật nào khớp với từ khóa "${searchTerm}". Bạn có thể thử các gợi ý bên dưới hoặc nói lại cụm từ khác.`
                  : 'Hiện tại không tìm thấy hiện vật nào theo bộ lọc đã chọn. Vui lòng thử chuyển danh mục khác.'
              }
            />

            {/* 3 Clickable Smart Suggestions when 0 results */}
            {searchResult.suggestions?.length > 0 && (
              <div className="mt-5 max-w-lg mx-auto">
                <p className="text-xs text-stone-500 font-semibold mb-2">💡 Gợi ý từ khóa tương tự:</p>
                <div className="flex flex-wrap items-center justify-center gap-2">
                  {searchResult.suggestions.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setSearchTerm(sug);
                        searchParams.set('q', sug);
                        setSearchParams(searchParams);
                      }}
                      className="text-xs px-3.5 py-1.5 rounded-full bg-[#F4EFEA] hover:bg-[#EAE2D8] text-[#5B3A1F] font-semibold border border-[#D9A441]/40 transition-all cursor-pointer hover:shadow-2xs"
                    >
                      🔎 {sug}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => {
                setSearchTerm('');
                setSelectedCategory('Tất cả');
                searchParams.delete('q');
                searchParams.delete('category');
                setSearchParams(searchParams);
              }}
              className="btn-primary mt-6 h-11 px-6 typo-btn gap-2 shadow-md cursor-pointer"
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
                highlightTerm={searchTerm}
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
              className="btn-secondary h-11 px-8 typo-btn gap-2 shadow-xs hover:shadow-md cursor-pointer"
            >
              <span>Xem thêm hiện vật ({filteredArtifacts.length - visibleCount} còn lại)</span>
              <ChevronDown className="w-4 h-4 text-[#8B5A1E] animate-bounce" />
            </button>
          </div>
        )}

        {/* Bottom Quote Banner */}
        <div className="flex items-center justify-center gap-3 pt-10 text-stone-400 text-xs tracking-wider uppercase select-none">
          <div className="h-[1px] w-20 sm:w-36 bg-stone-300" />
          <span>Bảo tồn di sản – Lan tỏa văn hóa dân tộc</span>
          <div className="h-[1px] w-20 sm:w-36 bg-stone-300" />
        </div>
      </div>

      {/* Decorative Lotus Watermark in Bottom Left (Giống trang Chuyên đề) */}
      <div className="fixed bottom-0 left-0 pointer-events-none opacity-20 z-0 select-none">
        <svg width="220" height="180" viewBox="0 0 240 200" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M120 180C120 180 80 120 80 80C80 40 120 10 120 10C120 10 160 40 160 80C160 120 120 180 120 180Z" stroke="#B8860B" strokeWidth="1.5" strokeOpacity="0.5"/>
          <path d="M120 180C120 180 50 140 40 100C30 60 70 30 70 30C70 30 90 70 120 180Z" stroke="#B8860B" strokeWidth="1.2" strokeOpacity="0.4"/>
          <path d="M120 180C120 180 190 140 200 100C210 60 170 30 170 30C170 30 150 70 120 180Z" stroke="#B8860B" strokeWidth="1.2" strokeOpacity="0.4"/>
          <path d="M120 180C120 180 20 160 10 130C0 100 30 80 30 80C30 80 60 110 120 180Z" stroke="#B8860B" strokeWidth="1.2" strokeOpacity="0.3"/>
          <path d="M120 180C120 180 220 160 230 130C240 100 210 80 210 80C210 80 180 110 120 180Z" stroke="#B8860B" strokeWidth="1.2" strokeOpacity="0.3"/>
          <path d="M40 185C80 175 160 175 200 185" stroke="#B8860B" strokeWidth="1.5" strokeOpacity="0.4"/>
        </svg>
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
