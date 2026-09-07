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
  Globe,
  ZoomIn,
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

      {/* 4. Rich Thematic Exhibition Detail Modal */}
      {selectedGallery && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/75 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[92vh]">
            {/* Modal Top Header Image & Gallery */}
            <div className="relative h-64 sm:h-80 bg-stone-900 shrink-0 group">
              <img
                src={
                  (selectedGallery.galleryImages && selectedGallery.galleryImages[activeImageIndex]) ||
                  selectedGallery.image ||
                  '/images/museum-hero.jpg'
                }
                alt={selectedGallery.name}
                className="w-full h-full object-cover transition-all duration-300 cursor-pointer"
                onClick={() =>
                  setPreviewImage({
                    src:
                      (selectedGallery.galleryImages && selectedGallery.galleryImages[activeImageIndex]) ||
                      selectedGallery.image ||
                      '/images/museum-hero.jpg',
                    title: selectedGallery.name,
                    description: selectedGallery.description,
                  })
                }
                onError={(e) => {
                  e.target.src = '/images/museum-hero.jpg';
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-black/20 pointer-events-none" />

              {/* Zoom In Hint on Hover */}
              <button
                onClick={() =>
                  setPreviewImage({
                    src:
                      (selectedGallery.galleryImages && selectedGallery.galleryImages[activeImageIndex]) ||
                      selectedGallery.image ||
                      '/images/museum-hero.jpg',
                    title: selectedGallery.name,
                    description: selectedGallery.description,
                  })
                }
                className="absolute top-4 right-16 px-3 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer shadow-md backdrop-blur-xs opacity-90 hover:opacity-100"
                title="Phóng to ảnh"
              >
                <ZoomIn className="w-4 h-4 text-museum-gold" />
                <span className="hidden sm:inline">Phóng to ảnh</span>
              </button>

              {/* Close Button */}
              <button
                onClick={() => setSelectedGallery(null)}
                className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center transition-all z-10 cursor-pointer shadow-md"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Status & Code */}
              <div className="absolute top-4 left-4 flex items-center gap-2">
                {getStatusBadge(selectedGallery.status)}
                <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-amber-200 border border-amber-400/30 text-xs font-mono font-bold rounded-lg shadow-sm">
                  {selectedGallery.id}
                </span>
              </div>

              {/* Image Thumbnails Carousel (if multiple images) */}
              {selectedGallery.galleryImages && selectedGallery.galleryImages.length > 1 && (
                <div className="absolute bottom-4 right-4 flex items-center gap-2 z-10">
                  {selectedGallery.galleryImages.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-12 h-9 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                        activeImageIndex === idx ? 'border-museum-gold scale-105 shadow-md ring-2 ring-museum-gold/50' : 'border-white/60 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={img} alt="thumb" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Title on Banner */}
              <div className="absolute bottom-4 left-4 right-20 sm:right-56 text-white space-y-1">
                <h3 className="text-lg sm:text-2xl font-black leading-tight drop-shadow-md">
                  {selectedGallery.name}
                </h3>
                <div className="flex flex-wrap items-center gap-3 text-xs text-white/90">
                  <div className="flex items-center gap-1.5">
                    <CalendarDays className="w-4 h-4 text-museum-gold" />
                    <span>{formatPeriod(selectedGallery.startDate, selectedGallery.endDate)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 text-gray-700">
              {/* Location Bar */}
              <div className="p-4 bg-museum-ivory/80 rounded-2xl border border-museum-gold/30 flex items-start sm:items-center gap-2.5 text-xs font-semibold text-museum-brown">
                <MapPin className="w-4 h-4 text-museum-gold shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <span className="font-bold text-gray-900 mr-1.5">Địa điểm trưng bày:</span>
                  <span>{selectedGallery.location || 'Bảo tàng Lịch sử Quốc gia – Số 1 Tràng Tiền / 216 Trần Quang Khải, Hoàn Kiếm, Hà Nội'}</span>
                </div>
              </div>

              {/* Detailed Narrative Section */}
              <div>
                <h4 className="text-sm font-extrabold text-museum-brown uppercase tracking-wider mb-2.5 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-museum-gold" />
                  <span>Bối cảnh & Ý nghĩa lịch sử</span>
                </h4>
                <div className="text-xs sm:text-sm text-gray-700 leading-relaxed space-y-3 text-justify">
                  <p className="font-medium text-gray-800 bg-museum-cream/30 p-3.5 rounded-xl border-l-4 border-museum-gold">
                    {selectedGallery.description}
                  </p>
                  {selectedGallery.detailedContent && selectedGallery.detailedContent !== selectedGallery.description && (
                    <p className="whitespace-pre-line">
                      {selectedGallery.detailedContent}
                    </p>
                  )}
                </div>
              </div>

              {/* Highlight Artifacts Showcase Cards */}
              {selectedGallery.highlightArtifacts && selectedGallery.highlightArtifacts.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-sm font-extrabold text-museum-brown uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-museum-gold" />
                    <span>Bộ sưu tập hiện vật đặc biệt trong chuyên đề ({selectedGallery.highlightArtifacts.length})</span>
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedGallery.highlightArtifacts.map((art, idx) => (
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
                        className="bg-white p-4 rounded-2xl border border-gray-200 hover:border-museum-gold/50 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 cursor-pointer group/art"
                      >
                        <div className="flex items-start gap-3">
                          {art.image ? (
                            <div className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-200 shrink-0 shadow-2xs">
                              <img
                                src={art.image}
                                alt={art.name}
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
                              <span className="text-[10px] font-bold text-museum-gold uppercase">Hiện vật #{idx + 1}</span>
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
            </div>

            {/* Modal Bottom Footer */}
            <div className="p-4 sm:p-5 bg-gray-50 border-t border-gray-200 flex items-center justify-between">
              <button
                onClick={(e) => handleShare(selectedGallery, e)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-xl transition-all cursor-pointer shadow-2xs"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Chia sẻ</span>
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
      )}

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
          className="fixed inset-0 z-60 flex items-center justify-center p-3 sm:p-6 bg-black/90 backdrop-blur-md animate-fadeIn cursor-pointer"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-4xl w-full bg-stone-900 rounded-3xl overflow-hidden shadow-2xl border border-white/10 flex flex-col max-h-[92vh] cursor-default"
          >
            {/* Top Close Button */}
            <button
              onClick={() => setPreviewImage(null)}
              className="absolute top-4 right-4 w-9 h-9 rounded-full bg-black/70 hover:bg-black text-white flex items-center justify-center transition-all z-20 cursor-pointer shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>

            {/* High-res Image display */}
            <div className="flex-1 flex items-center justify-center bg-black/40 min-h-[300px] sm:min-h-[420px] p-2 sm:p-4 overflow-hidden">
              <img
                src={previewImage.src}
                alt={previewImage.title || 'Hiện vật'}
                className="max-h-[60vh] w-auto max-w-full object-contain rounded-xl shadow-2xl"
                onError={(e) => {
                  e.target.src = '/images/museum-hero.jpg';
                }}
              />
            </div>

            {/* Bottom Info Bar */}
            <div className="p-5 sm:p-6 bg-stone-900/95 border-t border-white/10 text-white space-y-2">
              <div className="flex items-center justify-between gap-3">
                <h4 className="font-extrabold text-base sm:text-lg text-amber-300 flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-museum-gold shrink-0" />
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
