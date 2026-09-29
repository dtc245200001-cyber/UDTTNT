import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Archive, Plus, Pencil, Trash2, X, AlertTriangle,
  CalendarDays, MapPin, Users, ImageIcon
} from 'lucide-react';

const EMPTY_EXHIBITION = {
  name: '', status: 'Sắp diễn ra', startDate: '', endDate: '',
  location: '', description: '', image: '/images/museum-hero.jpg',
};

export const Exhibitions = () => {
  const { exhibitions, addExhibition, updateExhibition, deleteExhibition } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState(EMPTY_EXHIBITION);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');

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

  const statusStyle = (s) => {
    if (s === 'Đang diễn ra') return { dot: 'bg-emerald-500 animate-pulse', badge: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
    if (s === 'Sắp diễn ra') return { dot: 'bg-amber-400', badge: 'bg-amber-50 text-amber-700 border-amber-200' };
    return { dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600 border-gray-200' };
  };

  const filterTabs = [
    { key: 'all', label: 'Tất cả', count: exhibitions.length },
    { key: 'Đang diễn ra', label: 'Đang diễn ra', count: exhibitions.filter(e => e.status === 'Đang diễn ra').length },
    { key: 'Sắp diễn ra', label: 'Sắp diễn ra', count: exhibitions.filter(e => e.status === 'Sắp diễn ra').length },
    { key: 'Đã kết thúc', label: 'Đã kết thúc', count: exhibitions.filter(e => e.status === 'Đã kết thúc').length },
  ];

  const filtered = activeFilter === 'all' ? exhibitions : exhibitions.filter(e => e.status === activeFilter);

  const inputCls = (err) => `w-full px-3.5 py-2.5 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold transition-all ${err ? 'border-red-400 bg-red-50' : 'border-gray-200 focus:border-museum-gold'}`;

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans pb-12">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-museum-brown via-[#3d1f0d] to-[#1a0a04] mb-8">
        <div className="absolute inset-0 opacity-10 bg-[url('/images/museum-hero.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-museum-brown/95 to-museum-brown/50" />
        <div className="relative max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="text-xs text-amber-300/60 mb-2">Tổng quan / <span className="text-museum-gold font-bold">Triển lãm</span></p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-museum-gold/20 border border-museum-gold/40 flex items-center justify-center flex-none">
                <Archive className="w-5 h-5 text-museum-gold" />
              </div>
              TRIỂN LÃM CHUYÊN ĐỀ
            </h1>
            <p className="text-amber-200/60 text-sm mt-1.5">Không gian trưng bày đặc sắc của Bảo tàng Quốc gia Việt Nam</p>
          </div>
          <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-3 bg-museum-gold hover:bg-amber-500 text-white font-bold text-sm rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 flex-none">
            <Plus className="w-5 h-5" />
            + Tạo triển lãm mới
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#faf8f5] rounded-t-[2rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">

        {/* ── Filter Tabs ── */}
        <div className="flex gap-2 flex-wrap">
          {filterTabs.map(tab => (
            <button key={tab.key} onClick={() => setActiveFilter(tab.key)}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeFilter === tab.key ? 'bg-museum-brown text-white shadow-md' : 'bg-white text-stone-600 border border-stone-200 hover:border-museum-gold/50 hover:text-museum-brown'
              }`}>
              {tab.label}
              <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${activeFilter === tab.key ? 'bg-museum-gold text-white' : 'bg-stone-100 text-stone-500'}`}>{tab.count}</span>
            </button>
          ))}
        </div>

        {/* ── Cards Grid ── */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-100">
            <Archive className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">Chưa có triển lãm nào trong mục này.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filtered.map((item) => {
              const ss = statusStyle(item.status);
              return (
                <div key={item.id} className="group bg-white rounded-3xl overflow-hidden shadow-sm border border-stone-100 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  <div className="relative h-48 overflow-hidden">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-museum-cream to-amber-100 flex items-center justify-center">
                        <ImageIcon className="w-12 h-12 text-museum-gold/40" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                    <div className="absolute top-3 left-3">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold border ${ss.badge}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${ss.dot}`} />
                        {item.status}
                      </span>
                    </div>
                    <div className="absolute top-3 right-3 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                      <button onClick={() => openEdit(item)} className="w-7 h-7 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-museum-brown hover:bg-museum-cream shadow-xs" title="Sửa"><Pencil className="w-3.5 h-3.5" /></button>
                      <button onClick={() => setDeleteTarget(item)} className="w-7 h-7 bg-white/90 backdrop-blur rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 shadow-xs" title="Xóa"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    <div className="absolute bottom-3 left-3 right-3">
                      <h3 className="text-white font-extrabold text-base leading-snug drop-shadow-md line-clamp-2">{item.name}</h3>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1 gap-3">
                    <p className="text-xs text-stone-500 leading-relaxed line-clamp-2 flex-1">{item.description}</p>
                    <div className="space-y-1.5 text-xs text-stone-500">
                      <div className="flex items-center gap-2"><CalendarDays className="w-3.5 h-3.5 text-museum-gold shrink-0" /><span className="font-medium">{item.startDate} → {item.endDate}</span></div>
                      <div className="flex items-center gap-2"><MapPin className="w-3.5 h-3.5 text-museum-brown shrink-0" /><span>{item.location}</span></div>
                      <div className="flex items-center justify-between pt-1 border-t border-stone-100 mt-1">
                        <span className="flex items-center gap-1"><Archive className="w-3.5 h-3.5 text-museum-gold" />{item.artifactsCount || 0} hiện vật</span>
                        <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-emerald-600" />{(item.visitorsCount || 0).toLocaleString()} khách</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
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
                  <label className="block text-xs font-bold text-museum-brown mb-1">URL Ảnh bìa</label>
                  <input type="text" value={formData.image} onChange={e => setFormData({ ...formData, image: e.target.value })} placeholder="/images/museum-hero.jpg" className={inputCls(false)} />
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
