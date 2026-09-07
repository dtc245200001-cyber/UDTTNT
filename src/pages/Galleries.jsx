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
  Layers,
  ChevronRight,
  Clock,
  CheckCircle2,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { formatDate } from '@/utils/formatters';

const EMPTY_GALLERY = {
  name: '',
  description: '',
  status: 'Đang diễn ra',
  startDate: '',
  endDate: '',
  image: '/images/museum-hero.jpg',
  highlightArtifacts: [{ name: '', description: '' }],
};

export const Galleries = () => {
  const { galleries, addGallery, updateGallery, deleteGallery, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'Sắp diễn ra' | 'Đang diễn ra' | 'Đã diễn ra'
  const [searchTerm, setSearchTerm] = useState('');

  // Form Modal State
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
      (g.highlightArtifacts || []).some(
        (a) =>
          a.name?.toLowerCase().includes(term) ||
          a.description?.toLowerCase().includes(term)
      );
    return matchesTab && matchesSearch;
  });

  // Modal handlers
  const openAdd = () => {
    setEditingItem(null);
    setFormData(EMPTY_GALLERY);
    setErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      status: item.status || 'Đang diễn ra',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      image: item.image || '/images/museum-hero.jpg',
      highlightArtifacts:
        item.highlightArtifacts && item.highlightArtifacts.length > 0
          ? item.highlightArtifacts.map((a) => ({ ...a }))
          : [{ name: '', description: '' }],
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

    // Filter out empty highlight artifacts
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
      highlightArtifacts: [...formData.highlightArtifacts, { name: '', description: '' }],
    });
  };

  const removeArtifactRow = (index) => {
    const list = formData.highlightArtifacts.filter((_, idx) => idx !== index);
    setFormData({
      ...formData,
      highlightArtifacts: list.length > 0 ? list : [{ name: '', description: '' }],
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

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Trưng bày chuyên đề</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight flex items-center gap-2.5">
            <BookOpen className="w-7 h-7 text-museum-gold" />
            <span>TRƯNG BÀY CHUYÊN ĐỀ LỊCH SỬ</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Không gian trưng bày tài liệu, hiện vật theo từng chuyên đề lịch sử và cách mạng Việt Nam.
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
            placeholder="Tìm theo tên, mô tả, hiện vật..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
          />
        </div>
      </div>

      {/* 3. Thematic Galleries Cards List */}
      {filteredGalleries.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-gray-100 shadow-xs">
          <div className="w-16 h-16 rounded-full bg-museum-cream text-museum-gold mx-auto flex items-center justify-center mb-3">
            <BookOpen className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-museum-brown">Không tìm thấy chuyên đề trưng bày</h3>
          <p className="text-xs text-gray-500 mt-1">
            Không có trưng bày chuyên đề nào phù hợp với bộ lọc hiện tại.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredGalleries.map((g) => {
            const hasArtifacts = g.highlightArtifacts && g.highlightArtifacts.length > 0;
            return (
              <div
                key={g.id}
                className="bg-white rounded-3xl overflow-hidden shadow-xs hover:shadow-md border border-gray-100 transition-all duration-300 flex flex-col group"
              >
                {/* Image Banner Header */}
                <div className="relative h-56 sm:h-64 bg-stone-900 overflow-hidden">
                  <img
                    src={g.image || '/images/museum-hero.jpg'}
                    alt={g.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 opacity-90"
                    onError={(e) => {
                      e.target.src = '/images/museum-hero.jpg';
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                  {/* Top Bar on Image: Status Badge & ID */}
                  <div className="absolute top-4 left-4 right-4 flex items-center justify-between gap-2">
                    {getStatusBadge(g.status)}
                    <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-amber-200 border border-amber-400/30 text-[11px] font-mono font-bold rounded-lg">
                      {g.id}
                    </span>
                  </div>

                  {/* Date Period Tag at Bottom of Banner */}
                  <div className="absolute bottom-4 left-4 right-4 flex items-center gap-2 text-white/95 text-xs font-semibold">
                    <CalendarDays className="w-4 h-4 text-museum-gold shrink-0" />
                    <span className="truncate">{formatPeriod(g.startDate, g.endDate)}</span>
                  </div>
                </div>

                {/* Card Content Body */}
                <div className="p-6 flex-1 flex flex-col justify-between space-y-5">
                  <div>
                    {/* Title */}
                    <h3 className="font-extrabold text-lg sm:text-xl text-museum-brown leading-snug group-hover:text-museum-gold transition-colors">
                      {g.name}
                    </h3>

                    {/* Description */}
                    <p className="text-xs sm:text-sm text-gray-600 font-normal mt-2.5 leading-relaxed text-justify">
                      {g.description}
                    </p>

                    {/* Highlight Artifacts Section */}
                    {hasArtifacts && (
                      <div className="mt-5 pt-4 border-t border-gray-100">
                        <div className="flex items-center gap-2 text-xs font-bold text-museum-brown mb-3">
                          <Sparkles className="w-4 h-4 text-museum-gold shrink-0" />
                          <span>HIỆN VẬT TIÊU BIỂU TRONG CHUYÊN ĐỀ ({g.highlightArtifacts.length})</span>
                        </div>

                        <div className="space-y-2.5 bg-museum-ivory/60 p-3.5 rounded-2xl border border-museum-gold/20">
                          {g.highlightArtifacts.map((art, idx) => (
                            <div key={idx} className="text-xs flex items-start gap-2.5">
                              <span className="w-5 h-5 rounded-full bg-museum-gold/20 text-museum-brown font-extrabold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {idx + 1}
                              </span>
                              <div className="flex-1 leading-snug">
                                <span className="font-bold text-museum-brown">{art.name}</span>
                                {art.description && (
                                  <p className="text-gray-500 text-[11.5px] mt-0.5 italic">
                                    {art.description}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Admin Actions or Details */}
                  {isAdmin && (
                    <div className="pt-4 border-t border-gray-100 flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEdit(g)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-museum-brown bg-museum-cream hover:bg-museum-gold hover:text-white rounded-xl transition-all cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                        <span>Sửa chuyên đề</span>
                      </button>
                      <button
                        onClick={() => setDeleteTarget(g)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-red-600 bg-red-50 hover:bg-red-600 hover:text-white rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Xóa</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 4. Form Modal (Thêm / Sửa Trưng bày chuyên đề) */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col max-h-[90vh]">
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
                className="p-1.5 text-gray-400 hover:text-gray-700 rounded-xl hover:bg-gray-100 transition-colors"
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
                  placeholder="Ví dụ: Mùa Xuân – Khởi nguồn thắng lợi"
                  className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>

              {/* Status & Image */}
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
                    Đường dẫn ảnh bìa
                  </label>
                  <input
                    type="text"
                    value={formData.image}
                    onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="/images/museum-hero.jpg"
                    className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
                  />
                </div>
              </div>

              {/* Start & End Date */}
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

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1.5">
                  Mô tả chuyên đề <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả nội dung, ý nghĩa lịch sử và thông điệp của chuyên đề..."
                  className="w-full px-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold resize-none"
                />
                {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
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

                <div className="space-y-3 bg-gray-50 p-3.5 rounded-2xl border border-gray-200 max-h-56 overflow-y-auto">
                  {formData.highlightArtifacts.map((art, idx) => (
                    <div key={idx} className="bg-white p-3 rounded-xl border border-gray-200 space-y-2 relative">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-museum-brown">
                          Hiện vật #{idx + 1}
                        </span>
                        {formData.highlightArtifacts.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeArtifactRow(idx)}
                            className="text-red-500 hover:text-red-700 text-xs font-semibold"
                          >
                            Xóa
                          </button>
                        )}
                      </div>
                      <input
                        type="text"
                        value={art.name}
                        onChange={(e) => handleArtifactFieldChange(idx, 'name', e.target.value)}
                        placeholder="Tên hiện vật (ví dụ: Huy hiệu Bình dân học vụ)"
                        className="w-full px-3 py-1.5 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-museum-gold"
                      />
                      <input
                        type="text"
                        value={art.description}
                        onChange={(e) => handleArtifactFieldChange(idx, 'description', e.target.value)}
                        placeholder="Mô tả / nguồn gốc hiện vật (tùy chọn)"
                        className="w-full px-3 py-1.5 text-xs bg-gray-50 rounded-lg border border-gray-200 focus:outline-none focus:ring-1 focus:ring-museum-gold"
                      />
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

      {/* 5. Delete Confirm Dialog */}
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
    </div>
  );
};
