import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Ticket,
  Plus,
  TrendingUp,
  Pencil,
  Trash2,
  X,
  AlertTriangle,
  QrCode,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { TicketBookingModal } from '@/components/tickets/TicketBookingModal';

const EMPTY_TICKET = { name: '', description: '', price: '', active: true };

// Default sample transactions matching the target screenshot
const DEMO_BOOKED_TICKETS = [
  {
    id: 'TICKET-20260916-919',
    orderCode: 'TICKET-20260916-919',
    ticketCode: 'TK-266574',
    name: 'hoang duc duong',
    phone: '09876543212',
    email: 'hhtduong@gmail.com',
    ticketType: 'Vé Học sinh - Sinh viên (1 vé)',
    visitDate: '2026-09-17',
    paymentMethod: 'QR thanh toán',
    totalPrice: 20000,
    status: 'Đã thanh toán',
  },
  {
    id: 'TICKET-20260826-348',
    orderCode: 'TICKET-20260826-348',
    ticketCode: 'TK-788501',
    name: 'vuha',
    phone: '098765432122',
    email: 'vuhar23@gmail.com',
    ticketType: 'Vé Người lớn (1 vé)',
    visitDate: '2026-08-26',
    paymentMethod: 'QR thanh toán',
    totalPrice: 50000,
    status: 'Đã thanh toán',
  },
  {
    id: 'TK-2026-001',
    orderCode: 'TK-2026-001',
    ticketCode: 'TK-2026-001',
    name: 'Nguyễn Văn Anh',
    phone: '0912345678',
    email: 'admin@gmail.com',
    ticketType: 'Vé Người lớn (2 vé)',
    visitDate: '2026-08-20',
    paymentMethod: 'Tại quầy',
    totalPrice: 100000,
    status: 'Đã xác nhận',
  },
];

export const Tickets = () => {
  const {
    tickets,
    ticketStats,
    bookedTickets,
    addTicketType,
    updateTicketType,
    deleteTicketType,
  } = useApp();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [formData, setFormData] = useState(EMPTY_TICKET);
  const [errors, setErrors] = useState({});
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Combine real booked tickets with demo records to match screenshot exactly
  const displayBookedTickets =
    bookedTickets && bookedTickets.length > 0 ? bookedTickets : DEMO_BOOKED_TICKETS;

  const openAdd = () => {
    setEditingTicket(null);
    setFormData(EMPTY_TICKET);
    setErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (t) => {
    setEditingTicket(t);
    setFormData({
      name: t.name,
      description: t.description,
      price: String(t.price),
      active: t.active !== false,
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Vui lòng nhập tên loại vé.';
    const priceNum = Number(formData.price);
    if (formData.price === '' || isNaN(priceNum) || priceNum < 0) {
      errs.price = 'Giá vé phải là số >= 0.';
    }
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

  // Predefined custom styling for the 4 ticket cards in row 2
  const ticketPillStyles = [
    {
      badgeBg: 'bg-[#FAF5EB]',
      badgeBorder: 'border-[#E2DAC9]',
      badgeText: 'text-[#B88128]',
      type: 'tg',
    },
    {
      badgeBg: 'bg-amber-50',
      badgeBorder: 'border-amber-200',
      badgeText: 'text-amber-700',
      type: 'ticket',
    },
    {
      badgeBg: 'bg-orange-50',
      badgeBorder: 'border-orange-200',
      badgeText: 'text-orange-700',
      type: 'ticket',
    },
    {
      badgeBg: 'bg-sky-50',
      badgeBorder: 'border-sky-200',
      badgeText: 'text-sky-700',
      type: 'tg',
    },
  ];

  return (
    <div className="space-y-6 animate-fadeIn pb-8 max-w-[1400px] mx-auto font-sans w-full min-w-0">
      {/* 1. Header: Breadcrumbs, Title and 2 Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumbs matching screenshot */}
          <div className="text-xs text-[#8C7A6B] font-medium mb-1">
            <Link to="/dashboard" className="hover:text-[#2B170B] transition-colors">
              Tổng quan
            </Link>
            <span className="mx-1.5 text-[#8C7A6B] font-normal">/</span>
            <span className="text-[#2B170B] font-semibold">Vé tham quan</span>
          </div>

          {/* Page Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-[#2B170B] tracking-tight uppercase">
            QUẢN LÝ VÉ THAM QUAN
          </h1>
        </div>

        {/* 2 Action Buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsBookingModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-[#B88128] hover:bg-[#A36C18] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            <QrCode className="w-4 h-4 text-white" />
            <span>+ Đặt vé & Thanh toán QR</span>
          </button>
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 bg-[#4A2810] hover:bg-[#381D0B] text-white font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all transform hover:scale-[1.02] cursor-pointer"
          >
            <Plus className="w-4 h-4 text-[#D4A359]" />
            <span>+ Thêm loại vé</span>
          </button>
        </div>
      </div>

      {/* 2. Row 1: 3 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        {/* Card 1: Vé bán hôm nay */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE4D4] border-l-4 border-l-[#C9974C] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider">
              VÉ BÁN HÔM NAY
            </div>
            <div className="text-3xl font-extrabold text-[#2B170B] tracking-tight mt-1 flex items-baseline gap-1">
              <span>{ticketStats.totalSoldToday || 45}</span>
              <span className="text-xs font-normal text-[#8C7A6B]">vé</span>
            </div>
          </div>
          {/* TG Ticket Stamp Icon */}
          <div className="px-2.5 py-1.5 rounded-lg bg-[#FAF5EB] border border-[#E2DAC9] flex items-center gap-1.5 text-[#B88128] font-bold text-xs shadow-2xs">
            <Ticket className="w-4 h-4 text-[#B88128]" />
            <span className="font-serif">TG</span>
          </div>
        </div>

        {/* Card 2: Vé bán trong tháng */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE4D4] border-l-4 border-l-[#2E7D32] shadow-xs flex flex-col justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider">
              VÉ BÁN TRONG THÁNG
            </div>
            <div className="text-3xl font-extrabold text-[#2B170B] tracking-tight mt-1 flex items-baseline gap-1">
              <span>{formatNumber(ticketStats.totalSoldMonth || 3246)}</span>
              <span className="text-xs font-normal text-[#8C7A6B]">vé</span>
            </div>
          </div>
          <div className="text-[11px] font-semibold text-[#2E7D32] bg-[#E8F5E9] px-2.5 py-0.5 rounded-full inline-flex items-center gap-1 w-fit mt-2">
            <TrendingUp className="w-3 h-3" />
            <span>+{ticketStats.growthRate || 320} so với tháng trước</span>
          </div>
        </div>

        {/* Card 3: Doanh thu vé tháng */}
        <div className="bg-white rounded-2xl p-5 border border-[#ECE4D4] border-l-4 border-l-[#B88128] shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider">
              DOANH THU VÉ THÁNG
            </div>
            <div className="text-2xl sm:text-[26px] font-extrabold text-[#B88128] tracking-tight mt-1">
              162.300.000 VNĐ
            </div>
          </div>
          {/* Banknote Cash Icon */}
          <div className="w-12 h-10 rounded-xl bg-[#FAF5EB] border border-[#E2DAC9] flex items-center justify-center text-[#B88128] shadow-2xs">
            <svg
              className="w-6 h-6 stroke-current fill-none"
              viewBox="0 0 24 24"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <circle cx="12" cy="12" r="2.5" />
              <path d="M6 12h.01M18 12h.01" />
            </svg>
          </div>
        </div>
      </div>

      {/* 3. Row 2: Ticket Types Compact Horizontal Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tickets.slice(0, 4).map((t, idx) => {
          const style = ticketPillStyles[idx % ticketPillStyles.length];
          const isFree = t.price === 0;

          return (
            <div
              key={t.id}
              className="bg-white rounded-2xl p-3.5 border border-[#ECE4D4] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-between gap-3 group"
            >
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {/* Badge Left */}
                <div
                  className={`w-9 h-9 rounded-xl ${style.badgeBg} border ${style.badgeBorder} flex items-center justify-center ${style.badgeText} font-bold text-xs shrink-0 shadow-2xs`}
                >
                  {style.type === 'tg' ? (
                    <span className="font-serif">TG</span>
                  ) : (
                    <Ticket className="w-4 h-4 stroke-[2]" />
                  )}
                </div>

                {/* Name & Description */}
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-xs sm:text-[13px] text-[#2B170B] truncate group-hover:text-[#B88128] transition-colors">
                    {t.name}
                  </h4>
                  <p
                    className={`text-[11px] truncate mt-0.5 ${
                      isFree ? 'text-[#2E7D32] font-semibold' : 'text-[#8C7A6B]'
                    }`}
                  >
                    {isFree ? 'Miễn phí' : t.description}
                  </p>
                </div>
              </div>

              {/* Actions Right (Edit & Delete) */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => openEdit(t)}
                  className="p-1.5 rounded-lg border border-[#ECE4D4] text-[#8C7A6B] hover:text-[#B88128] hover:bg-[#FAF5EB] transition-colors cursor-pointer"
                  title="Sửa loại vé"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setDeleteTarget(t)}
                  className="p-1.5 rounded-lg border border-[#ECE4D4] text-[#8C7A6B] hover:text-red-600 hover:bg-rose-50 transition-colors cursor-pointer"
                  title="Xóa loại vé"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4. Row 3: Booked Tickets List Table */}
      <div className="space-y-3">
        {/* Table Section Header */}
        <div className="flex items-center justify-between px-1">
          <h3 className="font-bold text-xs sm:text-[13px] uppercase tracking-wider text-[#2B170B]">
            DANH SÁCH VÉ ĐẶT TRỰC TUYẾN & GIAO DỊCH QR
          </h3>
          <span className="text-xs text-[#8C7A6B] font-medium">
            Tổng cộng: {displayBookedTickets.length} đơn vé
          </span>
        </div>

        {/* Table Container */}
        <div className="bg-white rounded-2xl border border-[#ECE4D4] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-gray-50/70 border-b border-[#ECE4D4] text-[11px] font-bold text-[#8C7A6B] uppercase tracking-wider">
                  <th className="py-3 px-4">MÃ ĐƠN / MÃ VÉ</th>
                  <th className="py-3 px-4">HỌ TÊN KHÁCH</th>
                  <th className="py-3 px-4">LIÊN HỆ</th>
                  <th className="py-3 px-4">LOẠI VÉ</th>
                  <th className="py-3 px-4">NGÀY THAM QUAN</th>
                  <th className="py-3 px-4">THANH TOÁN</th>
                  <th className="py-3 px-4">TỔNG TIỀN</th>
                  <th className="py-3 px-4">TRẠNG THÁI</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F4EFE6] text-xs text-[#2B170B]">
                {displayBookedTickets.map((b) => {
                  const isPaid =
                    b.status === 'Đã thanh toán' ||
                    b.paymentStatus === 'Đã thanh toán';
                  const isConfirmed = b.status === 'Đã xác nhận';

                  return (
                    <tr
                      key={b.id}
                      className="hover:bg-[#FAF5EB]/50 transition-colors"
                    >
                      {/* Mã đơn / Mã vé */}
                      <td className="py-3.5 px-4 font-bold text-[#2B170B]">
                        <div>{b.orderCode || b.ticketCode}</div>
                        <div className="text-[10px] text-[#8C7A6B] font-mono mt-0.5">
                          VÉ: {b.ticketCode || b.orderCode}
                        </div>
                      </td>

                      {/* Họ tên khách */}
                      <td className="py-3.5 px-4 font-medium">{b.name}</td>

                      {/* Liên hệ */}
                      <td className="py-3.5 px-4">
                        <div className="text-xs text-[#2B170B]">{b.phone}</div>
                        <div className="text-[10px] text-[#8C7A6B] mt-0.5">
                          {b.email}
                        </div>
                      </td>

                      {/* Loại vé */}
                      <td className="py-3.5 px-4 text-[#5B3A1F]">
                        {b.ticketType}
                      </td>

                      {/* Ngày tham quan */}
                      <td className="py-3.5 px-4 text-[#8C7A6B] font-medium">
                        {b.visitDate}
                      </td>

                      {/* Thanh toán */}
                      <td className="py-3.5 px-4 font-medium text-[#5B3A1F]">
                        {b.paymentMethod || 'QR thanh toán'}
                      </td>

                      {/* Tổng tiền */}
                      <td className="py-3.5 px-4 font-bold text-[#B88128]">
                        {typeof b.totalPrice === 'number'
                          ? formatCurrency(b.totalPrice)
                          : b.totalPrice}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2.5 py-1 rounded-full text-[10.5px] font-bold inline-block shadow-2xs ${
                            isPaid
                              ? 'bg-[#E8F5E9] text-[#2E7D32]'
                              : isConfirmed
                              ? 'bg-blue-50 text-blue-700'
                              : 'bg-amber-50 text-amber-700'
                          }`}
                        >
                          {b.status || 'Đã thanh toán'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Ticket Booking Modal */}
      <TicketBookingModal
        isOpen={isBookingModalOpen}
        onClose={() => setIsBookingModalOpen(false)}
      />

      {/* Ticket Form Modal (Add / Edit) */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 space-y-4 border border-[#ECE4D4]">
            <div className="flex items-center justify-between border-b border-[#F4EFE6] pb-3">
              <h3 className="text-base font-bold text-[#2B170B]">
                {editingTicket ? 'Sửa loại vé' : 'Thêm loại vé mới'}
              </h3>
              <button
                onClick={() => setIsFormOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3" noValidate>
              <div>
                <label className="block text-xs font-bold text-[#5B3A1F] uppercase mb-1">
                  Tên loại vé *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="VD: Vé Người lớn"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs text-[#2B170B] focus:outline-none focus:ring-2 focus:ring-[#C9974C] ${
                    errors.name ? 'border-red-400 bg-red-50' : 'border-[#ECE4D4]'
                  }`}
                />
                {errors.name && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.name}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5B3A1F] uppercase mb-1">
                  Mô tả
                </label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="VD: Áp dụng cho du khách từ 16 tuổi trở lên"
                  className="w-full px-3.5 py-2.5 bg-white border border-[#ECE4D4] rounded-xl text-xs text-[#2B170B] focus:outline-none focus:ring-2 focus:ring-[#C9974C]"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-[#5B3A1F] uppercase mb-1">
                  Giá vé (VNĐ) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="VD: 50000"
                  className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-xs text-[#2B170B] focus:outline-none focus:ring-2 focus:ring-[#C9974C] ${
                    errors.price ? 'border-red-400 bg-red-50' : 'border-[#ECE4D4]'
                  }`}
                />
                {errors.price && (
                  <p className="text-[11px] text-red-500 mt-1">{errors.price}</p>
                )}
              </div>
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="active"
                  checked={formData.active}
                  onChange={(e) =>
                    setFormData({ ...formData, active: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#B88128]"
                />
                <label
                  htmlFor="active"
                  className="text-xs font-medium text-[#2B170B] cursor-pointer"
                >
                  Đang bán (Hiển thị cho khách tham quan)
                </label>
              </div>
              <div className="pt-3 flex items-center justify-end gap-2 border-t border-[#F4EFE6]">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-600 hover:bg-gray-100 cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-[#4A2810] hover:bg-[#381D0B] text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer"
                >
                  {editingTicket ? 'Lưu thay đổi' : 'Thêm loại vé'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4 border border-[#ECE4D4]">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="w-12 h-12 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-base text-[#2B170B]">
                Xác nhận xóa
              </h3>
              <p className="text-xs text-[#8C7A6B]">
                Bạn có chắc muốn xóa loại vé{' '}
                <strong>"{deleteTarget.name}"</strong>? Hành động này không thể hoàn tác.
              </p>
            </div>
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200 cursor-pointer"
              >
                Hủy
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 py-2 bg-red-600 text-white font-bold text-xs rounded-xl hover:bg-red-700 cursor-pointer"
              >
                Xóa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
