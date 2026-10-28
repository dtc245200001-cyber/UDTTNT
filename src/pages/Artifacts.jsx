import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Search,
  MapPin,
  CalendarDays,
  Landmark,
  Star,
  FolderTree,
  Sparkles,
  SlidersHorizontal,
  Heart,
  Plus,
  RefreshCw,
  AlertCircle,
  ChevronRight,
  Pencil,
  Trash2,
} from 'lucide-react';
import { Pagination } from '@/components/ui/Pagination';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ArtifactFormModal } from '@/components/artifacts/ArtifactFormModal';
import { ArtifactDetailModal } from '@/components/artifacts/ArtifactDetailModal';
import { removeVietnameseTones } from '@/utils/artifactSearch';
import { formatNumber } from '@/utils/formatters';

// Custom Vase Icon matching screenshot
const VaseIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6v2l-1 2c0 2 3 3 3 7a5 5 0 0 1-10 0c0-4 3-5 3-7L9 5V3z" />
    <path d="M8.5 14h7" />
  </svg>
);

export const Artifacts = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const queryParam = searchParams.get('q') || '';
  const categoryParam = searchParams.get('category') || '';

  const {
    artifacts,
    deletedArtifactIds = [],
    categories,
    deleteArtifact,
    currentUser,
    favoritesSummary,
    userFavorites = [],
    toggleArtifactFavorite,
  } = useApp();

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedPeriod, setSelectedPeriod] = useState('Tất cả');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [activeStatFilter, setActiveStatFilter] = useState('all'); // 'all' | 'new' | 'featured'
  const [currentPage, setCurrentPage] = useState(1);

  // Modals state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [artifactToEdit, setArtifactToEdit] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedDetailArtifact, setSelectedDetailArtifact] = useState(null);

  // Sync queryParam if present in URL
  useEffect(() => {
    if (queryParam) setSearchTerm(queryParam);
  }, [queryParam]);

  // Sync categoryParam if present in URL
  useEffect(() => {
    if (categoryParam && categories && categories.length > 0) {
      const cleanParam = categoryParam.trim().toLowerCase();
      const matched = categories.find(
        (c) =>
          (c.id && String(c.id).toLowerCase() === cleanParam) ||
          (c.name && c.name.toLowerCase() === cleanParam)
      );
      if (matched) {
        setSelectedCategory(matched.name);
        setCurrentPage(1);
      }
    }
  }, [categoryParam, categories]);

  // Danh sách hiện vật thực tế của hệ thống từ CSDL, tôn trọng các hiện vật bị xóa
  const fullArtifactsList = useMemo(() => {
    return (artifacts || [])
      .filter((a) => !deletedArtifactIds.includes(a.id))
      .map((a, idx) => {
        const rawPeriod = (a.period || a.culture || a.badge || '').trim();
        const rawCulture = (a.culture || a.period || '').trim();
        return {
          ...a,
          period: rawPeriod || 'Hiện đại',
          culture: rawCulture || rawPeriod || 'Lịch sử Việt Nam',
          badge: a.badge || rawPeriod || 'Hiện đại',
          badgeColor:
            a.badgeColor ||
            (idx % 4 === 0
              ? 'bg-[#B88128]'
              : idx % 4 === 1
              ? 'bg-[#1E7E34]'
              : idx % 4 === 2
              ? 'bg-[#4A148C]'
              : 'bg-[#2B2B2B]'),
          material: a.material || a.category || 'Đồng',
          location: a.location || 'Phòng trưng bày A',
        };
      });
  }, [artifacts, deletedArtifactIds]);

  // 1. Thống kê số hiện vật đang trưng bày từ CSDL
  const displayingArtifactsCount = useMemo(() => {
    return fullArtifactsList.filter((a) => (a.status || 'Đang trưng bày') === 'Đang trưng bày').length;
  }, [fullArtifactsList]);

  // 2. Thống kê số danh mục thực tế đang có hiện vật
  const activeCategoriesCount = useMemo(() => {
    const set = new Set(fullArtifactsList.map((a) => a.category).filter(Boolean));
    return set.size;
  }, [fullArtifactsList]);

  // Helper kiểm tra hiện vật mới bổ sung
  const isArtifactNew = useCallback((item) => {
    if (!item) return false;
    if (item.is_new || item.isNew) return true;
    if (item.created_at || item.createdAt) {
      const diffDays = (Date.now() - new Date(item.created_at || item.createdAt).getTime()) / (1000 * 60 * 60 * 24);
      if (!isNaN(diffDays) && diffDays <= 60) return true;
    }
    const num = parseInt(String(item.id).replace(/\D/g, ''), 10);
    return !isNaN(num) && num > 270;
  }, []);

  // Helper kiểm tra hiện vật nổi bật: đồng bộ chuẩn xác theo tổng lượt lưu & yêu thích của cộng đồng
  const isArtifactFeatured = useCallback(
    (item) => {
      if (!item) return false;
      const itemLikes = favoritesSummary?.artifact_likes?.[item.id] || 0;
      const isUserFav = (userFavorites || []).includes(item.id);
      return itemLikes > 0 || isUserFav;
    },
    [favoritesSummary, userFavorites]
  );

  // 3. Hiện vật mới bổ sung thực tế từ CSDL
  const newArtifactsCount = useMemo(() => {
    return fullArtifactsList.filter(isArtifactNew).length;
  }, [fullArtifactsList, isArtifactNew]);

  // 4. Hiện vật nổi bật được tính chuẩn xác theo tổng lượt lưu & yêu thích của toàn bộ người dùng
  const featuredArtifactsCount = useMemo(() => {
    return fullArtifactsList.filter(isArtifactFeatured).length;
  }, [fullArtifactsList, isArtifactFeatured]);

  const totalLikesCount = useMemo(() => {
    return favoritesSummary?.total_likes || 0;
  }, [favoritesSummary]);

  // Filtered Artifacts list
  const filteredArtifacts = useMemo(() => {
    const cleanSearch = removeVietnameseTones(searchTerm);

    let list = fullArtifactsList.filter((item) => {
      const nameClean = removeVietnameseTones(item.name || '');
      const catClean = removeVietnameseTones(item.category || '');
      const periodClean = removeVietnameseTones(item.period || item.culture || item.date || '');
      const descClean = removeVietnameseTones(item.description || '');
      const matClean = removeVietnameseTones(item.material || '');

      const matchSearch =
        !cleanSearch ||
        nameClean.includes(cleanSearch) ||
        catClean.includes(cleanSearch) ||
        periodClean.includes(cleanSearch) ||
        descClean.includes(cleanSearch) ||
        matClean.includes(cleanSearch);

      const matchCategory =
        selectedCategory === 'Tất cả' || item.category === selectedCategory;

      const periodTerms = [
        item.period,
        item.culture,
        item.badge,
        item.date,
      ]
        .filter(Boolean)
        .map((s) => removeVietnameseTones(String(s)).toLowerCase());

      const selectedPeriodClean = removeVietnameseTones(selectedPeriod).toLowerCase();

      const matchPeriod =
        selectedPeriod === 'Tất cả' ||
        periodTerms.some((t) => {
          if (t.includes(selectedPeriodClean)) return true;
          if (selectedPeriodClean === 'hien dai' && (t.includes('modern') || t.includes('hien dai'))) return true;
          if (selectedPeriodClean === 'co dai' && (t.includes('ancient') || t.includes('co dai'))) return true;
          return false;
        });

      const isFav =
        (userFavorites || []).includes(item.id) ||
        ((favoritesSummary?.artifact_likes?.[item.id] || 0) > 0);

      const matchStatus =
        selectedStatus === 'Tất cả' ||
        (selectedStatus === 'Được yêu thích' ? isFav : item.status === selectedStatus);

      // Thao tác lọc theo Card được click
      if (activeStatFilter === 'new') {
        if (!isArtifactNew(item)) return false;
      }

      if (activeStatFilter === 'featured') {
        if (!isArtifactFeatured(item)) return false;
      }

      return matchSearch && matchCategory && matchPeriod && matchStatus;
    });

    // Nếu đang lọc theo Hiện vật nổi bật, sắp xếp theo lượt yêu thích giảm dần (nổi bật nhất lên đầu)
    if (activeStatFilter === 'featured') {
      list = [...list].sort((a, b) => {
        const likesA = favoritesSummary?.artifact_likes?.[a.id] || 0;
        const likesB = favoritesSummary?.artifact_likes?.[b.id] || 0;
        return likesB - likesA;
      });
    }

    return list;
  }, [fullArtifactsList, searchTerm, selectedCategory, selectedPeriod, selectedStatus, activeStatFilter, userFavorites, favoritesSummary, isArtifactNew, isArtifactFeatured]);

  // 10 items per page (2 rows of 5 cards as in screenshot)
  const itemsPerPage = 10;
  const totalPages = Math.ceil(filteredArtifacts.length / itemsPerPage) || 1;
  const paginatedArtifacts = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredArtifacts.slice(start, start + itemsPerPage);
  }, [filteredArtifacts, currentPage, itemsPerPage]);

  const handleDeleteConfirm = () => {
    if (deleteTarget) {
      deleteArtifact(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Tất cả');
    setSelectedPeriod('Tất cả');
    setSelectedStatus('Tất cả');
    setActiveStatFilter('all');
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    newParams.delete('category');
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8 max-w-[1400px] mx-auto font-sans w-full min-w-0">
      {/* 1. Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-sm border border-stone-200/80 min-h-[190px] sm:min-h-[210px] flex items-center">
        <img
          src="/images/dong-son-showcase.jpg"
          alt="Bảo tàng Hiện vật Showcase"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/75 to-transparent" />

        <div className="relative z-10 px-6 sm:px-10 py-6 max-w-2xl">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 text-xs font-medium text-[#D4A359] mb-1">
            <Link to="/dashboard" className="hover:underline">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-[#D4A359]/70" />
            <span className="text-[#D4A359]">Hiện vật</span>
          </div>

          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-white tracking-wide">
            Hiện vật
          </h1>
          <p className="text-xs sm:text-[13px] text-white/85 font-normal mt-2 max-w-lg leading-relaxed">
            Khám phá bộ sưu tập hiện vật quý giá, tái hiện lịch sử và văn hóa Việt Nam qua các thời kỳ.
          </p>
          <div className="w-12 h-0.5 bg-[#D4A359] mt-3 rounded-full" />
        </div>
      </div>

      {/* 2. 3 Stat Cards tương tác trực tiếp với bộ lọc */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-5">
        {/* Card 1: Tổng số hiện vật - Bấm để xem toàn bộ & đặt lại bộ lọc */}
        <div
          onClick={() => {
            setActiveStatFilter('all');
            setSelectedStatus('Tất cả');
            setSelectedCategory('Tất cả');
            setSelectedPeriod('Tất cả');
            setSearchTerm('');
            setCurrentPage(1);
          }}
          className={`bg-white rounded-2xl p-4 sm:p-5 border ${
            activeStatFilter === 'all'
              ? 'border-[#B8860B] ring-2 ring-[#B8860B]/25 shadow-md bg-amber-50/15'
              : 'border-stone-200/80 shadow-xs'
          } relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group`}
          title="Bấm để hiển thị toàn bộ hiện vật"
        >
          <div className="absolute right-0 top-0 bottom-0 w-24 opacity-[0.04] pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-32 h-32 text-[#B8860B]" fill="currentColor">
              <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="50" cy="50" r="14" fill="currentColor" />
            </svg>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`w-13 h-13 rounded-full ${activeStatFilter === 'all' ? 'bg-[#EBDDC3] text-[#8B6508]' : 'bg-[#F5EFE0] text-[#B8860B]'} border border-[#E8DDCC] flex items-center justify-center flex-shrink-0 transition-colors`}>
              <VaseIcon className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>Tổng số hiện vật</span>
                {activeStatFilter === 'all' && (
                  <span className="text-[9px] bg-[#B8860B] text-white px-1.5 py-0.5 rounded font-semibold leading-none">Tất cả</span>
                )}
              </div>
              <div className="text-2xl sm:text-[28px] font-extrabold text-[#3E2712] tracking-tight leading-none mt-1 mb-1">
                {formatNumber(fullArtifactsList.length)}
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <span>✓</span>
                <span>{displayingArtifactsCount} đang trưng bày ({Math.round((displayingArtifactsCount / (fullArtifactsList.length || 1)) * 100)}%)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Hiện vật mới - Bấm để lọc ngay các hiện vật mới */}
        <div
          onClick={() => {
            if (activeStatFilter !== 'new') {
              setActiveStatFilter('new');
              setSelectedCategory('Tất cả');
              setSelectedPeriod('Tất cả');
              setSelectedStatus('Tất cả');
              setSearchTerm('');
            } else {
              setActiveStatFilter('all');
            }
            setCurrentPage(1);
          }}
          className={`bg-white rounded-2xl p-4 sm:p-5 border ${
            activeStatFilter === 'new'
              ? 'border-emerald-600 ring-2 ring-emerald-600/30 shadow-md bg-emerald-50/25'
              : 'border-stone-200/80 shadow-xs'
          } relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group`}
          title="Bấm để lọc chỉ xem các hiện vật mới bổ sung"
        >
          <div className="absolute right-0 top-0 bottom-0 w-24 opacity-[0.04] pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-32 h-32 text-emerald-700" fill="currentColor">
              <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="50" cy="50" r="14" fill="currentColor" />
            </svg>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`w-13 h-13 rounded-full ${activeStatFilter === 'new' ? 'bg-emerald-100 text-emerald-800' : 'bg-[#F5EFE0] text-[#B8860B]'} border border-[#E8DDCC] flex items-center justify-center flex-shrink-0 transition-colors`}>
              <CalendarDays className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>Hiện vật mới</span>
                {activeStatFilter === 'new' && (
                  <span className="text-[9px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-semibold leading-none">Đang lọc</span>
                )}
              </div>
              <div className="text-2xl sm:text-[28px] font-extrabold text-[#3E2712] tracking-tight leading-none mt-1 mb-1">
                {newArtifactsCount}
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <span>↑</span>
                <span>+{newArtifactsCount} hiện vật mới bổ sung</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Hiện vật nổi bật - Bấm để lọc các hiện vật được yêu thích nhiều nhất */}
        <div
          onClick={() => {
            if (activeStatFilter !== 'featured') {
              setActiveStatFilter('featured');
              setSelectedCategory('Tất cả');
              setSelectedPeriod('Tất cả');
              setSelectedStatus('Tất cả');
              setSearchTerm('');
            } else {
              setActiveStatFilter('all');
            }
            setCurrentPage(1);
          }}
          className={`bg-white rounded-2xl p-4 sm:p-5 border ${
            activeStatFilter === 'featured'
              ? 'border-[#B8860B] ring-2 ring-[#B8860B]/30 shadow-md bg-amber-50/25'
              : 'border-stone-200/80 shadow-xs'
          } relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 cursor-pointer group`}
          title="Bấm để lọc các hiện vật được người dùng yêu thích nhiều nhất"
        >
          <div className="absolute right-0 top-0 bottom-0 w-24 opacity-[0.04] pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-32 h-32 text-[#B8860B]" fill="currentColor">
              <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="50" cy="50" r="14" fill="currentColor" />
            </svg>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className={`w-13 h-13 rounded-full ${activeStatFilter === 'featured' ? 'bg-[#EBDDC3] text-[#8B6508]' : 'bg-[#F5EFE0] text-[#B8860B]'} border border-[#E8DDCC] flex items-center justify-center flex-shrink-0 transition-colors`}>
              <Star className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider flex items-center gap-1.5">
                <span>Hiện vật nổi bật</span>
                {activeStatFilter === 'featured' && (
                  <span className="text-[9px] bg-[#B8860B] text-white px-1.5 py-0.5 rounded font-semibold leading-none">Đang lọc</span>
                )}
              </div>
              <div className="text-2xl sm:text-[28px] font-extrabold text-[#3E2712] tracking-tight leading-none mt-1 mb-1">
                {featuredArtifactsCount}
              </div>
              <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                <span>★</span>
                <span>{totalLikesCount} lượt lưu & yêu thích toàn hệ thống</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Thanh hiển thị trạng thái lọc nhanh khi click thẻ */}
      {activeStatFilter !== 'all' && (
        <div className="flex items-center justify-between p-3.5 bg-amber-50/90 border border-amber-300/80 rounded-2xl text-xs text-[#3E2712] shadow-xs">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B8860B] animate-pulse" />
            <span>
              Đang lọc theo:{' '}
              <strong className="font-extrabold text-[#8B6508] text-sm">
                {activeStatFilter === 'new'
                  ? `Hiện vật mới bổ sung (${filteredArtifacts.length} hiện vật)`
                  : `Hiện vật nổi bật được cộng đồng yêu thích (${filteredArtifacts.length} hiện vật)`}
              </strong>
            </span>
          </div>
          <button
            onClick={() => setActiveStatFilter('all')}
            className="px-3 py-1 bg-white hover:bg-amber-100/60 border border-amber-300 text-[#8B6508] font-bold rounded-lg transition-colors cursor-pointer text-xs"
          >
            ✕ Bỏ lọc (Xem tất cả {fullArtifactsList.length} hiện vật)
          </button>
        </div>
      )}

      {/* 3. Horizontal Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search input pill */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Nhập tên hiện vật, niên đại, danh mục, mô tả..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#F7F3EE] text-xs text-[#2D241E] placeholder-stone-400 rounded-full border border-stone-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20 focus:border-[#D4A359] shadow-2xs"
          />
        </div>

        {/* Dropdown Danh mục */}
        <div className="relative shrink-0">
          <select
            value={selectedCategory}
            onChange={(e) => {
              setSelectedCategory(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#F7F3EE] text-xs font-semibold text-[#3E2712] rounded-full border border-stone-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20 focus:border-[#D4A359] shadow-2xs cursor-pointer appearance-none pr-8"
          >
            <option value="Tất cả">Danh mục: Tất cả</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">
            ⌄
          </span>
        </div>

        {/* Dropdown Thời kỳ */}
        <div className="relative shrink-0">
          <select
            value={selectedPeriod}
            onChange={(e) => {
              setSelectedPeriod(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#F7F3EE] text-xs font-semibold text-[#3E2712] rounded-full border border-stone-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20 focus:border-[#D4A359] shadow-2xs cursor-pointer appearance-none pr-8"
          >
            <option value="Tất cả">Thời kỳ: Tất cả</option>
            <option value="Cổ đại">Cổ đại</option>
            <option value="Trung đại">Trung đại</option>
            <option value="Cận đại">Cận đại</option>
            <option value="Hiện đại">Hiện đại</option>
            <option value="Đông Sơn">Thời Đông Sơn</option>
            <option value="Lý">Thời Lý</option>
            <option value="Lê">Thời Lê</option>
            <option value="Nguyễn">Thời Nguyễn</option>
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">
            ⌄
          </span>
        </div>

        {/* Dropdown Trạng thái */}
        <div className="relative shrink-0">
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full sm:w-auto px-4 py-2.5 bg-[#F7F3EE] text-xs font-semibold text-[#3E2712] rounded-full border border-stone-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20 focus:border-[#D4A359] shadow-2xs cursor-pointer appearance-none pr-8"
          >
            <option value="Tất cả">Trạng thái: Tất cả</option>
            <option value="Đang trưng bày">Đang trưng bày</option>
            <option value="Đang phục chế">Đang phục chế</option>
            <option value="Trong kho">Trong kho</option>
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-stone-400 pointer-events-none">
            ⌄
          </span>
        </div>

        {/* Button Lọc nâng cao / Thêm hiện vật */}
        <button
          onClick={() => {
            if (currentUser?.role === 'admin') {
              setArtifactToEdit(null);
              setIsFormOpen(true);
            } else {
              resetFilters();
            }
          }}
          className="btn-primary px-5 py-2.5 typo-btn rounded-full shadow-2xs flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
          title={currentUser?.role === 'admin' ? 'Thêm mới hoặc quản lý hiện vật' : 'Lọc nâng cao'}
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-white" />
          <span>{currentUser?.role === 'admin' ? '+ Thêm hiện vật' : 'Lọc nâng cao'}</span>
        </button>
      </div>

      {/* 4. Section Header: "Danh sách hiện vật" */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <VaseIcon className="w-4 h-4 text-[#B8860B]" />
          <h2 className="font-bold text-sm sm:text-base text-[#3E2712]">
            Danh sách hiện vật
          </h2>
        </div>
        <button
          onClick={resetFilters}
          className="text-xs font-semibold text-stone-500 hover:text-[#B8860B] transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Xem tất cả</span>
          <span>&rarr;</span>
        </button>
      </div>

      {/* 5. 5-Column Artifacts Grid */}
      {filteredArtifacts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-stone-200/80 shadow-xs space-y-3">
          <div className="w-14 h-14 bg-amber-50 text-[#B8860B] rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#3E2712]">Không tìm thấy hiện vật phù hợp</h3>
          <p className="text-xs text-stone-500 max-w-sm mx-auto">
            Không tìm thấy hiện vật nào ứng với từ khóa "<strong>{searchTerm}</strong>". Vui lòng thử lại.
          </p>
          <button
            onClick={resetFilters}
            className="btn-primary px-5 py-2 typo-btn rounded-full shadow-xs cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {paginatedArtifacts.map((item) => {
            const isFav = (userFavorites || []).includes(item.id);
            const itemLikes = favoritesSummary?.artifact_likes?.[item.id] || 0;
            return (
              <div
                key={item.id}
                onClick={() => setSelectedDetailArtifact(item)}
                className="bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 cursor-pointer flex flex-col justify-between group"
              >
                <div>
                  {/* Image container with tag & favorite button */}
                  <div className="aspect-[4/3] relative bg-[#F7F2E7] overflow-hidden">
                    <img
                      src={item.image}
                      alt={item.name}
                      onError={(e) => {
                        e.target.src = '/images/dong-son-showcase.jpg';
                      }}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />

                    {/* Tag badge top-left */}
                    <span
                      className={`absolute top-2.5 left-2.5 ${
                        item.badgeColor || 'bg-[#2B2B2B]'
                      } text-white text-[10px] font-bold px-2 py-0.5 rounded shadow-2xs`}
                    >
                      {item.badge || item.period || item.culture || 'Hiện vật'}
                    </span>

                    {/* Heart favorite button top-right with live like count */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleArtifactFavorite(item.id);
                      }}
                      className={`absolute top-2.5 right-2.5 px-2 py-1 rounded-full ${
                        isFav
                          ? 'bg-red-500/90 text-white shadow-sm'
                          : 'bg-black/40 hover:bg-black/60 text-white'
                      } flex items-center gap-1 transition-all cursor-pointer backdrop-blur-xs`}
                      title={isFav ? `Đã lưu yêu thích (${itemLikes} lượt thích)` : `Lưu yêu thích (${itemLikes} lượt thích)`}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isFav ? 'fill-white text-white' : 'text-white stroke-[2]'
                        }`}
                      />
                      {itemLikes > 0 && (
                        <span className="text-[10px] font-bold leading-none">{itemLikes}</span>
                      )}
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 space-y-2">
                    <h4 className="font-bold text-xs sm:text-[13px] text-[#3E2712] group-hover:text-[#B8860B] transition-colors truncate">
                      {item.name}
                    </h4>

                    {/* Meta info matching screenshot */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                        <Landmark className="w-3 h-3 text-[#B8860B] shrink-0" />
                        <span className="truncate">{item.date || item.period || item.culture}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                        <Sparkles className="w-3 h-3 text-[#B8860B] shrink-0" />
                        <span className="truncate">{item.material || item.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-stone-500">
                        <MapPin className="w-3 h-3 text-[#B8860B] shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer link & Admin quick actions */}
                <div className="px-3.5 pb-3 pt-1 border-t border-stone-100 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#B8860B] group-hover:underline flex items-center gap-0.5">
                    <span>Xem chi tiết</span>
                    <span>&rarr;</span>
                  </span>

                  {currentUser?.role === 'admin' && (
                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setArtifactToEdit(item);
                          setIsFormOpen(true);
                        }}
                        className="p-1 text-stone-400 hover:text-[#B8860B] hover:bg-[#F5EFE0] rounded transition-colors cursor-pointer"
                        title="Sửa hiện vật"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteTarget(item);
                        }}
                        className="p-1 text-stone-400 hover:text-red-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                        title="Xóa hiện vật"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filteredArtifacts.length > 0 && (
        <div className="bg-white px-4 sm:px-6 py-3 rounded-2xl border border-stone-200/80 shadow-2xs w-full max-w-full min-w-0 overflow-hidden">
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredArtifacts.length}
            itemsPerPage={itemsPerPage}
          />
        </div>
      )}

      {/* Detail Modal */}
      <ArtifactDetailModal
        artifact={selectedDetailArtifact}
        isOpen={!!selectedDetailArtifact}
        onClose={() => setSelectedDetailArtifact(null)}
        onEdit={
          currentUser?.role === 'admin'
            ? (art) => {
                setSelectedDetailArtifact(null);
                setArtifactToEdit(art);
                setIsFormOpen(true);
              }
            : undefined
        }
      />

      {/* Artifact Form Modal (Admin Edit/Add) */}
      <ArtifactFormModal
        isOpen={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        artifactToEdit={artifactToEdit}
      />

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        itemName={deleteTarget?.name}
      />
    </div>
  );
};
