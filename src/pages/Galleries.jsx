import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import {
  BookOpen,
  Sparkles,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  MapPin,
  ExternalLink,
  ChevronRight,
  ChevronLeft,
  Share2,
  ZoomIn,
  Maximize2,
  Eye,
  Info,
  Clock,
  CheckCircle2,
  Layers,
  FileText,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { formatDate } from '@/utils/formatters';
import { removeVietnameseTones } from '@/utils/artifactSearch';

const EMPTY_GALLERY = {
  name: '',
  description: '',
  detailedContent: '',
  status: 'Đang diễn ra',
  startDate: '',
  endDate: '',
  location: 'Bảo tàng Lịch sử Quốc gia – Số 1 Tràng Tiền / 216 Trần Quang Khải, Hoàn Kiếm, Hà Nội',
  sourceUrl: 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
  sourceNote: '',
  image: '/images/museum-hero.jpg',
  galleryImages: ['/images/museum-hero.jpg'],
  highlightArtifacts: [{ name: '', description: '', image: '', period: '' }],
};

export const Galleries = () => {
  const { galleries, addGallery, updateGallery, deleteGallery, currentUser, addToast } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  // Loading state (initial mount)
  const [isLoading, setIsLoading] = useState(false);

  // Tab & Search state
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'Đang diễn ra' | 'Sắp diễn ra' | 'Đã diễn ra'
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Detail Modal State
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Lightbox Preview State
  const [previewImage, setPreviewImage] = useState(null);

  // Form Modal State (Admin)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_GALLERY);
  const [errors, setErrors] = useState({});

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Helper: Extract image URL and caption from string or object
  const parseImage = (item) => {
    if (!item) return { url: '/images/museum-hero.jpg', caption: '' };
    if (typeof item === 'string') return { url: item, caption: '' };
    return {
      url: item.url || item.image || '/images/museum-hero.jpg',
      caption: item.caption || item.title || '',
    };
  };

  // Helper: Get primary cover image
  const getCoverImageUrl = (gallery) => {
    if (gallery.galleryImages && gallery.galleryImages.length > 0) {
      return parseImage(gallery.galleryImages[0]).url;
    }
    return gallery.image || '/images/museum-hero.jpg';
  };

  // Memoized Tab Counts
  const counts = useMemo(() => {
    return {
      all: galleries.length,
      'Đang diễn ra': galleries.filter((g) => g.status === 'Đang diễn ra').length,
      'Sắp diễn ra': galleries.filter((g) => g.status === 'Sắp diễn ra').length,
      'Đã diễn ra': galleries.filter((g) => g.status === 'Đã diễn ra').length,
    };
  }, [galleries]);

  // Memoized Filtered List (Client-side fast filtering without re-fetch)
  const filteredGalleries = useMemo(() => {
    const cleanSearch = removeVietnameseTones(searchTerm.trim().toLowerCase());

    return galleries.filter((g) => {
      // 1. Filter by Status Tab
      if (activeTab !== 'all' && g.status !== activeTab) {
        return false;
      }

      // 2. Filter by Search keyword
      if (!cleanSearch) return true;

      const nameClean = removeVietnameseTones(g.name || '');
      const descClean = removeVietnameseTones(g.description || '');
      const locClean = removeVietnameseTones(g.location || '');
      const idClean = (g.id || '').toLowerCase();

      const matchArtifacts = (g.highlightArtifacts || []).some((art) => {
        const artName = removeVietnameseTones(art.name || '');
        const artDesc = removeVietnameseTones(art.description || '');
        const artPeriod = removeVietnameseTones(art.period || '');
        return (
          artName.includes(cleanSearch) ||
          artDesc.includes(cleanSearch) ||
          artPeriod.includes(cleanSearch)
        );
      });

      return (
        nameClean.includes(cleanSearch) ||
        descClean.includes(cleanSearch) ||
        locClean.includes(cleanSearch) ||
        idClean.includes(cleanSearch) ||
        matchArtifacts
      );
    });
  }, [galleries, activeTab, searchTerm]);

  // ESC and Arrow key navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (previewImage) {
          setPreviewImage(null);
        } else if (selectedGallery) {
          setSelectedGallery(null);
        } else if (isFormOpen) {
          setIsFormOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewImage, selectedGallery, isFormOpen]);

  // Handlers
  const openDetail = (item) => {
    setSelectedGallery(item);
    setActiveImageIndex(0);
  };

  const openAdd = () => {
    setEditingItem(null);
    setFormData(EMPTY_GALLERY);
    setErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (item, e) => {
    if (e) e.stopPropagation();
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      detailedContent: item.detailedContent || item.description || '',
      status: item.status || 'Đang diễn ra',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      location: item.location || 'Bảo tàng Lịch sử Quốc gia – Số 1 Tràng Tiền, Hà Nội',
      sourceUrl: item.sourceUrl || 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
      sourceNote: item.sourceNote || '',
      image: item.image || '/images/museum-hero.jpg',
      galleryImages:
        item.galleryImages && item.galleryImages.length > 0
          ? item.galleryImages
          : [item.image || '/images/museum-hero.jpg'],
      highlightArtifacts:
        item.highlightArtifacts && item.highlightArtifacts.length > 0
          ? item.highlightArtifacts.map((a) => ({ ...a }))
          : [{ name: '', description: '', image: '', period: '' }],
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Vui lòng nhập tên trưng bày chuyên đề.';
    if (!formData.description.trim()) errs.description = 'Vui lòng nhập mô tả chuyên đề.';
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      errs.endDate = 'Ngày kết thúc phải sau ngày bắt đầu.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const cleanedArtifacts = (formData.highlightArtifacts || []).filter(
      (a) => a.name.trim() !== '' || a.description.trim() !== ''
    );

    const payload = {
      ...formData,
      startDate: formData.startDate || null,
      endDate: formData.endDate || null,
      highlightArtifacts: cleanedArtifacts,
    };

    if (editingItem) {
      await updateGallery(editingItem.id, payload);
    } else {
      await addGallery(payload);
    }
    setIsFormOpen(false);
  };

  const handleArtifactFieldChange = (index, field, value) => {
    const list = [...formData.highlightArtifacts];
    list[index][field] = value;
    setFormData({ ...formData, highlightArtifacts: list });
  };

  const addArtifactRow = () => {
    setFormData({
      ...formData,
      highlightArtifacts: [
        ...formData.highlightArtifacts,
        { name: '', description: '', image: '', period: '' },
      ],
    });
  };

  const removeArtifactRow = (index) => {
    const list = formData.highlightArtifacts.filter((_, idx) => idx !== index);
    setFormData({
      ...formData,
      highlightArtifacts:
        list.length > 0 ? list : [{ name: '', description: '', image: '', period: '' }],
    });
  };

  // Status Badge UI
  const getStatusBadge = (status) => {
    switch (status) {
      case 'Đang diễn ra':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold rounded-full shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Đang diễn ra
          </span>
        );
      case 'Sắp diễn ra':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-sky-50 text-sky-700 border border-sky-200 text-xs font-bold rounded-full shadow-xs">
            <Clock className="w-3 h-3 text-sky-600" />
            Sắp diễn ra
          </span>
        );
      case 'Đã diễn ra':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gray-100 text-gray-700 border border-gray-200 text-xs font-bold rounded-full shadow-xs">
            <CheckCircle2 className="w-3 h-3 text-gray-500" />
            Đã diễn ra
          </span>
        );
    }
  };

  // Format Date Range
  const formatPeriod = (start, end) => {
    if (!start && !end) return 'Trưng bày thường trực / Lưu trữ';
    if (start && end) {
      if (start === end) return `Ngày ${formatDate(start)}`;
      return `${formatDate(start)} – ${formatDate(end)}`;
    }
    if (start) return `Từ ${formatDate(start)}`;
    return `Đến ${formatDate(end)}`;
  };

  const handleShare = (gallery, e) => {
    if (e) e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      addToast('Đã sao chép liên kết chuyên đề vào bộ nhớ tạm!', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans pb-8">
      {/* 1. Header Section with Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Trưng bày chuyên đề</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-museum-brown tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-museum-gold" />
            <span>TRƯNG BÀY CHUYÊN ĐỀ</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Không gian giới thiệu các chuyên đề văn hóa, lịch sử và hiện vật tiêu biểu của Bảo tàng.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>+ Thêm chuyên đề mới</span>
          </button>
        )}
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {[
            { key: 'all', label: 'Tất cả' },
            { key: 'Đang diễn ra', label: 'Đang diễn ra' },
            { key: 'Sắp diễn ra', label: 'Sắp diễn ra' },
            { key: 'Đã diễn ra', label: 'Đã diễn ra' },
          ].map((tab) => {
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`relative px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all duration-200 shrink-0 cursor-pointer flex items-center gap-2 ${
                  active
                    ? 'bg-museum-brown text-white shadow-xs'
                    : 'bg-museum-ivory/70 text-gray-600 hover:bg-museum-cream hover:text-museum-brown'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-2 py-0.5 text-[11px] rounded-full font-bold transition-colors ${
                    active ? 'bg-museum-gold text-white' : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {counts[tab.key] || 0}
                </span>
              </button>
            );
          })}
        </div>

        {/* Search Input */}
        <div className="relative w-full md:w-80 shrink-0">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên chuyên đề, hiện vật..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold focus:bg-white transition-all"
          />
        </div>
      </div>

      {/* 3. Thematic Galleries Cards Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="bg-white rounded-2xl border border-gray-100 p-4 space-y-3 shadow-xs">
              <Skeleton className="aspect-[4/3] w-full rounded-xl" />
              <Skeleton className="h-5 w-3/4 rounded" />
              <Skeleton className="h-4 w-full rounded" />
              <Skeleton className="h-4 w-2/3 rounded" />
            </div>
          ))}
        </div>
      ) : filteredGalleries.length === 0 ? (
        <EmptyState
          title="Chưa có trưng bày chuyên đề nào phù hợp"
          subtitle="Hiện tại không tìm thấy chuyên đề trưng bày nào theo bộ lọc hoặc từ khóa đã chọn. Vui lòng thử chuyển tab trạng thái khác."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredGalleries.map((g) => {
            const coverUrl = getCoverImageUrl(g);
            const artifactsCount = g.highlightArtifacts?.length || 0;
            const periodStr = formatPeriod(g.startDate, g.endDate);

            return (
              <div
                key={g.id}
                onClick={() => openDetail(g)}
                className="bg-white rounded-2xl border border-gray-100 shadow-xs hover:shadow-lg hover:border-museum-gold/40 transition-all duration-300 flex flex-col overflow-hidden group cursor-pointer"
              >
                {/* Fixed 4:3 Aspect Ratio Image Banner with lazy load */}
                <div className="relative aspect-[4/3] overflow-hidden bg-museum-cream/30">
                  <img
                    src={coverUrl}
                    alt={g.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    onError={(e) => {
                      e.target.src = '/images/museum-hero.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent opacity-70 group-hover:opacity-85 transition-opacity" />

                  {/* Status Badge floating on top-left corner */}
                  <div className="absolute top-3 left-3 z-10">
                    {getStatusBadge(g.status)}
                  </div>

                  {/* Highlight Artifacts count badge on top-right corner */}
                  {artifactsCount > 0 && (
                    <div className="absolute top-3 right-3 z-10 px-2.5 py-1 bg-black/60 backdrop-blur-md text-amber-200 border border-amber-400/30 text-[11px] font-semibold rounded-lg shadow-xs flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-400" />
                      <span>{artifactsCount} hiện vật tiêu biểu</span>
                    </div>
                  )}

                  {/* Period Text at bottom of cover */}
                  <div className="absolute bottom-3 left-3 right-3 text-white text-xs flex items-center gap-1.5 font-medium drop-shadow-md z-10">
                    <CalendarDays className="w-3.5 h-3.5 text-museum-gold shrink-0" />
                    <span className="truncate">{periodStr}</span>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-2">
                    {/* Title (Truncated 2 lines) */}
                    <h3 className="font-bold text-base text-museum-brown line-clamp-2 group-hover:text-museum-gold transition-colors leading-snug">
                      {g.name}
                    </h3>

                    {/* Short Description (Truncated 2-3 lines) */}
                    <p className="text-xs text-gray-600 line-clamp-2 sm:line-clamp-3 leading-relaxed text-justify">
                      {g.description}
                    </p>
                  </div>

                  {/* Card Footer */}
                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-xs">
                    <span className="text-museum-brown font-bold flex items-center gap-1 group-hover:text-museum-gold transition-colors">
                      <span>Xem chi tiết</span>
                      <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </span>

                    {/* Admin Action Buttons */}
                    {isAdmin && (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => openEdit(g, e)}
                          className="p-1.5 text-gray-500 hover:text-museum-brown hover:bg-museum-cream rounded-lg transition-colors cursor-pointer"
                          title="Sửa chuyên đề"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(g);
                          }}
                          className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa chuyên đề"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Thematic Exhibition Detail Modal */}
      {selectedGallery && (() => {
        const rawImages =
          selectedGallery.galleryImages && selectedGallery.galleryImages.length > 0
            ? selectedGallery.galleryImages
            : [selectedGallery.image || '/images/museum-hero.jpg'];

        const parsedImages = rawImages.map(parseImage);
        const currentImgObj = parsedImages[activeImageIndex] || parsedImages[0];
        const artifacts = selectedGallery.highlightArtifacts || [];

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fadeIn">
            <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
              {/* Modal Top Image Carousel / Banner */}
              <div className="relative h-64 sm:h-80 md:h-96 bg-stone-900 shrink-0 group select-none overflow-hidden">
                <img
                  src={currentImgObj.url}
                  alt={currentImgObj.caption || selectedGallery.name}
                  loading="lazy"
                  decoding="async"
                  className="w-full h-full object-contain sm:object-cover transition-all duration-300 cursor-pointer"
                  onClick={() =>
                    setPreviewImage({
                      src: currentImgObj.url,
                      title: currentImgObj.caption || selectedGallery.name,
                      description: selectedGallery.description,
                    })
                  }
                  onError={(e) => {
                    e.target.src = '/images/museum-hero.jpg';
                  }}
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/20 pointer-events-none" />

                {/* Top Actions: ZoomIn + Close */}
                <div className="absolute top-4 right-4 flex items-center gap-2 z-20">
                  <button
                    onClick={() =>
                      setPreviewImage({
                        src: currentImgObj.url,
                        title: currentImgObj.caption || selectedGallery.name,
                        description: selectedGallery.description,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md backdrop-blur-xs border border-white/10"
                    title="Phóng to ảnh"
                  >
                    <ZoomIn className="w-4 h-4 text-museum-gold" />
                    <span className="hidden sm:inline">Phóng to</span>
                  </button>
                  <button
                    onClick={() => setSelectedGallery(null)}
                    className="w-8 h-8 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all cursor-pointer shadow-md border border-white/10"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {/* Status & Code on Top-Left */}
                <div className="absolute top-4 left-4 flex items-center gap-2 z-20">
                  {getStatusBadge(selectedGallery.status)}
                  <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-amber-200 border border-amber-400/30 text-xs font-mono font-bold rounded-lg shadow-sm">
                    {selectedGallery.id}
                  </span>
                </div>

                {/* Prev / Next Buttons (if multiple images) */}
                {parsedImages.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev > 0 ? prev - 1 : parsedImages.length - 1
                        )
                      }
                      className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all z-20 cursor-pointer shadow-md border border-white/10"
                      title="Ảnh trước"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev < parsedImages.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 hover:bg-black text-white flex items-center justify-center transition-all z-20 cursor-pointer shadow-md border border-white/10"
                      title="Ảnh tiếp theo"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </>
                )}

                {/* Bottom Title & Image Thumbnails Carousel */}
                <div className="absolute bottom-4 inset-x-4 flex flex-col sm:flex-row sm:items-end justify-between gap-3 z-20 text-white">
                  <div className="space-y-1 max-w-xl">
                    <h3 className="text-lg sm:text-2xl font-bold leading-tight drop-shadow-md">
                      {selectedGallery.name}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-white/90">
                      <CalendarDays className="w-4 h-4 text-museum-gold shrink-0" />
                      <span>{formatPeriod(selectedGallery.startDate, selectedGallery.endDate)}</span>
                    </div>
                    {currentImgObj.caption && (
                      <p className="text-xs text-amber-200 italic drop-shadow-xs">
                        {currentImgObj.caption}
                      </p>
                    )}
                  </div>

                  {/* Thumbnail Filmstrip */}
                  {parsedImages.length > 1 && (
                    <div className="flex items-center gap-1.5 overflow-x-auto max-w-full sm:max-w-xs pb-1 shrink-0">
                      {parsedImages.map((img, idx) => (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`w-11 h-8 rounded-lg overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                            activeImageIndex === idx
                              ? 'border-museum-gold scale-105 shadow-md ring-2 ring-museum-gold/50'
                              : 'border-white/50 opacity-70 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={img.url}
                            alt="thumb"
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Scrollable Body */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-gray-700">
                {/* Location Bar */}
                <div className="p-4 bg-museum-ivory/80 rounded-2xl border border-museum-gold/30 flex items-start sm:items-center gap-2.5 text-xs font-semibold text-museum-brown">
                  <MapPin className="w-4 h-4 text-museum-gold shrink-0 mt-0.5 sm:mt-0" />
                  <div>
                    <span className="font-bold text-gray-900 mr-1.5">Địa điểm trưng bày:</span>
                    <span>
                      {selectedGallery.location ||
                        'Bảo tàng Lịch sử Quốc gia – Số 1 Tràng Tiền / 216 Trần Quang Khải, Hoàn Kiếm, Hà Nội'}
                    </span>
                  </div>
                </div>

                {/* Detailed Narrative Section */}
                <div>
                  <h4 className="text-sm font-extrabold text-museum-brown uppercase tracking-wider mb-2.5 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-museum-gold" />
                    <span>Nội dung & Bối cảnh lịch sử</span>
                  </h4>
                  <div className="text-xs sm:text-sm text-gray-700 leading-relaxed space-y-3 text-justify">
                    <p className="font-medium text-gray-800 bg-museum-cream/30 p-3.5 rounded-xl border-l-4 border-museum-gold">
                      {selectedGallery.description}
                    </p>
                    {selectedGallery.detailedContent &&
                      selectedGallery.detailedContent !== selectedGallery.description && (
                        <p className="whitespace-pre-line text-gray-700">
                          {selectedGallery.detailedContent}
                        </p>
                      )}
                  </div>
                </div>

                {/* Highlight Artifacts Showcase Cards */}
                {artifacts.length > 0 && (
                  <div className="pt-2">
                    <h4 className="text-sm font-extrabold text-museum-brown uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-museum-gold" />
                      <span>Danh mục hiện vật đặc biệt ({artifacts.length})</span>
                    </h4>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {artifacts.map((art, idx) => (
                        <div
                          key={idx}
                          onClick={() =>
                            setPreviewImage({
                              src: art.image || '/images/binh-gom.jpg',
                              title: art.name,
                              description: art.description,
                              period: art.period,
                            })
                          }
                          className="bg-museum-ivory/30 hover:bg-white p-4 rounded-2xl border border-gray-200 hover:border-museum-gold/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer group/art"
                        >
                          <div className="flex items-start gap-3">
                            {art.image ? (
                              <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shrink-0 shadow-2xs">
                                <img
                                  src={art.image}
                                  alt={art.name}
                                  loading="lazy"
                                  decoding="async"
                                  className="w-full h-full object-cover group-hover/art:scale-110 transition-transform duration-300"
                                  onError={(e) => {
                                    e.target.src = '/images/binh-gom.jpg';
                                  }}
                                />
                                <div className="absolute inset-0 bg-black/20 opacity-0 group-hover/art:opacity-100 flex items-center justify-center transition-opacity">
                                  <ZoomIn className="w-4 h-4 text-white" />
                                </div>
                              </div>
                            ) : (
                              <div className="w-12 h-12 rounded-xl bg-museum-cream text-museum-gold flex items-center justify-center font-extrabold text-sm shrink-0 border border-museum-gold/30">
                                #{idx + 1}
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-1">
                                <span className="text-[10px] font-bold text-museum-gold uppercase">
                                  Hiện vật #{idx + 1}
                                </span>
                                {art.period && (
                                  <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full font-semibold truncate">
                                    {art.period}
                                  </span>
                                )}
                              </div>
                              <h5 className="font-extrabold text-sm text-museum-brown mt-0.5 leading-snug group-hover/art:text-museum-gold transition-colors">
                                {art.name}
                              </h5>
                            </div>
                          </div>

                          {art.description && (
                            <p className="text-xs text-gray-600 leading-relaxed italic pt-2 border-t border-gray-100 text-justify">
                              "{art.description}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Source Note (if available) */}
                {selectedGallery.sourceNote && (
                  <div className="pt-2 border-t border-gray-100 text-xs text-gray-400 italic flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span>Nguồn tư liệu: {selectedGallery.sourceNote}</span>
                  </div>
                )}
              </div>

              {/* Modal Bottom Footer */}
              <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
                <button
                  onClick={(e) => handleShare(selectedGallery, e)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition-all cursor-pointer shadow-2xs"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Chia sẻ chuyên đề</span>
                </button>

                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      onClick={() => {
                        const item = selectedGallery;
                        setSelectedGallery(null);
                        openEdit(item);
                      }}
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-museum-brown bg-museum-cream hover:bg-museum-gold hover:text-white rounded-xl transition-all cursor-pointer"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedGallery(null)}
                    className="px-6 py-2 text-xs font-bold text-white bg-museum-brown hover:bg-museum-brown-dk rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. Form Modal (Thêm / Sửa Trưng bày chuyên đề) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-3xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Header */}
            <div className="p-5 sm:p-6 bg-museum-ivory border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <BookOpen className="w-6 h-6 text-museum-gold" />
                <h3 className="font-extrabold text-lg text-museum-brown">
                  {editingItem ? 'CẬP NHẬT TRƯNG BÀY CHUYÊN ĐỀ' : 'THÊM TRƯNG BÀY CHUYÊN ĐỀ MỚI'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormOpen(false)}
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Form */}
            <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-4 flex-1">
              {/* Name */}
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1.5">
                  Tên chuyên đề trưng bày <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Ví dụ: Vũ khúc Thiền môn - Nghệ thuật Phật giáo thời Lý"
                  className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Status & Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1.5">
                    Trạng thái <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm font-semibold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                  >
                    <option value="Đang diễn ra">🟢 Đang diễn ra</option>
                    <option value="Sắp diễn ra">🟡 Sắp diễn ra</option>
                    <option value="Đã diễn ra">⚪ Đã diễn ra</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1.5">
                    Địa điểm trưng bày
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="Số 1 Tràng Tiền / 216 Trần Quang Khải, Hà Nội"
                    className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                  />
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1.5">
                    Ngày bắt đầu (Tùy chọn)
                  </label>
                  <input
                    type="date"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1.5">
                    Ngày kết thúc (Tùy chọn)
                  </label>
                  <input
                    type="date"
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                  />
                  {errors.endDate && <p className="text-red-500 text-xs mt-1">{errors.endDate}</p>}
                </div>
              </div>

              {/* Image URL & Source URL */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1.5">
                    Đường dẫn ảnh bìa
                  </label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="https://... hoặc /images/tuong-phat.jpg"
                    className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1.5">
                    Ghi chú nguồn tư liệu (source_note)
                  </label>
                  <input
                    type="text"
                    value={formData.sourceNote}
                    onChange={(e) => setFormData({ ...formData, sourceNote: e.target.value })}
                    placeholder="Báo Nhân Dân / Báo điện tử ĐCSVN"
                    className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1.5">
                  Mô tả tóm tắt <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả ngắn gọn về chủ đề, nội dung và ý nghĩa..."
                  className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                />
                {errors.description && (
                  <p className="text-red-500 text-xs mt-1">{errors.description}</p>
                )}
              </div>

              {/* Detailed Content */}
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1.5">
                  Nội dung chi tiết & Bối cảnh lịch sử
                </label>
                <textarea
                  rows={4}
                  value={formData.detailedContent}
                  onChange={(e) => setFormData({ ...formData, detailedContent: e.target.value })}
                  placeholder="Nội dung chuyên sâu về các hiện vật, thời kỳ, ý nghĩa lịch sử..."
                  className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                />
              </div>

              {/* Highlight Artifacts Section */}
              <div className="pt-2 border-t border-gray-200">
                <div className="flex items-center justify-between mb-2.5">
                  <label className="block text-xs font-bold text-museum-brown">
                    Danh mục hiện vật tiêu biểu trong chuyên đề ({formData.highlightArtifacts.length})
                  </label>
                  <button
                    type="button"
                    onClick={addArtifactRow}
                    className="inline-flex items-center gap-1 text-xs font-bold text-museum-gold hover:text-museum-brown transition-colors cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm dòng hiện vật</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {formData.highlightArtifacts.map((art, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-gray-50 rounded-xl border border-gray-200 space-y-2 relative"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-museum-gold">
                          Hiện vật #{idx + 1}
                        </span>
                        {formData.highlightArtifacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArtifactRow(idx)}
                            className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                          >
                            Xóa
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={art.name}
                          onChange={(e) => handleArtifactFieldChange(idx, 'name', e.target.value)}
                          placeholder="Tên hiện vật..."
                          className="w-full px-3 py-1.5 bg-white text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-museum-gold"
                        />
                        <input
                          type="text"
                          value={art.period || ''}
                          onChange={(e) => handleArtifactFieldChange(idx, 'period', e.target.value)}
                          placeholder="Niên đại (ví dụ: Thời Lý - Thế kỷ 11)"
                          className="w-full px-3 py-1.5 bg-white text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-museum-gold"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={art.image || ''}
                          onChange={(e) => handleArtifactFieldChange(idx, 'image', e.target.value)}
                          placeholder="URL ảnh hiện vật..."
                          className="w-full px-3 py-1.5 bg-white text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-museum-gold"
                        />
                        <input
                          type="text"
                          value={art.description || ''}
                          onChange={(e) =>
                            handleArtifactFieldChange(idx, 'description', e.target.value)
                          }
                          placeholder="Mô tả tóm tắt hiện vật..."
                          className="w-full px-3 py-1.5 bg-white text-xs rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-museum-gold"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form Footer Actions */}
              <div className="pt-4 border-t border-gray-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2 text-xs font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 text-xs font-bold text-white bg-museum-brown hover:bg-museum-brown-dk rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingItem ? 'Lưu thay đổi' : 'Thêm chuyên đề'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Confirm Delete Modal */}
      {deleteTarget && (
        <ConfirmModal
          isOpen={!!deleteTarget}
          onClose={() => setDeleteTarget(null)}
          onConfirm={async () => {
            if (deleteTarget) {
              await deleteGallery(deleteTarget.id);
              setDeleteTarget(null);
            }
          }}
          title="Xác nhận xóa trưng bày chuyên đề"
          message={`Bạn có chắc chắn muốn xóa chuyên đề "${deleteTarget.name}" (${deleteTarget.id})? Thao tác này sẽ xóa vĩnh viễn khỏi hệ thống.`}
          confirmText="Xác nhận xóa"
          cancelText="Hủy bỏ"
          danger
        />
      )}

      {/* 7. Fullscreen Image Lightbox Preview Modal (Z-[9999] High-Priority Overlay) */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-between p-3 sm:p-6 bg-black/95 backdrop-blur-md animate-fadeIn cursor-pointer select-none"
        >
          {/* Top Bar: Title & Big Close Button */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-5xl flex items-center justify-between gap-4 py-2 px-3 bg-black/50 backdrop-blur-md rounded-2xl border border-white/10 shrink-0 z-10"
          >
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
              <h4 className="font-extrabold text-sm sm:text-base text-amber-300 truncate">
                {previewImage.title || 'Hình ảnh tư liệu'}
              </h4>
              {previewImage.period && (
                <span className="hidden sm:inline-block px-2.5 py-0.5 bg-amber-400/20 text-amber-200 border border-amber-400/30 text-xs font-semibold rounded-full shrink-0">
                  {previewImage.period}
                </span>
              )}
            </div>

            <button
              onClick={() => setPreviewImage(null)}
              className="px-3.5 py-1.5 rounded-xl bg-white/20 hover:bg-red-600 text-white text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer shadow-lg border border-white/20 hover:scale-105 active:scale-95"
              title="Đóng (Phím ESC hoặc bấm ra ngoài)"
            >
              <X className="w-4 h-4" />
              <span>Đóng</span>
            </button>
          </div>

          {/* Center Image Viewport (Takes full remaining space) */}
          <div
            onClick={(e) => e.stopPropagation()}
            className="flex-1 w-full max-w-6xl flex items-center justify-center p-2 sm:p-4 min-h-0 cursor-default"
          >
            <img
              src={previewImage.src}
              alt={previewImage.title || 'Hiện vật'}
              className="max-h-[75vh] w-auto max-w-full object-contain rounded-2xl shadow-2xl drop-shadow-[0_15px_35px_rgba(0,0,0,0.9)] border border-white/10"
              onError={(e) => {
                e.target.src = '/images/museum-hero.jpg';
              }}
            />
          </div>

          {/* Bottom Description (if present) */}
          {previewImage.description ? (
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-3xl bg-stone-900/90 backdrop-blur-md border border-white/15 rounded-2xl px-5 py-3 text-stone-200 text-xs sm:text-sm text-center leading-relaxed shrink-0 shadow-2xl"
            >
              <p>{previewImage.description}</p>
            </div>
          ) : (
            <div className="h-2 shrink-0" />
          )}
        </div>
      )}
    </div>
  );
};
