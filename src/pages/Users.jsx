import React from 'react';
import { useApp } from '@/context/AppContext';
import { Users as UsersIcon, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const UsersPage = () => {
  const { users } = useApp();

  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Người dùng</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
            QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN
          </h2>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors">
          <Plus className="w-5 h-5" />
          <span>+ Thêm tài khoản</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-museum-ivory text-museum-brown text-xs font-bold uppercase tracking-wider border-b border-gray-200">
              <th className="py-3.5 px-4">Tài khoản</th>
              <th className="py-3.5 px-4">Email</th>
              <th className="py-3.5 px-4">Vai trò</th>
              <th className="py-3.5 px-4">Trạng thái</th>
              <th className="py-3.5 px-4">Ngày tham gia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
            {users.map((u) => (
              <tr key={u.id} className="hover:bg-museum-cream/30 transition-colors">
                <td className="py-3 px-4 font-bold text-museum-brown flex items-center gap-3">
                  <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-gray-200" />
                  <div>
                    <div>{u.name}</div>
                    <span className="text-[10px] text-gray-400 font-normal">{u.id}</span>
                  </div>
                </td>
                <td className="py-3 px-4">{u.email}</td>
                <td className="py-3 px-4 font-semibold text-museum-gold">{u.role}</td>
                <td className="py-3 px-4"><Badge>{u.status}</Badge></td>
                <td className="py-3 px-4 text-gray-500">{u.joinedAt}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
