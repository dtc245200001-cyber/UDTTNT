import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Archive, Plus, Pencil, Trash2, X, AlertTriangle,
  CalendarDays, MapPin, Users, ImageIcon, Search, Clock, CheckCircle2, Landmark, LayoutGrid
} from 'lucide-react';
import { Breadcrumb } from '@/components/common/Breadcrumb';
import { ImageUploadField } from '@/components/common/ImageUploadField';

const EMPTY_EXHIBITION = {
  name: '', status: 'Sắp diễn ra', startDate: '', endDate: '',
  location: '', description: '', image: '',
};

const StatusBadge = ({ status }) => {
  if (status === 'Đang diễn ra') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-[11px] font-bold text-emerald-600 shadow-sm">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
        Đang diễn ra
      </span>
    );
  }
  if (status === 'Sắp diễn ra') {
    return (
      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-[11px] font-bold text-amber-600 shadow-sm">
        <Clock className="w-3 h-3 text-amber-500" />
        Sắp diễn ra
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white rounded-full text-[11px] font-bold text-gray-500 shadow-sm">
      <CheckCircle2 className="w-3 h-3 text-gray-400" />
      Đã kết thúc
    </span>
  );
};

export const Exhibitions = () => {
  const { exhibitions, addExhibition, updateExhibition, deleteExhibition, currentUser } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_EXHIBITION);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const openAdd = () => { setEditingItem(null); setFormData(EMPTY_EXHIBITION); setErrors({}); setIsFormOpen(true); };
  const openEdit = (item) => { setEditingItem(item); setFormData({ ...item }); setErrors({}); setIsFormOpen(true); };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Vui lòng nhập tên triển lãm.';
    if (!formData.startDate) errs.startDate = 'Vui lòng chọn ngày bắt đầu.';
    if (!formData.endDate) errs.endDate = 'Vui lòng chọn ngày kết thúc.';
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate)
      errs.endDate = 'Ngày kết thúc phải sau ngày bắt đầu.';
    if (!formData.location.trim()) errs.location = 'Vui lòng nhập địa điểm.';
    if (!formData.image || !formData.image.trim())
      errs.image = 'Vui lòng chọn hình ảnh triển lãm từ máy tính (bắt buộc).';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    editingItem ? updateExhibition(editingItem.id, formData) : addExhibition(formData);
    setIsFormOpen(false);
  };

  const confirmDelete = () => { if (deleteTarget) { deleteExhibition(deleteTarget.id); setDeleteTarget(null); } };

  const filterTabs = [
    { key: 'all', label: 'Tất cả', count: exhibitions.length },
    { key: 'Đang diễn ra', label: 'Đang diễn ra', count: exhibitions.filter(e => e.status === 'Đang diễn ra').length },
    { key: 'Sắp diễn ra', label: 'Sắp diễn ra', count: exhibitions.filter(e => e.status === 'Sắp diễn ra').length },
    { key: 'Đã kết thúc', label: 'Đã kết thúc', count: exhibitions.filter(e => e.status === 'Đã kết thúc').length },
  ];

  const filtered = exhibitions.filter(e => {
    const matchFilter = activeFilter === 'all' || e.status === activeFilter;
    if (!searchQuery.trim()) return matchFilter;
    
    const searchLower = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const nameLower = e.name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return matchFilter && nameLower.includes(searchLower);
  });

  const inputCls = (err) => `w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold transition-all ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-museum-gold'}`;

  return (
    <div className="min-h-screen bg-[#FAF6F0] font-sans pb-12">

      {/* ── Hero Banner: Chiều cao chuẩn 220-240px, nền màu nâu di sản, ảnh trống đồng ── */}
      <div className="relative overflow-hidden min-h-[220px] md:h-[240px] mb-8 bg-museum-brown flex items-center select-none">
        <div className="absolute inset-0 bg-[url('/images/trong-dong.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#2a170b] via-[#3d1f0d]/85 to-transparent" />
        
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-0 flex flex-col justify-center">
          <div className="max-w-full md:max-w-[60%] relative z-10">
            {/* Breadcrumb: TRANG CHỦ / TRIỂN LÃM */}
            <div className="relative z-10">
              <Breadcrumb
                items={[
                  { label: 'TRANG CHỦ', path: '/' },
                  { label: 'TRIỂN LÃM' },
                ]}
                variant="dark"
              />
            </div>

            {/* Title: Serif bold, large, white */}
            <h1 
              className="typo-page-title text-white tracking-wide leading-tight uppercase relative z-10"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,.45)' }}
            >
              TRIỂN LÃM CHUYÊN ĐỀ
            </h1>

            {/* Description */}
            <p className="typo-body text-[#F5EFE0]/80 line-clamp-2 mt-2 max-w-xl relative z-10">
              Khám phá những giá trị văn hóa, lịch sử đặc sắc qua các triển lãm được tổ chức định kỳ tại Bảo tàng Quốc gia Việt Nam.
            </p>

            {/* Short gold divider bar */}
            <div className="w-14 h-[2px] bg-[#D4A359] mt-3 rounded-full relative z-10" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-8">

        {/* ── Filter Tabs & Search Bar ── */}
        <div className="bg-white px-4 sm:px-5 py-3 rounded-2xl md:rounded-full border border-stone-200/70 shadow-[0_4px_20px_rgba(0,0,0,0.04)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
          {/* Status Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 [&::-webkit-scrollbar]:hidden scroll-smooth flex-1 min-w-0">
            {filterTabs.map((tab) => {
              let iconElement = null;
              if (tab.key === 'all') iconElement = <LayoutGrid className="w-3.5 h-3.5 shrink-0" />;
              else if (tab.key === 'Đang diễn ra') iconElement = <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block shrink-0" />;
              else if (tab.key === 'Sắp diễn ra') iconElement = <Clock className="w-3.5 h-3.5 shrink-0" />;
              else if (tab.key === 'Đã kết thúc') iconElement = <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />;

              const isActive = activeFilter === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveFilter(tab.key)}
                  className={`relative h-9 sm:h-10 px-3.5 sm:px-4 rounded-full typo-btn text-xs sm:text-[13px] tracking-normal transition-all duration-200 shrink-0 cursor-pointer flex items-center justify-center gap-1.5 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A1E]/40 ${
                    isActive
                      ? 'bg-[#8B5A1E] text-white shadow-xs font-bold'
                      : 'bg-[#F4EFEA] hover:bg-[#EAE2D8] text-[#5C4535] font-semibold'
                  }`}
                >
                  {iconElement && (
                    <span className={isActive ? 'text-amber-200 flex items-center' : 'text-stone-400 flex items-center'}>
                      {iconElement}
                    </span>
                  )}
                  <span>{tab.label}</span>
                  <span className={`px-2 py-0.5 text-[11px] rounded-full font-bold ml-1.5 shrink-0 inline-flex items-center justify-center leading-none ${
                    isActive ? 'bg-[#B8860B] text-white' : 'bg-stone-200/80 text-stone-600'
                  }`}>
                    {tab.count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Search & Actions */}
          <div className="flex items-center gap-2.5 w-full md:w-auto shrink-0">
            {currentUser?.role === 'admin' && (
              <button
                onClick={openAdd}
                className="btn-primary inline-flex items-center justify-center gap-1.5 h-11 px-5 typo-btn rounded-full shadow-sm transition-all whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tạo triển lãm mới</span>
              </button>
            )}
            <div className="relative flex-1 md:w-72">
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input 
                type="text" 
                placeholder="Tìm kiếm triển lãm..." 
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="search-input w-full pl-10 pr-9 text-xs sm:text-sm placeholder:text-stone-400"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="w-5 h-5 flex items-center justify-center absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer transition-colors"
                  title="Xóa tìm kiếm"
                >
                  ✕
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ── Cards Grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-[20px] border border-stone-100">
            <Archive className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">Không tìm thấy triển lãm nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => (
              <div key={item.id} className="group bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-lg hover:-translate-y-1 border border-stone-200/80 transition-all duration-300 flex flex-col">
                <div className="relative aspect-[16/9] overflow-hidden bg-museum-cream">
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-museum-cream to-amber-100 flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-museum-gold/40" />
                    </div>
                  )}
                  
                  <div className="absolute top-3 left-3 z-10">
                    <StatusBadge status={item.status} />
                  </div>
                  
                  {currentUser?.role === 'admin' && (
                    <div className="absolute top-3 right-3 flex gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10">
                      <button onClick={() => openEdit(item)} className="w-8 h-8 bg-white/95 backdrop-blur rounded-lg flex items-center justify-center text-museum-brown hover:bg-museum-cream shadow-xs cursor-pointer" title="Sửa"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(item)} className="w-8 h-8 bg-white/95 backdrop-blur rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 shadow-xs cursor-pointer" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                  )}
                </div>
                
                <div className="p-5 flex flex-col flex-1 justify-between gap-3.5">
                  <div>
                    <h3 className="typo-card-title text-museum-brown group-hover:text-museum-gold transition-colors min-h-[2.7em]">
                      {item.name}
                    </h3>
                    <p className="typo-body text-xs text-stone-500 leading-relaxed line-clamp-2 mt-1.5">
                      {item.description}
                    </p>
                  </div>

                  <div className="space-y-2 text-xs text-stone-600 mt-auto">
                    <div className="flex items-center gap-2">
                      <CalendarDays className="w-3.5 h-3.5 text-museum-gold shrink-0" />
                      <span className="font-medium">{item.startDate} → {item.endDate}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <MapPin className="w-3.5 h-3.5 text-museum-gold shrink-0" />
                      <span className="truncate">{item.location}</span>
                    </div>
                    
                    <div className="flex items-center justify-between pt-3 border-t border-stone-100 mt-1">
                      <span className="flex items-center gap-1.5 font-medium text-stone-600">
                        <Archive className="w-3.5 h-3.5 text-museum-gold" />
                        {item.artifactsCount || 0} hiện vật
                      </span>
                      <span className="flex items-center gap-1.5 font-medium text-stone-600">
                        <Users className="w-3.5 h-3.5 text-museum-gold" />
                        {(item.visitorsCount || 0).toLocaleString()} khách
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Form Modal ── */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-museum-brown">{editingItem ? 'Chỉnh sửa triển lãm' : 'Tạo triển lãm mới'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-museum-brown mb-1">Tên triển lãm *</label>
                  <input type="text" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} placeholder="VD: Tinh hoa văn hóa Việt" className={inputCls(errors.name)} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1">Ngày bắt đầu *</label>
                  <input type="date" value={formData.startDate} onChange={e => setFormData({ ...formData, startDate: e.target.value })} className={inputCls(errors.startDate)} />
                  {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1">Ngày kết thúc *</label>
                  <input type="date" value={formData.endDate} onChange={e => setFormData({ ...formData, endDate: e.target.value })} className={inputCls(errors.endDate)} />
                  {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1">Địa điểm *</label>
                  <input type="text" value={formData.location} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder="VD: Phòng trưng bày A" className={inputCls(errors.location)} />
                  {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1">Trạng thái</label>
                  <select value={formData.status} onChange={e => setFormData({ ...formData, status: e.target.value })} className={inputCls(false)}>
                    <option>Sắp diễn ra</option><option>Đang diễn ra</option><option>Đã kết thúc</option>
                  </select>
                </div>
                <div className="md:col-span-2">
                  <ImageUploadField
                    value={formData.image}
                    onChange={(val) => {
                      setFormData((prev) => ({ ...prev, image: val }));
                      if (errors.image) setErrors((prev) => ({ ...prev, image: null }));
                    }}
                    error={errors.image}
                    label="Hình ảnh triển lãm"
                    required={true}
                    description="Ảnh này sẽ hiển thị làm ảnh bìa chính của triển lãm trên toàn bộ hệ thống."
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-museum-brown mb-1">Mô tả</label>
                  <textarea rows={3} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder="Mô tả nội dung triển lãm..." className={inputCls(false)} />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-museum-brown text-white font-bold text-xs rounded-xl hover:bg-museum-brown-dk shadow-sm">{editingItem ? 'Lưu thay đổi' : 'Tạo triển lãm'}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm ── */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center"><AlertTriangle className="w-7 h-7 text-red-600" /></div>
              <h3 className="font-extrabold text-lg text-museum-brown">Xác nhận xóa</h3>
              <p className="text-sm text-gray-600">Bạn có chắc muốn xóa triển lãm <strong>"{deleteTarget.name}"</strong>?</p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200">Hủy</button>
              <button onClick={confirmDelete} className="flex-1 py-2.5 bg-red-600 text-white font-bold text-sm rounded-xl hover:bg-red-700">Xóa</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
