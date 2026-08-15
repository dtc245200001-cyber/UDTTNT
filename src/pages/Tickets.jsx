import React from 'react';
import { useApp } from '@/context/AppContext';
import { Ticket, Plus, TrendingUp, Mail, User, Calendar, Phone } from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { Badge } from '@/components/ui/Badge';

export const Tickets = () => {
  const { tickets, ticketStats, bookedTickets } = useApp();

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Vé tham quan</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
            QUẢN LÝ VÉ THAM QUAN
          </h2>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors cursor-pointer">
          <Plus className="w-5 h-5" />
          <span>+ Cấu hình loại vé</span>
        </button>
      </div>

      {/* Ticket Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-4 border-l-museum-gold">
          <div className="text-xs font-bold text-gray-400 uppercase">Vé bán hôm nay</div>
          <div className="text-3xl font-extrabold text-museum-brown mt-1">
            {ticketStats.totalSoldToday} <span className="text-sm font-normal text-gray-500">vé</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-4 border-l-emerald-500">
          <div className="text-xs font-bold text-gray-400 uppercase">Vé bán trong tháng</div>
          <div className="text-3xl font-extrabold text-museum-brown mt-1">
            {formatNumber(ticketStats.totalSoldMonth)} <span className="text-sm font-normal text-gray-500">vé</span>
          </div>
          <div className="text-xs font-semibold text-emerald-600 flex items-center gap-1 mt-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{ticketStats.growthRate} so với tháng trước</span>
          </div>
        </div>
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-4 border-l-museum-brown">
          <div className="text-xs font-bold text-gray-400 uppercase">Doanh thu vé tháng</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-museum-gold mt-1">
            {formatCurrency(ticketStats.revenueMonth)}
          </div>
        </div>
      </div>

      {/* Booked Tickets List (Online Reservations) */}
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
                <th className="py-3 px-4">Họ tên người nhận</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Email nhận vé</th>
                <th className="py-3 px-4">Loại vé</th>
                <th className="py-3 px-4">Ngày tham quan</th>
                <th className="py-3 px-4">Giá vé</th>
                <th className="py-3 px-4">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {(!bookedTickets || bookedTickets.length === 0) ? (
                <tr>
                  <td colSpan={8} className="text-center py-6 text-gray-400 font-medium">
                    Chưa có lịch sử đặt vé trực tuyến nào.
                  </td>
                </tr>
              ) : (
                bookedTickets.map((b) => (
                  <tr key={b.id} className="hover:bg-museum-cream/30 transition-colors">
                    <td className="py-3 px-4 font-bold text-museum-brown">{b.ticketCode}</td>
                    <td className="py-3 px-4 font-semibold text-gray-800">{b.name}</td>
                    <td className="py-3 px-4 text-gray-600">{b.phone}</td>
                    <td className="py-3 px-4 text-museum-gold font-medium">{b.email}</td>
                    <td className="py-3 px-4">{b.ticketType}</td>
                    <td className="py-3 px-4 font-medium">{b.visitDate}</td>
                    <td className="py-3 px-4 font-bold text-museum-brown">{formatCurrency(b.price)}</td>
                    <td className="py-3 px-4">
                      <Badge variant="emerald">{b.status}</Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Ticket Types List */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="p-4 bg-museum-ivory border-b border-gray-200 font-bold text-sm text-museum-brown">
          CẤU HÌNH CÁC LOẠI VÉ THAM QUAN
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
              <div className="text-right">
                <div className="font-extrabold text-base text-museum-gold">
                  {formatCurrency(t.price)}
                </div>
                <span className="text-[11px] text-emerald-600 font-semibold bg-emerald-50 px-2 py-0.5 rounded-full">
                  Đang bán
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
