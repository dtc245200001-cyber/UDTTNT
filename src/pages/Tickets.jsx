import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Ticket, Plus, TrendingUp, Pencil, Trash2, X, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';

const EMPTY_TICKET = { name: '', description: '', price: '', active: true };

export const Tickets = () => {
  const { tickets, ticketStats, bookedTickets, addTicketType, updateTicketType, deleteTicketType } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [formData, setFormData] = useState(EMPTY_TICKET);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  const openAdd = () => {
    setEditingTicket(null);
    setFormData(EMPTY_TICKET);
    setErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (t) => {
    setEditingTicket(t);
    setFormData({ name: t.name, description: t.description, price: String(t.price), active: t.active !== false });
    setErrors({});
    setIsFormOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Vui lòng nhập tên loại vé.';
    const priceNum = Number(formData.price);
    if (formData.price === '' || isNaN(priceNum) || priceNum < 0) errs.price = 'Giá vé phải là số >= 0.';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { ...formData, price: Number(formData.price) };
    if (editingTicket) {
      updateTicketType(editingTicket.id, payload);
    } else {
      addTicketType(payload);
    }
    setIsFormOpen(false);
  };

  const confirmDelete = () => {
    if (deleteTarget) {
      deleteTicketType(deleteTarget.id);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Vé tham quan</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">QUẢN LÝ VÉ THAM QUAN</h2>
        </div>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors cursor-pointer"
        >
          <Plus className="w-5 h-5" />
          <span>+ Thêm loại vé</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-4 border-l-museum-gold">
          <div className="text-xs font-bold text-gray-400 uppercase">Vé bán hôm nay</div>
          <div className="text-3xl font-extrabold text-museum-brown mt-1">{ticketStats.totalSoldToday} <span className="text-sm font-normal text-gray-500">vé</span></div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-4 border-l-emerald-500">
          <div className="text-xs font-bold text-gray-400 uppercase">Vé bán trong tháng</div>
          <div className="text-3xl font-extrabold text-museum-brown mt-1">{formatNumber(ticketStats.totalSoldMonth)} <span className="text-sm font-normal text-gray-500">vé</span></div>
          <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3.5 h-3.5" /><span>+{ticketStats.growthRate} so với tháng trước</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-4 border-l-museum-brown">
          <div className="text-xs font-bold text-gray-400 uppercase">Doanh thu vé tháng</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-museum-gold mt-1">{formatCurrency(ticketStats.revenueMonth)}</div>
        </div>
      </div>

      {/* Ticket Types List (CRUD) */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="p-4 bg-museum-ivory border-b border-gray-200 font-bold text-sm text-museum-brown flex items-center justify-between">
          <span>CẤU HÌNH CÁC LOẠI VÉ THAM QUAN</span>
          <span className="text-xs font-normal text-gray-500">Tổng: {tickets.length} loại vé</span>
        </div>
        <div className="divide-y divide-gray-100">
          {tickets.map((t) => (
            <div key={t.id} className="p-4 flex items-center justify-between hover:bg-museum-cream/30 transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-museum-cream flex items-center justify-center text-museum-gold">
                  <Ticket className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-sm text-museum-brown">{t.name}</h4>
                  <p className="text-xs text-gray-500">{t.description}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <div className="font-extrabold text-base text-museum-gold">{formatCurrency(t.price)}</div>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${t.active !== false ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400 bg-gray-100'}`}>
                    {t.active !== false ? 'Đang bán' : 'Tạm dừng'}
                  </span>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => openEdit(t)} className="p-1.5 text-gray-400 hover:text-museum-gold hover:bg-museum-cream rounded-lg transition-colors" title="Sửa">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button onClick={() => setDeleteTarget(t)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors" title="Xóa">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Booked Tickets List */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden space-y-2">
        <div className="p-4 bg-museum-ivory border-b border-gray-200 font-bold text-sm text-museum-brown flex items-center justify-between">
          <span>DANH SÁCH VÉ ĐẶT TRỰC TUYẾN</span>
          <span className="text-xs font-normal text-gray-500">Tổng cộng: {bookedTickets?.length || 0} vé</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="py-3 px-4">Mã vé</th>
                <th className="py-3 px-4">Họ tên</th>
                <th className="py-3 px-4">SĐT</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Loại vé</th>
                <th className="py-3 px-4">Ngày tham quan</th>
                <th className="py-3 px-4">Giá vé</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {(!bookedTickets || bookedTickets.length === 0) ? (
                <tr><td colSpan={8} className="text-center py-6 text-gray-400 font-medium">Chưa có lịch sử đặt vé trực tuyến nào.</td></tr>
              ) : (
                bookedTickets.map((b) => (
                  <tr key={b.id} className="hover:bg-museum-cream/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-museum-brown">{b.ticketCode}</td>
                    <td className="py-3 px-4 font-semibold">{b.name}</td>
                    <td className="py-3 px-4 text-gray-600">{b.phone}</td>
                    <td className="py-3 px-4 text-museum-gold font-medium">{b.email}</td>
                    <td className="py-3 px-4">{b.ticketType}</td>
                    <td className="py-3 px-4 font-medium">{b.visitDate}</td>
                    <td className="py-3 px-4 font-bold text-museum-brown">{formatCurrency(b.price * (b.quantity || 1))}</td>
                    <td className="py-3 px-4"><Badge variant="emerald">{b.status}</Badge></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== TICKET FORM MODAL ===== */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-museum-brown">{editingTicket ? 'Sửa loại vé' : 'Thêm loại vé mới'}</h3>
              <button onClick={() => setIsFormOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"><X className="w-5 h-5" /></button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Tên loại vé *</label>
                <input type="text" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="VD: Vé Người lớn"
                  className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold ${errors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Mô tả</label>
                <input type="text" value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="VD: Áp dụng cho du khách từ 16 tuổi trở lên"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold" />
              </div>
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Giá vé (VNĐ) *</label>
                <input type="number" min="0" step="1000" value={formData.price} onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="VD: 50000"
                  className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold ${errors.price ? 'border-red-400 bg-red-50' : 'border-gray-200'}`} />
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
              </div>
              <div className="flex items-center gap-3">
                <input type="checkbox" id="active" checked={formData.active} onChange={(e) => setFormData({ ...formData, active: e.target.checked })} className="w-4 h-4 accent-museum-brown" />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">Đang bán (Hiển thị cho khách)</label>
              </div>
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsFormOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200">Hủy</button>
                <button type="submit" className="px-5 py-2 bg-museum-brown text-white font-bold text-xs rounded-xl hover:bg-museum-brown-dk shadow-sm">
                  {editingTicket ? 'Lưu thay đổi' : 'Thêm loại vé'}
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
              <p className="text-sm text-gray-600">Bạn có chắc muốn xóa loại vé <strong>"{deleteTarget.name}"</strong>? Hành động này không thể hoàn tác.</p>
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
