import React, { useState, useMemo, useEffect } from 'react';
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

  const { artifacts, categories, deleteArtifact, currentUser } = useApp();

  const [searchTerm, setSearchTerm] = useState(queryParam);
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedPeriod, setSelectedPeriod] = useState('Tất cả');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');
  const [currentPage, setCurrentPage] = useState(1);
  const [favorites, setFavorites] = useState(() => {
    try {
      const saved = localStorage.getItem('user_favorite_artifacts');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

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

  const toggleFavorite = (id, e) => {
    e.stopPropagation();
    setFavorites((prev) => {
      const updated = prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id];
      try {
        localStorage.setItem('user_favorite_artifacts', JSON.stringify(updated));
      } catch (err) {
        console.error('Failed to save favorites', err);
      }
      return updated;
    });
  };

  // Base highlight artifacts mapped to match target screenshot precisely
  const curatedShowcaseArtifacts = useMemo(() => [
    {
      id: 'SHOWCASE_01',
      name: 'Trống đồng Đông Sơn',
      badge: 'Hiện vật nổi bật',
      badgeColor: 'bg-[#B88128]',
      date: 'Thế kỷ I TCN - I',
      material: 'Đồng',
      location: 'Phòng trưng bày A',
      image: '/images/events/dong-son-drum.jpg',
      period: 'Hiện đại',
      category: 'Bảo vật Quốc gia',
      description: 'Trống đồng Đông Sơn là biểu tượng của nền văn minh lúa nước sông Hồng...',
    },
    {
      id: 'SHOWCASE_02',
      name: 'Sách cổ chữ Hán',
      badge: 'Hiện vật mới',
      badgeColor: 'bg-[#1E7E34]',
      date: 'Thế kỷ XIX',
      material: 'Giấy, mực, gỗ',
      location: 'Phòng trưng bày B',
      image: '/images/sach-co-chu-han.jpg',
      period: 'Hiện đại',
      category: 'Sách cổ & Tài liệu',
      description: 'Sách cổ ghi chép các tư liệu lịch sử quý giá về Việt Nam...',
    },
    {
      id: 'SHOWCASE_03',
      name: 'Bình gốm hoa lam',
      badge: 'Cổ đại',
      badgeColor: 'bg-[#2B2B2B]',
      date: 'Thế kỷ XV',
      material: 'Gốm sứ',
      location: 'Phòng trưng bày C',
      image: '/images/binh-gom.jpg',
      period: 'Cổ đại',
      category: 'Gốm men & Đồ sứ',
      description: 'Bình gốm với họa tiết hoa lam tinh xảo, phản ánh kỹ thuật chế tác đỉnh cao...',
    },
    {
      id: 'SHOWCASE_04',
      name: 'Tượng đá Linh vật',
      badge: 'Cận đại',
      badgeColor: 'bg-[#2B2B2B]',
      date: 'Thế kỷ XVIII',
      material: 'Đá',
      location: 'Phòng trưng bày D',
      image: '/images/tuong-da-linh-vat.jpg',
      period: 'Cận đại',
      category: 'Điêu khắc đá',
      description: 'Tượng đá linh vật được chạm khắc tỉ mỉ, thể hiện tín ngưỡng tâm linh...',
    },
    {
      id: 'SHOWCASE_05',
      name: 'Huy hiệu Bình dân học vụ',
      badge: 'Trung đại',
      badgeColor: 'bg-[#4A148C]',
      date: 'Thế kỷ XX',
      material: 'Vải thêu',
      location: 'Phòng trưng bày E',
      image: '/images/events/thang-long-night.jpg',
      period: 'Trung đại',
      category: 'Kỷ vật lịch sử',
      description: 'Biểu tượng của phong trào Bình dân học vụ thắp sáng tri thức...',
    },
    {
      id: 'SHOWCASE_06',
      name: 'Bình gốm Chu Đậu',
      badge: 'Hiện vật mới',
      badgeColor: 'bg-[#1E7E34]',
      date: 'Thế kỷ XV',
      material: 'Gốm men lam',
      location: 'Phòng trưng bày B',
      image: '/images/events/chu-dau-ceramic.jpg',
      period: 'Cổ đại',
      category: 'Gốm men & Đồ sứ',
      description: 'Bình gốm Chu Đậu hoa lam nổi tiếng thời Lê sơ...',
    },
    {
      id: 'SHOWCASE_07',
      name: 'Tượng Phật A Di Đà',
      badge: 'Cổ đại',
      badgeColor: 'bg-[#2B2B2B]',
      date: 'Thế kỷ XI',
      material: 'Đá sa thạch',
      location: 'Phòng trưng bày C',
      image: '/images/tuong-phat.jpg',
      period: 'Cổ đại',
      category: 'Điêu khắc Phật giáo',
      description: 'Tượng Phật A Di Đà chùa Phật Tích, tuyệt tác điêu khắc thời Lý...',
    },
    {
      id: 'SHOWCASE_08',
      name: 'Thạp đồng Đào Thịnh',
      badge: 'Trung đại',
      badgeColor: 'bg-[#4A148C]',
      date: 'Thế kỷ V TCN',
      material: 'Đồng thau',
      location: 'Phòng trưng bày A',
      image: '/images/trong-dong.jpg',
      period: 'Trung đại',
      category: 'Bảo vật Quốc gia',
      description: 'Thạp đồng Đào Thịnh với nắp có hình người giao hoan, biểu tượng phồn thực...',
    },
    {
      id: 'SHOWCASE_09',
      name: 'Lư hương gốm Bát Tràng',
      badge: 'Cận đại',
      badgeColor: 'bg-[#2B2B2B]',
      date: 'Thế kỷ XVII',
      material: 'Gốm men rạn',
      location: 'Phòng trưng bày D',
      image: '/images/binh-gom.jpg',
      period: 'Cận đại',
      category: 'Gốm men & Đồ sứ',
      description: 'Lư hương gốm men rạn lam thời Lê Trung Hưng...',
    },
    {
      id: 'SHOWCASE_10',
      name: 'Bia tiến sĩ Văn Miếu',
      badge: 'Cổ đại',
      badgeColor: 'bg-[#2B2B2B]',
      date: 'Năm 1484',
      material: 'Đá xanh',
      location: 'Phòng trưng bày E',
      image: '/images/bia-tien-si.jpg',
      period: 'Cổ đại',
      category: 'Di sản tư liệu',
      description: 'Bia tiến sĩ khoa Nhâm Tuất (1442) dựng năm 1484 dưới triều vua Lê Thánh Tông...',
    },
  ], []);

  // Merge curated items with remaining full database
  const fullArtifactsList = useMemo(() => {
    const existingIds = new Set(curatedShowcaseArtifacts.map((a) => a.name.toLowerCase()));
    const remaining = artifacts
      .filter((a) => !existingIds.has(a.name?.toLowerCase()))
      .map((a, idx) => ({
        ...a,
        badge: a.period || 'Cổ đại',
        badgeColor:
          idx % 4 === 0
            ? 'bg-[#B88128]'
            : idx % 4 === 1
            ? 'bg-[#1E7E34]'
            : idx % 4 === 2
            ? 'bg-[#4A148C]'
            : 'bg-[#2B2B2B]',
        material: a.material || a.category || 'Đồng',
        location: a.location || 'Phòng trưng bày A',
      }));

    return [...curatedShowcaseArtifacts, ...remaining];
  }, [artifacts, curatedShowcaseArtifacts]);

  // Filtered Artifacts list
  const filteredArtifacts = useMemo(() => {
    const cleanSearch = removeVietnameseTones(searchTerm);

    return fullArtifactsList.filter((item) => {
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

      const matchPeriod =
        selectedPeriod === 'Tất cả' ||
        (item.period && item.period.includes(selectedPeriod)) ||
        (item.date && item.date.includes(selectedPeriod));

      const matchStatus =
        selectedStatus === 'Tất cả' || item.status === selectedStatus;

      return matchSearch && matchCategory && matchPeriod && matchStatus;
    });
  }, [fullArtifactsList, searchTerm, selectedCategory, selectedPeriod, selectedStatus]);

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
    setCurrentPage(1);
    const newParams = new URLSearchParams(searchParams);
    newParams.delete('q');
    newParams.delete('category');
    setSearchParams(newParams);
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8 max-w-[1400px] mx-auto font-sans w-full min-w-0">
      {/* 1. Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-sm border border-[#ECE4D4] min-h-[190px] sm:min-h-[210px] flex items-center">
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
          <div className="w-12 h-0.5 bg-[#C9974C] mt-3 rounded-full" />
        </div>
      </div>

      {/* 2. 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {/* Card 1: Tổng số hiện vật */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE4D4] shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 bottom-0 w-24 opacity-[0.04] pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-32 h-32 text-[#B88128]" fill="currentColor">
              <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="50" cy="50" r="14" fill="currentColor" />
            </svg>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-13 h-13 rounded-full bg-[#FAF5EB] border border-[#E8DFC9] flex items-center justify-center text-[#C9974C] flex-shrink-0">
              <VaseIcon className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                Tổng số hiện vật
              </div>
              <div className="text-2xl sm:text-[28px] font-extrabold text-[#2B170B] tracking-tight leading-none mt-1 mb-1">
                1.254
              </div>
              <div className="text-[11px] font-medium text-[#2E7D32] flex items-center gap-1">
                <span>↑</span>
                <span>+24 so với tháng trước</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 2: Danh mục */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE4D4] shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 bottom-0 w-24 opacity-[0.04] pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-32 h-32 text-[#B88128]" fill="currentColor">
              <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="50" cy="50" r="14" fill="currentColor" />
            </svg>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-13 h-13 rounded-full bg-[#FAF5EB] border border-[#E8DFC9] flex items-center justify-center text-[#C9974C] flex-shrink-0">
              <FolderTree className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                Danh mục
              </div>
              <div className="text-2xl sm:text-[28px] font-extrabold text-[#2B170B] tracking-tight leading-none mt-1 mb-1">
                18
              </div>
              <div className="text-[11px] font-medium text-[#2E7D32] flex items-center gap-1">
                <span>↑</span>
                <span>+2 so với tháng trước</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Hiện vật mới */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE4D4] shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 bottom-0 w-24 opacity-[0.04] pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-32 h-32 text-[#B88128]" fill="currentColor">
              <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="50" cy="50" r="14" fill="currentColor" />
            </svg>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-13 h-13 rounded-full bg-[#FAF5EB] border border-[#E8DFC9] flex items-center justify-center text-[#C9974C] flex-shrink-0">
              <CalendarDays className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                Hiện vật mới
              </div>
              <div className="text-2xl sm:text-[28px] font-extrabold text-[#2B170B] tracking-tight leading-none mt-1 mb-1">
                12
              </div>
              <div className="text-[11px] font-medium text-[#2E7D32] flex items-center gap-1">
                <span>↑</span>
                <span>+5 so với tháng trước</span>
              </div>
            </div>
          </div>
        </div>

        {/* Card 4: Hiện vật nổi bật */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 border border-[#ECE4D4] shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
          <div className="absolute right-0 top-0 bottom-0 w-24 opacity-[0.04] pointer-events-none flex items-center justify-center">
            <svg viewBox="0 0 100 100" className="w-32 h-32 text-[#B88128]" fill="currentColor">
              <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
              <circle cx="50" cy="50" r="32" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <circle cx="50" cy="50" r="14" fill="currentColor" />
            </svg>
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="w-13 h-13 rounded-full bg-[#FAF5EB] border border-[#E8DFC9] flex items-center justify-center text-[#C9974C] flex-shrink-0">
              <Star className="w-6 h-6 stroke-[1.8]" />
            </div>
            <div>
              <div className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                Hiện vật nổi bật
              </div>
              <div className="text-2xl sm:text-[28px] font-extrabold text-[#2B170B] tracking-tight leading-none mt-1 mb-1">
                8
              </div>
              <div className="text-[11px] font-medium text-[#2E7D32] flex items-center gap-1">
                <span>↑</span>
                <span>+3 so với tháng trước</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Horizontal Filter Bar */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-3">
        {/* Search input pill */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-[#8C7A6B] absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Nhập tên hiện vật, niên đại, danh mục, mô tả..."
            className="w-full pl-10 pr-4 py-2.5 bg-white text-xs text-[#2B170B] placeholder-[#8C7A6B] rounded-full border border-[#ECE4D4] focus:outline-none focus:ring-2 focus:ring-[#C9974C] shadow-2xs"
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
            className="w-full sm:w-auto px-4 py-2.5 bg-white text-xs font-medium text-[#5B3A1F] rounded-full border border-[#ECE4D4] focus:outline-none focus:ring-2 focus:ring-[#C9974C] shadow-2xs cursor-pointer appearance-none pr-8"
          >
            <option value="Tất cả">Danh mục: Tất cả</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8C7A6B] pointer-events-none">
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
            className="w-full sm:w-auto px-4 py-2.5 bg-white text-xs font-medium text-[#5B3A1F] rounded-full border border-[#ECE4D4] focus:outline-none focus:ring-2 focus:ring-[#C9974C] shadow-2xs cursor-pointer appearance-none pr-8"
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
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8C7A6B] pointer-events-none">
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
            className="w-full sm:w-auto px-4 py-2.5 bg-white text-xs font-medium text-[#5B3A1F] rounded-full border border-[#ECE4D4] focus:outline-none focus:ring-2 focus:ring-[#C9974C] shadow-2xs cursor-pointer appearance-none pr-8"
          >
            <option value="Tất cả">Trạng thái: Tất cả</option>
            <option value="Đang trưng bày">Đang trưng bày</option>
            <option value="Đang phục chế">Đang phục chế</option>
            <option value="Trong kho">Trong kho</option>
          </select>
          <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs text-[#8C7A6B] pointer-events-none">
            ⌄
          </span>
        </div>

        {/* Button Lọc nâng cao */}
        <button
          onClick={() => {
            if (currentUser?.role === 'admin') {
              setArtifactToEdit(null);
              setIsFormOpen(true);
            } else {
              resetFilters();
            }
          }}
          className="px-5 py-2.5 bg-[#B88128] hover:bg-[#A36C18] text-white text-xs font-semibold rounded-full shadow-2xs flex items-center justify-center gap-1.5 transition-colors cursor-pointer shrink-0"
          title={currentUser?.role === 'admin' ? 'Thêm mới hoặc quản lý hiện vật' : 'Lọc nâng cao'}
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          <span>{currentUser?.role === 'admin' ? '+ Thêm hiện vật' : 'Lọc nâng cao'}</span>
        </button>
      </div>

      {/* 4. Section Header: "Danh sách hiện vật" */}
      <div className="flex items-center justify-between pt-1">
        <div className="flex items-center gap-2">
          <VaseIcon className="w-4 h-4 text-[#B88128]" />
          <h2 className="font-bold text-sm sm:text-base text-[#2B170B]">
            Danh sách hiện vật
          </h2>
        </div>
        <button
          onClick={resetFilters}
          className="text-xs font-semibold text-[#8C7A6B] hover:text-[#C9974C] transition-colors flex items-center gap-1 cursor-pointer"
        >
          <span>Xem tất cả</span>
          <span>&rarr;</span>
        </button>
      </div>

      {/* 5. 5-Column Artifacts Grid */}
      {filteredArtifacts.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center border border-[#ECE4D4] shadow-xs space-y-3">
          <div className="w-14 h-14 bg-amber-50 text-[#B88128] rounded-full flex items-center justify-center mx-auto">
            <AlertCircle className="w-7 h-7" />
          </div>
          <h3 className="text-base font-bold text-[#2B170B]">Không tìm thấy hiện vật phù hợp</h3>
          <p className="text-xs text-[#8C7A6B] max-w-sm mx-auto">
            Không tìm thấy hiện vật nào ứng với từ khóa "<strong>{searchTerm}</strong>". Vui lòng thử lại.
          </p>
          <button
            onClick={resetFilters}
            className="px-5 py-2 bg-[#B88128] hover:bg-[#A36C18] text-white font-bold text-xs rounded-full shadow-xs transition-colors cursor-pointer"
          >
            Đặt lại bộ lọc
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {paginatedArtifacts.map((item) => {
            const isFav = favorites.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => setSelectedDetailArtifact(item)}
                className="bg-white rounded-xl overflow-hidden border border-[#ECE4D4] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
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
                      {item.badge || item.period || 'Cổ đại'}
                    </span>

                    {/* Heart favorite button top-right */}
                    <button
                      onClick={(e) => toggleFavorite(item.id, e)}
                      className="absolute top-2.5 right-2.5 w-6 h-6 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center transition-colors cursor-pointer"
                      title={isFav ? 'Bỏ lưu yêu thích' : 'Lưu yêu thích'}
                    >
                      <Heart
                        className={`w-3.5 h-3.5 ${
                          isFav ? 'fill-red-500 text-red-500' : 'text-white stroke-[1.8]'
                        }`}
                      />
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-3.5 space-y-2">
                    <h4 className="font-bold text-xs sm:text-[13px] text-[#2B170B] group-hover:text-[#C9974C] transition-colors truncate">
                      {item.name}
                    </h4>

                    {/* Meta info matching screenshot */}
                    <div className="space-y-1">
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8C7A6B]">
                        <Landmark className="w-3 h-3 text-[#B88128] shrink-0" />
                        <span className="truncate">{item.date || item.period}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8C7A6B]">
                        <Sparkles className="w-3 h-3 text-[#B88128] shrink-0" />
                        <span className="truncate">{item.material || item.category}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8C7A6B]">
                        <MapPin className="w-3 h-3 text-[#B88128] shrink-0" />
                        <span className="truncate">{item.location}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer link */}
                <div className="px-3.5 pb-3 pt-1 border-t border-[#F4EFE6] flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#B88128] group-hover:underline flex items-center gap-0.5">
                    <span>Xem chi tiết</span>
                    <span>&rarr;</span>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {filteredArtifacts.length > 0 && (
        <div className="bg-white px-4 sm:px-6 py-3 rounded-xl border border-[#ECE4D4] shadow-2xs w-full max-w-full min-w-0 overflow-hidden">
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
