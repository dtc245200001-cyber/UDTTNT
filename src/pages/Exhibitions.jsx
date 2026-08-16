import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Archive, Plus, Pencil, Trash2, X, AlertTriangle,
  CalendarDays, MapPin, Users, ImageIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

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

  const openAdd = () => {
    setEditingItem(null);
    setFormData(EMPTY_EXHIBITION);
    setErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (item) => {
    setEditingItem(item);
    setFormData({ ...item });
    setErrors({});
    setIsFormOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Vui lòng nhập tên triển lãm.';
    if (!formData.startDate) errs.startDate = 'Vui lòng chọn ngày bắt đầu.';
    if (!formData.endDate) errs.endDate = 'Vui lòng chọn ngày kết thúc.';
    if (formData.startDate && formData.endDate && formData.startDate > formData.endDate) {
      errs.endDate = 'Ngày kết thúc phải sau ngày bắt đầu.';
    }
    if (!formData.location.trim()) errs.location = 'Vui lòng nhập địa điểm.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    if (editingItem) {
      updateExhibition(editingItem.id, formData);
    } else {
      addExhibition(formData);
    }
    setIsFormOpen(false);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteExhibition(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  const statusVariant = (s) => {
    if (s === 'Đang diễn ra') return 'emerald';
    if (s === 'Sắp diễn ra') return 'museum';
    return 'secondary';
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Triển lãm</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">QUẢN LÝ TRIỂN LÃM CHUYÊN ĐỀ</h2>
        </div>
        <button onClick={openAdd} className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors">
          <Plus className="w-5 h-5" />
          <span>+ Tạo triển lãm mới</span>
        </button>
      </div>

      {/* Status tabs summary */}
      <div className="flex gap-3 flex-wrap">
        {['Đang diễn ra', 'Sắp diễn ra', 'Đã kết thúc'].map((s) => {
          const count = exhibitions.filter((e) => e.status === s).length;
          return (
            <div key={s} className="bg-white rounded-xl px-4 py-2 shadow-xs border border-gray-100 text-xs font-bold text-museum-brown flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${s === 'Đang diễn ra' ? 'bg-emerald-500' : s === 'Sắp diễn ra' ? 'bg-museum-gold' : 'bg-gray-400'}`} />
              {s}: <span className="text-museum-gold">{count}</span>
            </div>
          );
        })}
      </div>

      {/* Exhibition Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {exhibitions.map((item) => (
          <div key={item.id} className="bg-white rounded-2xl overflow-hidden shadow-xs border border-gray-100 hover:shadow-md transition-all flex flex-col">
            <div className="relative h-40 overflow-hidden">
              <img src={item.image || '/images/museum-hero.jpg'} alt={item.name} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
              <div className="absolute bottom-3 left-3">
                <Badge variant={statusVariant(item.status)}>{item.status}</Badge>
              </div>
              <div className="absolute top-2 right-2 flex gap-1">
                <button onClick={() => openEdit(item)} className="w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center text-museum-brown hover:bg-museum-cream transition-colors shadow-xs" title="Sửa">
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => setDeleteTarget(item)} className="w-7 h-7 bg-white/90 rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 transition-colors shadow-xs" title="Xóa">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="p-4 flex flex-col flex-1 space-y-2">
              <h3 className="font-bold text-base text-museum-brown leading-snug">{item.name}</h3>
              <p className="text-xs text-gray-500 leading-relaxed flex-1 line-clamp-2">{item.description}</p>
              <div className="pt-2 border-t border-gray-100 space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <CalendarDays className="w-3.5 h-3.5 text-museum-gold shrink-0" />
                  <span>{item.startDate} → {item.endDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-museum-brown shrink-0" />
                  <span>{item.location}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1"><Archive className="w-3.5 h-3.5 text-museum-gold" />{item.artifactsCount || 0} hiện vật</span>
                  <span className="flex items-center gap-1"><Users className="w-3.5 h-3.5 text-emerald-600" />{(item.visitorsCount || 0).toLocaleString()} khách</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ===== EXHIBITION FORM MODAL ===== */}
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
                  <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="VD: Tinh hoa văn hóa Việt"
                    className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1">Ngày bắt đầu *</label>
                  <input type="date" value={formData.startDate} onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold ${errors.startDate ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                  {errors.startDate && <p className="text-xs text-red-500 mt-1">{errors.startDate}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1">Ngày kết thúc *</label>
                  <input type="date" value={formData.endDate} onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold ${errors.endDate ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                  {errors.endDate && <p className="text-xs text-red-500 mt-1">{errors.endDate}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1">Địa điểm *</label>
                  <input type="text" value={formData.location} onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="VD: Phòng trưng bày A"
                    className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold ${errors.location ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                  {errors.location && <p className="text-xs text-red-500 mt-1">{errors.location}</p>}
                </div>

                <div>
                  <label className="block text-xs font-bold text-museum-brown mb-1">Trạng thái</label>
                  <select value={formData.status} onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold">
                    <option>Sắp diễn ra</option>
                    <option>Đang diễn ra</option>
                    <option>Đã kết thúc</option>
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-museum-brown mb-1">URL Ảnh bìa</label>
                  <input type="text" value={formData.image} onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                    placeholder="/images/museum-hero.jpg"
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold" />
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-bold text-museum-brown mb-1">Mô tả triển lãm</label>
                  <textarea rows={3} value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Mô tả nội dung, chủ đề và ý nghĩa của triển lãm..."
                    className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-gray-100 pt-4">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-museum-brown text-white font-bold text-xs rounded-xl hover:bg-museum-brown-dk shadow-sm">
                  {editingItem ? 'Lưu thay đổi' : 'Tạo triển lãm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== DELETE CONFIRM ===== */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-14 h-14 rounded-2xl bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-7 h-7 text-red-600" />
              </div>
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
