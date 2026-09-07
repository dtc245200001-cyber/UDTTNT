import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Sparkles,
  CalendarDays,
  Plus,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  Search,
  BookOpen,
  Landmark,
  MapPin,
  ExternalLink,
  Clock,
  CheckCircle2,
  Eye,
  Layers,
  ArrowRight,
  Share2,
  Image as ImageIcon,
  ChevronRight,
  ChevronLeft,
  Globe,
  ZoomIn,
  Maximize2,
  Grid,
  LayoutGrid,
  FileText,
} from 'lucide-react';
import { formatDate } from '@/utils/formatters';

const EMPTY_GALLERY = {
  name: '',
  description: '',
  detailedContent: '',
  status: 'Đang diễn ra',
  startDate: '',
  endDate: '',
  location: 'Bảo tàng Lịch sử Quốc gia – Số 1 Tràng Tiền / 216 Trần Quang Khải, Hoàn Kiếm, Hà Nội',
  sourceUrl: 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
  image: '/images/museum-hero.jpg',
  galleryImages: ['/images/museum-hero.jpg'],
  highlightArtifacts: [{ name: '', description: '', image: '', period: '' }],
};

export const Galleries = () => {
  const { galleries, addGallery, updateGallery, deleteGallery, currentUser, addToast } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã diễn ra'
  const [searchTerm, setSearchTerm] = useState('');

  // Selected Detail Modal State
  const [selectedGallery, setSelectedGallery] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [modalTab, setModalTab] = useState('artifacts'); // 'artifacts' | 'overview' | 'photos'
  const [previewImage, setPreviewImage] = useState(null); // Lightbox { src, title, description }

  // Form Modal State (Admin)
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_GALLERY);
  const [errors, setErrors] = useState({});

  // Delete Confirm State
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Tab counts
  const counts = {
    all: galleries.length,
    'Đang diễn ra': galleries.filter((g) => g.status === 'Đang diễn ra').length,
    'Sắp diễn ra': galleries.filter((g) => g.status === 'Sắp diễn ra').length,
    'Đã diễn ra': galleries.filter((g) => g.status === 'Đã diễn ra').length,
  };

  // Filtered galleries
  const filteredGalleries = galleries.filter((g) => {
    const matchesTab = activeTab === 'all' || g.status === activeTab;
    const term = searchTerm.toLowerCase().trim();
    const matchesSearch =
      !term ||
      g.name?.toLowerCase().includes(term) ||
      g.description?.toLowerCase().includes(term) ||
      g.id?.toLowerCase().includes(term) ||
      g.location?.toLowerCase().includes(term) ||
      (g.highlightArtifacts || []).some(
        (a) =>
          a.name?.toLowerCase().includes(term) ||
          a.description?.toLowerCase().includes(term) ||
          a.period?.toLowerCase().includes(term)
      );
    return matchesTab && matchesSearch;
  });

  // Modal handlers
  const openDetail = (item) => {
    setSelectedGallery(item);
    setActiveImageIndex(0);
    setModalTab('artifacts');
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
      image: item.image || '/images/museum-hero.jpg',
      galleryImages: item.galleryImages && item.galleryImages.length > 0 ? item.galleryImages : [item.image || '/images/museum-hero.jpg'],
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

    // Clean artifacts list
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
      highlightArtifacts: [...formData.highlightArtifacts, { name: '', description: '', image: '', period: '' }],
    });
  };

  const removeArtifactRow = (index) => {
    const list = formData.highlightArtifacts.filter((_, idx) => idx !== index);
    setFormData({
      ...formData,
      highlightArtifacts: list.length > 0 ? list : [{ name: '', description: '', image: '', period: '' }],
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'Đang diễn ra':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/90 backdrop-blur-sm text-white text-xs font-extrabold rounded-full shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Đang diễn ra
          </span>
        );
      case 'Sắp diễn ra':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/90 backdrop-blur-sm text-white text-xs font-extrabold rounded-full shadow-sm">
            <Clock className="w-3.5 h-3.5" />
            Sắp diễn ra
          </span>
        );
      case 'Đã diễn ra':
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-stone-700/85 backdrop-blur-sm text-stone-100 text-xs font-bold rounded-full shadow-sm">
            <CheckCircle2 className="w-3.5 h-3.5 text-stone-300" />
            Đã diễn ra
          </span>
        );
    }
  };

  const formatPeriod = (start, end) => {
    if (!start && !end) return 'Trưng bày thường trực / Lưu trữ lịch sử';
    if (start && end) {
      if (start === end) return `Ngày ${formatDate(start)}`;
      return `${formatDate(start)} – ${formatDate(end)}`;
    }
    if (start) return `Từ ngày ${formatDate(start)}`;
    return `Đến ngày ${formatDate(end)}`;
  };

  const handleShare = (gallery, e) => {
    if (e) e.stopPropagation();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      addToast('Đã sao chép liên kết chuyên đề vào bộ nhớ tạm!', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Trưng bày chuyên đề</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-museum-brown tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 sm:w-8 sm:h-8 text-museum-gold" />
            <span>TRƯNG BÀY CHUYÊN ĐỀ LỊCH SỬ</span>
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 mt-1">
            Không gian trưng bày tư liệu, hiện vật và công nghệ số theo từng mốc son lịch sử của Bảo tàng Lịch sử Quốc gia.
          </p>
        </div>

        {isAdmin && (
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-5 h-5" />
            <span>+ Thêm chuyên đề mới</span>
          </button>
        )}
      </div>

      {/* 2. Filter Tabs & Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
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
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all shrink-0 cursor-pointer flex items-center gap-1.5 ${
                  active
                    ? 'bg-museum-brown text-white shadow-xs'
                    : 'bg-gray-50 text-gray-600 hover:bg-museum-cream hover:text-museum-brown'
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.2 text-[10px] rounded-full font-black ${
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
            placeholder="Tìm theo tên, hiện vật, mốc lịch sử..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
          />
        </div>
      </div>

      {/* 3. Thematic Galleries Cards List */}
      {filteredGalleries.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-gray-100 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-museum-cream text-museum-gold mx-auto flex items-center justify-center mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-museum-brown">Không tìm thấy chuyên đề trưng bày</h3>
          <p className="text-xs text-gray-500 mt-1">
            Không có trưng bày chuyên đề nào phù hợp với từ khóa hoặc bộ lọc đã chọn.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGalleries.map((g) => {
            const hasArtifacts = g.highlightArtifacts && g.highlightArtifacts.length > 0;
            return (
              <div
                key={g.id}
                onClick={() => openDetail(g)}
                className="bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-xl border border-gray-100 hover:border-museum-gold/40 transition-all duration-300 flex flex-col group cursor-pointer"
              >
                {/* Image Banner Header */}
                <div className="relative h-60 sm:h-68 bg-stone-900 overflow-hidden">
                  <img
                    src={g.image || '/images/museum-hero.jpg'}
                    alt={g.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 opacity-90"
                    onError={(e) => {
                      e.target.src = '/images/museum-hero.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                  {/* Top Bar on Image: Status Badge & ID */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                    {getStatusBadge(g.status)}
                    <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-amber-200 border border-amber-400/30 text-[11px] font-mono font-bold rounded-lg shadow-sm">
                      {g.id}
                    </span>
                  </div>

                  {/* Date Period & Location Tag at Bottom of Banner */}
                  <div className="absolute bottom-4 left-4 right-4 space-y-1">
                    <div className="flex items-center gap-2 text-white/95 text-xs font-semibold">
                      <CalendarDays className="w-4 h-4 text-museum-gold shrink-0" />
                      <span className="truncate">{formatPeriod(g.startDate, g.endDate)}</span>
                    </div>
                    {g.location && (
                      <div className="flex items-center gap-2 text-white/80 text-[11px] font-normal truncate">
                        <MapPin className="w-3.5 h-3.5 text-museum-gold shrink-0" />
                        <span className="truncate">{g.location}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div>
                    {/* Title */}
                    <h3 className="font-extrabold text-lg sm:text-xl text-museum-brown leading-snug group-hover:text-museum-gold transition-colors">
                      {g.name}
                    </h3>

                    {/* Short Description */}
                    <p className="text-xs sm:text-sm text-gray-600 font-normal mt-2.5 leading-relaxed line-clamp-3 text-justify">
                      {g.description}
                    </p>

                    {/* Highlight Artifacts Mini Preview */}
                    {hasArtifacts && (
                      <div className="mt-4 pt-4 border-t border-gray-100">
                        <div className="flex items-center justify-between text-xs font-bold text-museum-brown mb-2.5">
                          <div className="flex items-center gap-1.5">
                            <Sparkles className="w-4 h-4 text-museum-gold shrink-0" />
                            <span>HIỆN VẬT ĐẶC BIỆT ({g.highlightArtifacts.length})</span>
                          </div>
                          <span className="text-[11px] text-museum-gold font-semibold group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                            Xem chi tiết <ChevronRight className="w-3 h-3" />
                          </span>
                        </div>

                        <div className="space-y-1.5 bg-museum-ivory/70 p-3 rounded-2xl border border-museum-gold/20">
                          {g.highlightArtifacts.slice(0, 3).map((art, idx) => (
                            <div key={idx} className="text-xs flex items-center gap-2 truncate">
                              <span className="w-4 h-4 rounded-full bg-museum-gold text-white font-extrabold text-[9px] flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <span className="font-bold text-museum-brown truncate">{art.name}</span>
                              {art.period && (
                                <span className="text-[10px] text-gray-400 shrink-0">({art.period})</span>
                              )}
                            </div>
                          ))}
                          {g.highlightArtifacts.length > 3 && (
                            <div className="text-[11px] text-museum-gold font-bold pl-6 pt-0.5">
                              + Thêm {g.highlightArtifacts.length - 3} hiện vật quý khác...
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Bottom CTA & Admin Actions */}
                  <div className="pt-4 border-t border-gray-100 flex items-center justify-between gap-3">
                    <button
                      onClick={() => openDetail(g)}
                      className="inline-flex items-center gap-1.5 text-xs font-extrabold text-museum-brown group-hover:text-museum-gold transition-colors"
                    >
                      <Eye className="w-4 h-4 text-museum-gold" />
                      <span>Khám phá chuyên đề</span>
                      <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleShare(g, e)}
                        className="p-2 text-gray-400 hover:text-museum-brown hover:bg-museum-cream rounded-xl transition-colors"
                        title="Chia sẻ liên kết"
                      >
                        <Share2 className="w-4 h-4" />
                      </button>

                      {isAdmin && (
                        <>
                          <button
                            onClick={(e) => openEdit(g, e)}
                            className="p-2 text-museum-brown hover:bg-museum-gold hover:text-white rounded-xl transition-colors"
                            title="Sửa chuyên đề"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(g);
                            }}
                            className="p-2 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                            title="Xóa chuyên đề"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Expansive Ultra-Wide Thematic Exhibition Theater Modal */}
      {selectedGallery && (() => {
        const galleryImages =
          selectedGallery.galleryImages && selectedGallery.galleryImages.length > 0
            ? selectedGallery.galleryImages
            : [selectedGallery.image || '/images/museum-hero.jpg'];
        const currentImageUrl = galleryImages[activeImageIndex] || galleryImages[0];
        const artifacts = selectedGallery.highlightArtifacts || [];
        const matchingArtifact = artifacts.find((a) => a.image === currentImageUrl);

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/85 backdrop-blur-sm animate-fadeIn">
            <div className="bg-stone-900 w-full max-w-7xl rounded-3xl shadow-2xl border border-stone-800 overflow-hidden flex flex-col max-h-[96vh] text-stone-100">
              {/* Header Bar */}
              <div className="px-5 py-3.5 bg-stone-950/90 border-b border-stone-800 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  {getStatusBadge(selectedGallery.status)}
                  <span className="hidden sm:inline-block px-2.5 py-1 bg-stone-800 text-amber-300 border border-amber-500/30 text-xs font-mono font-bold rounded-lg shadow-xs">
                    {selectedGallery.id}
                  </span>
                  <h3 className="text-sm sm:text-lg font-bold text-stone-100 truncate">
                    {selectedGallery.name}
                  </h3>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() =>
                      setPreviewImage({
                        src: currentImageUrl,
                        title: matchingArtifact?.name || selectedGallery.name,
                        description: matchingArtifact?.description || selectedGallery.description,
                        period: matchingArtifact?.period,
                      })
                    }
                    className="px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer border border-amber-500/20"
                    title="Phóng to toàn màn hình"
                  >
                    <Maximize2 className="w-4 h-4 text-amber-400" />
                    <span className="hidden md:inline">Toàn màn hình</span>
                  </button>
                  <button
                    onClick={() => setSelectedGallery(null)}
                    className="w-8 h-8 rounded-full bg-stone-800 hover:bg-red-950 hover:text-red-400 text-stone-300 flex items-center justify-center transition-all cursor-pointer border border-stone-700"
                    title="Đóng cửa sổ"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Theater Stage for High-Res Image Display */}
              <div className="relative bg-black h-[340px] sm:h-[440px] md:h-[490px] flex items-center justify-center overflow-hidden shrink-0 group select-none">
                {/* Background blurred ambiance */}
                <div
                  className="absolute inset-0 bg-cover bg-center blur-2xl opacity-20 scale-110 pointer-events-none"
                  style={{ backgroundImage: `url(${currentImageUrl})` }}
                />

                {/* Main Theater Image */}
                <img
                  src={currentImageUrl}
                  alt={matchingArtifact?.name || selectedGallery.name}
                  className="relative max-h-full max-w-full object-contain cursor-pointer transition-transform duration-300 hover:scale-[1.01] drop-shadow-2xl z-10"
                  onClick={() =>
                    setPreviewImage({
                      src: currentImageUrl,
                      title: matchingArtifact?.name || selectedGallery.name,
                      description: matchingArtifact?.description || selectedGallery.description,
                      period: matchingArtifact?.period,
                    })
                  }
                  onError={(e) => {
                    e.target.src = '/images/museum-hero.jpg';
                  }}
                />

                {/* Prev / Next Stage Navigation Buttons */}
                {galleryImages.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev > 0 ? prev - 1 : galleryImages.length - 1
                        )
                      }
                      className="absolute left-3 sm:left-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/65 hover:bg-amber-500 hover:text-stone-950 text-white flex items-center justify-center transition-all z-20 cursor-pointer shadow-xl backdrop-blur-xs border border-white/20 hover:border-amber-400"
                      title="Ảnh trước"
                    >
                      <ChevronLeft className="w-6 h-6" />
                    </button>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          prev < galleryImages.length - 1 ? prev + 1 : 0
                        )
                      }
                      className="absolute right-3 sm:right-5 top-1/2 -translate-y-1/2 w-11 h-11 rounded-full bg-black/65 hover:bg-amber-500 hover:text-stone-950 text-white flex items-center justify-center transition-all z-20 cursor-pointer shadow-xl backdrop-blur-xs border border-white/20 hover:border-amber-400"
                      title="Ảnh tiếp theo"
                    >
                      <ChevronRight className="w-6 h-6" />
                    </button>
                  </>
                )}

                {/* Top Overlay Badge - Image Counter */}
                <div className="absolute top-3 left-4 z-20 flex items-center gap-2">
                  <span className="px-3 py-1 bg-black/70 backdrop-blur-md text-white text-xs font-semibold rounded-full border border-white/15 shadow-md">
                    Tư liệu {activeImageIndex + 1} / {galleryImages.length}
                  </span>
                </div>

                {/* Bottom Overlay Label for current photo / artifact */}
                <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/90 via-black/50 to-transparent p-4 sm:p-5 z-20 flex flex-col sm:flex-row sm:items-end justify-between gap-2 pointer-events-none">
                  <div className="max-w-2xl">
                    {matchingArtifact ? (
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold text-amber-400 uppercase tracking-wider bg-amber-400/20 px-2 py-0.5 rounded-md border border-amber-400/30">
                            Hiện vật tiêu biểu
                          </span>
                          {matchingArtifact.period && (
                            <span className="text-[11px] text-stone-300 bg-stone-800/80 px-2 py-0.5 rounded-md">
                              {matchingArtifact.period}
                            </span>
                          )}
                        </div>
                        <h4 className="text-base sm:text-xl font-extrabold text-white leading-tight drop-shadow-md">
                          {matchingArtifact.name}
                        </h4>
                      </div>
                    ) : (
                      <h4 className="text-base sm:text-lg font-bold text-white leading-tight drop-shadow-md">
                        {selectedGallery.name}
                      </h4>
                    )}
                  </div>

                  <div className="pointer-events-auto">
                    <button
                      onClick={() =>
                        setPreviewImage({
                          src: currentImageUrl,
                          title: matchingArtifact?.name || selectedGallery.name,
                          description: matchingArtifact?.description || selectedGallery.description,
                          period: matchingArtifact?.period,
                        })
                      }
                      className="px-3 py-1.5 rounded-xl bg-amber-500/90 hover:bg-amber-400 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow-lg transition-all cursor-pointer"
                    >
                      <ZoomIn className="w-4 h-4" />
                      <span>Xem phóng to cỡ lớn</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Horizontal Filmstrip Thumbnail Carousel */}
              {galleryImages.length > 1 && (
                <div className="px-4 py-2.5 bg-stone-950 border-b border-stone-800 shrink-0">
                  <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-stone-700 scrollbar-track-stone-900">
                    {galleryImages.map((img, idx) => {
                      const isAct = activeImageIndex === idx;
                      const art = artifacts.find((a) => a.image === img);
                      return (
                        <button
                          key={idx}
                          onClick={() => setActiveImageIndex(idx)}
                          className={`relative w-20 h-14 sm:w-24 sm:h-16 rounded-xl overflow-hidden border-2 shrink-0 transition-all cursor-pointer group/thumb ${
                            isAct
                              ? 'border-amber-400 ring-2 ring-amber-400/50 scale-105 shadow-lg'
                              : 'border-stone-700 opacity-60 hover:opacity-100 hover:border-stone-500'
                          }`}
                          title={art?.name || `Ảnh ${idx + 1}`}
                        >
                          <img
                            src={img}
                            alt="thumb"
                            className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-300"
                            onError={(e) => {
                              e.target.src = '/images/museum-hero.jpg';
                            }}
                          />
                          <span className="absolute bottom-0.5 right-1 text-[9px] font-bold text-white bg-black/75 px-1 rounded">
                            #{idx + 1}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sub-Tabs Selector */}
              <div className="px-6 pt-3 bg-stone-900 border-b border-stone-800 flex items-center gap-2 sm:gap-4 shrink-0">
                <button
                  onClick={() => setModalTab('artifacts')}
                  className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    modalTab === 'artifacts'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Bộ sưu tập hiện vật quý ({artifacts.length})</span>
                </button>

                <button
                  onClick={() => setModalTab('overview')}
                  className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    modalTab === 'overview'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <FileText className="w-4 h-4 text-amber-400" />
                  <span>Tổng quan & Bối cảnh lịch sử</span>
                </button>

                <button
                  onClick={() => setModalTab('photos')}
                  className={`pb-3 px-3 text-xs sm:text-sm font-bold flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    modalTab === 'photos'
                      ? 'border-amber-400 text-amber-300'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  <LayoutGrid className="w-4 h-4 text-amber-400" />
                  <span>Thư viện ảnh tư liệu ({galleryImages.length})</span>
                </button>
              </div>

              {/* Modal Scrollable Body Content */}
              <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-stone-900/90 text-stone-200">
                {/* Location & Dates Bar */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 bg-stone-950/80 rounded-2xl border border-stone-800 text-xs">
                  <div className="flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-100 block">Địa điểm trưng bày:</span>
                      <span className="text-stone-300">
                        {selectedGallery.location ||
                          'Bảo tàng Lịch sử Quốc gia – Số 1 Tràng Tiền / 216 Trần Quang Khải, Hoàn Kiếm, Hà Nội'}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2.5">
                    <CalendarDays className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-stone-100 block">Thời gian diễn ra:</span>
                      <span className="text-amber-200 font-semibold">
                        {formatPeriod(selectedGallery.startDate, selectedGallery.endDate)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* TAB 1: ARTIFACTS SHOWCASE (LARGE HIGH-VISIBILITY CARDS) */}
                {modalTab === 'artifacts' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span>Danh mục bảo vật & hiện vật nghệ thuật ({artifacts.length})</span>
                      </h4>
                      <span className="text-xs text-stone-400">
                        * Nhấn vào ảnh bất kỳ để xem ở kích thước lớn
                      </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                      {artifacts.map((art, idx) => {
                        const imgIdx = galleryImages.findIndex((img) => img === art.image);
                        const isCurrentActive = imgIdx === activeImageIndex;

                        return (
                          <div
                            key={idx}
                            className={`bg-stone-950 rounded-2xl border overflow-hidden transition-all duration-300 flex flex-col group/card ${
                              isCurrentActive
                                ? 'border-amber-400 ring-2 ring-amber-400/30 shadow-xl'
                                : 'border-stone-800 hover:border-amber-400/60 shadow-md'
                            }`}
                          >
                            {/* Big Image Header */}
                            <div
                              onClick={() => {
                                if (imgIdx !== -1) setActiveImageIndex(imgIdx);
                                setPreviewImage({
                                  src: art.image || '/images/binh-gom.jpg',
                                  title: art.name,
                                  description: art.description,
                                  period: art.period,
                                });
                              }}
                              className="relative h-60 sm:h-64 bg-stone-900 overflow-hidden cursor-pointer"
                            >
                              <img
                                src={art.image || '/images/binh-gom.jpg'}
                                alt={art.name}
                                className="w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
                                onError={(e) => {
                                  e.target.src = '/images/binh-gom.jpg';
                                }}
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 opacity-70 group-hover/card:opacity-90 transition-opacity" />

                              {/* Number Badge */}
                              <div className="absolute top-3 left-3 px-2.5 py-1 bg-black/75 backdrop-blur-md rounded-lg border border-white/20 text-amber-300 text-xs font-mono font-bold">
                                #{idx + 1}
                              </div>

                              {/* Period Badge */}
                              {art.period && (
                                <div className="absolute top-3 right-3 px-2.5 py-1 bg-amber-400/20 backdrop-blur-md rounded-lg border border-amber-400/40 text-amber-200 text-xs font-semibold">
                                  {art.period}
                                </div>
                              )}

                              {/* Hover Zoom CTA */}
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/card:opacity-100 transition-opacity bg-black/40">
                                <span className="px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 text-xs font-bold flex items-center gap-1.5 shadow-lg">
                                  <ZoomIn className="w-4 h-4" />
                                  <span>Phóng to xem chi tiết</span>
                                </span>
                              </div>
                            </div>

                            {/* Card Details */}
                            <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                              <div>
                                <h5 className="font-extrabold text-base text-stone-100 group-hover/card:text-amber-300 transition-colors leading-snug">
                                  {art.name}
                                </h5>
                                {art.description && (
                                  <p className="text-xs sm:text-sm text-stone-300 leading-relaxed mt-2.5 text-justify">
                                    {art.description}
                                  </p>
                                )}
                              </div>

                              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between">
                                <button
                                  onClick={() => {
                                    if (imgIdx !== -1) setActiveImageIndex(imgIdx);
                                  }}
                                  className="text-xs text-amber-400 hover:text-amber-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                  <span>Đưa lên khán đài chính</span>
                                </button>
                                <button
                                  onClick={() =>
                                    setPreviewImage({
                                      src: art.image || '/images/binh-gom.jpg',
                                      title: art.name,
                                      description: art.description,
                                      period: art.period,
                                    })
                                  }
                                  className="p-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-amber-300 transition-colors cursor-pointer"
                                  title="Phóng to"
                                >
                                  <Maximize2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* TAB 2: OVERVIEW & HISTORICAL CONTEXT */}
                {modalTab === 'overview' && (
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-amber-400" />
                        <span>Bối cảnh & Ý nghĩa lịch sử chuyên đề</span>
                      </h4>

                      <div className="text-sm text-stone-200 leading-relaxed space-y-4 text-justify bg-stone-950/80 p-5 rounded-2xl border border-stone-800">
                        <p className="font-medium text-amber-100 bg-amber-950/30 p-4 rounded-xl border-l-4 border-amber-400">
                          {selectedGallery.description}
                        </p>
                        {selectedGallery.detailedContent &&
                          selectedGallery.detailedContent !== selectedGallery.description && (
                            <div className="whitespace-pre-line text-stone-300 space-y-3 pt-2">
                              {selectedGallery.detailedContent}
                            </div>
                          )}
                      </div>
                    </div>
                  </div>
                )}

                {/* TAB 3: ALL PHOTOS GALLERY (FULL GRID) */}
                {modalTab === 'photos' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-2">
                        <LayoutGrid className="w-4 h-4 text-amber-400" />
                        <span>Toàn bộ thư viện ảnh tư liệu ({galleryImages.length})</span>
                      </h4>
                      <span className="text-xs text-stone-400">
                        * Nhấn vào ảnh để phóng to
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {galleryImages.map((img, idx) => {
                        const art = artifacts.find((a) => a.image === img);
                        return (
                          <div
                            key={idx}
                            onClick={() => {
                              setActiveImageIndex(idx);
                              setPreviewImage({
                                src: img,
                                title: art?.name || `Tư liệu hiện vật #${idx + 1}`,
                                description: art?.description || selectedGallery.description,
                                period: art?.period,
                              });
                            }}
                            className="group/photocard relative h-44 sm:h-52 bg-stone-950 rounded-2xl overflow-hidden border border-stone-800 hover:border-amber-400 cursor-pointer shadow-md transition-all"
                          >
                            <img
                              src={img}
                              alt={art?.name || `Ảnh ${idx + 1}`}
                              className="w-full h-full object-cover group-hover/photocard:scale-110 transition-transform duration-500"
                              onError={(e) => {
                                e.target.src = '/images/museum-hero.jpg';
                              }}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20 opacity-60 group-hover/photocard:opacity-90 transition-opacity" />

                            <div className="absolute top-2 left-2 px-2 py-0.5 bg-black/75 rounded text-[10px] font-bold text-amber-300">
                              #{idx + 1}
                            </div>

                            <div className="absolute bottom-2 inset-x-2">
                              <p className="text-xs font-bold text-white truncate drop-shadow-md">
                                {art?.name || `Tư liệu #${idx + 1}`}
                              </p>
                            </div>

                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover/photocard:opacity-100 transition-opacity bg-black/40">
                              <ZoomIn className="w-6 h-6 text-amber-400" />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Modal Bottom Footer */}
              <div className="px-6 py-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between shrink-0">
                <button
                  onClick={(e) => handleShare(selectedGallery, e)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-stone-300 bg-stone-800 hover:bg-stone-700 hover:text-white border border-stone-700 rounded-xl transition-all cursor-pointer shadow-xs"
                >
                  <Share2 className="w-3.5 h-3.5 text-amber-400" />
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
                      className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-stone-950 bg-amber-400 hover:bg-amber-300 rounded-xl transition-all cursor-pointer shadow-md"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      <span>Chỉnh sửa chuyên đề</span>
                    </button>
                  )}
                  <button
                    onClick={() => setSelectedGallery(null)}
                    className="px-6 py-2 text-xs font-bold text-white bg-stone-800 hover:bg-stone-700 rounded-xl shadow-xs transition-colors cursor-pointer border border-stone-700"
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
                    placeholder="/images/tuong-phat.jpg"
                    className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1.5">
                    Liên kết nguồn tham khảo (baotanglichsu.vn)
                  </label>
                  <input
                    type="url"
                    value={formData.sourceUrl}
                    onChange={(e) => setFormData({ ...formData, sourceUrl: e.target.value })}
                    placeholder="https://baotanglichsu.vn/vi/Articles/..."
                    className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                  />
                </div>
              </div>

              {/* Short Description */}
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1.5">
                  Tóm tắt ngắn <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Tóm tắt nội dung chính hiển thị trên thẻ ngoài danh sách..."
                  className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold resize-none"
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
              </div>

              {/* Detailed Content */}
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1.5">
                  Bài viết chi tiết / Ý nghĩa lịch sử
                </label>
                <textarea
                  rows={4}
                  value={formData.detailedContent}
                  onChange={(e) => setFormData({ ...formData, detailedContent: e.target.value })}
                  placeholder="Nội dung chi tiết về bối cảnh lịch sử, giá trị di sản và công nghệ trình diễn..."
                  className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold resize-none"
                />
              </div>

              {/* Highlight Artifacts Builder */}
              <div className="pt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-museum-brown flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-museum-gold" />
                    <span>Danh sách hiện vật đặc biệt (Highlight Artifacts)</span>
                  </label>
                  <button
                    type="button"
                    onClick={addArtifactRow}
                    className="text-xs font-bold text-museum-gold hover:text-museum-brown flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Thêm hiện vật</span>
                  </button>
                </div>

                <div className="space-y-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-200 max-h-64 overflow-y-auto">
                  {formData.highlightArtifacts.map((art, idx) => (
                    <div key={idx} className="bg-white p-3.5 rounded-xl border border-gray-200 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-museum-brown flex items-center gap-1">
                          <span className="w-4 h-4 rounded-full bg-museum-gold text-white text-[9px] flex items-center justify-center">
                            {idx + 1}
                          </span>
                          Hiện vật #{idx + 1}
                        </span>
                        {formData.highlightArtifacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArtifactRow(idx)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold cursor-pointer"
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
                          placeholder="Tên hiện vật (Ví dụ: Tượng Phật A Di Đà chùa Phật Tích)"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-museum-gold"
                        />
                        <input
                          type="text"
                          value={art.period || ''}
                          onChange={(e) => handleArtifactFieldChange(idx, 'period', e.target.value)}
                          placeholder="Niên đại (Ví dụ: Thời Lý, Thế kỷ 11)"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-museum-gold"
                        />
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        <input
                          type="text"
                          value={art.image || ''}
                          onChange={(e) => handleArtifactFieldChange(idx, 'image', e.target.value)}
                          placeholder="Link ảnh hiện vật (/images/...)"
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-museum-gold sm:col-span-1"
                        />
                        <input
                          type="text"
                          value={art.description}
                          onChange={(e) => handleArtifactFieldChange(idx, 'description', e.target.value)}
                          placeholder="Mô tả hiện vật, xuất xứ và giá trị nghệ thuật..."
                          className="w-full px-3 py-1.5 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-museum-gold sm:col-span-2"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs font-bold text-white bg-museum-brown hover:bg-museum-brown-dk rounded-xl shadow-md transition-colors cursor-pointer"
                >
                  {editingItem ? 'Lưu thay đổi' : 'Tạo chuyên đề'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 6. Delete Confirm Dialog */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-gray-100 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center">
              <h4 className="font-extrabold text-base text-museum-brown">
                Xác nhận xóa trưng bày chuyên đề
              </h4>
              <p className="text-xs text-gray-500 mt-2">
                Bạn có chắc muốn xóa chuyên đề <strong className="text-gray-800">"{deleteTarget.name}"</strong>?
                Hành động này sẽ xóa dữ liệu trên hệ thống.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-5 py-2.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                onClick={async () => {
                  await deleteGallery(deleteTarget.id);
                  setDeleteTarget(null);
                }}
                className="px-5 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-md transition-colors cursor-pointer"
              >
                Xác nhận xóa
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. Fullscreen Image Lightbox Preview Modal */}
      {previewImage && (
        <div
          onClick={() => setPreviewImage(null)}
          className="fixed inset-0 z-60 flex items-center justify-center p-2 sm:p-5 md:p-8 bg-black/92 backdrop-blur-md animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-6xl w-full bg-stone-950 rounded-3xl overflow-hidden shadow-2xl border border-amber-500/20 flex flex-col max-h-[96vh] cursor-default"
          >
            {/* Top Close Button */}
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-10 h-10 rounded-full bg-black/75 hover:bg-red-950 hover:text-red-400 text-white flex items-center justify-center transition-all z-20 cursor-pointer shadow-lg border border-white/20"
            >
              <X className="w-5 h-5" />
            </button>

            {/* High-res Image display */}
            <div className="flex-1 flex items-center justify-center bg-black/60 min-h-[360px] sm:min-h-[480px] p-3 sm:p-6 overflow-hidden">
              <img
                src={previewImage.src}
                alt={previewImage.title || 'Hiện vật'}
                className="max-h-[72vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                onError={(e) => {
                  e.target.src = '/images/museum-hero.jpg';
                }}
              />
            </div>

            {/* Bottom Info Bar */}
            <div className="p-5 sm:p-6 bg-stone-900/95 border-t border-stone-800 text-white space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-extrabold text-base sm:text-xl text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                  <span>{previewImage.title || 'Hình ảnh tư liệu'}</span>
                </h4>
                {previewImage.period && (
                  <span className="px-3 py-1 bg-amber-400/20 text-amber-200 border border-amber-400/30 text-xs font-semibold rounded-full shrink-0">
                    {previewImage.period}
                  </span>
                )}
              </div>

              {previewImage.description && (
                <p className="text-xs sm:text-sm text-stone-300 leading-relaxed text-justify">
                  {previewImage.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
