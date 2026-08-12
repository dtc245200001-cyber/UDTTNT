import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Users as UsersIcon, Plus, Search, ShieldCheck, UserCheck, Shield, User, X } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const UsersPage = () => {
  const { users, currentUser, updateUserRole, addUser } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

  // Form state for adding new user
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'visitor',
  });

  // Filter users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (userId, newRole) => {
    updateUserRole(userId, newRole);
  };

  const handleCreateUser = (e) => {
    e.preventDefault();
    if (!newUserData.email || !newUserData.name) return;

    addUser(newUserData);
    setIsAddModalOpen(false);
    setNewUserData({ name: '', email: '', password: '', role: 'visitor' });
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Người dùng & Phân quyền</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight flex items-center gap-2">
            <ShieldCheck className="w-7 h-7 text-museum-gold" />
            <span>QUẢN LÝ TÀI KHOẢN & PHÂN QUYỀN</span>
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Quản trị viên có thể thay đổi vai trò Admin hoặc Visitor cho bất kỳ tài khoản nào trong hệ thống.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors"
        >
          <Plus className="w-5 h-5" />
          <span>+ Thêm tài khoản mới</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Tìm theo tên hoặc email..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 text-xs sm:text-sm rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs font-bold text-museum-brown">Lọc vai trò:</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 bg-gray-50 text-xs font-semibold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-museum-gold"
          >
            <option value="all">Tất cả vai trò ({users.length})</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="visitor">Khách tham quan (Visitor)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-museum-ivory text-museum-brown text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                <th className="py-3.5 px-4">Tài khoản & Họ tên</th>
                <th className="py-3.5 px-4">Địa chỉ Email</th>
                <th className="py-3.5 px-4">Vai trò Phân quyền</th>
                <th className="py-3.5 px-4">Hành động Phân quyền</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Ngày tham gia</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {filteredUsers.map((u) => {
                const isCurrent = currentUser && currentUser.email?.toLowerCase() === u.email?.toLowerCase();
                const isAdmin = u.role === 'admin';

                return (
                  <tr key={u.id} className="hover:bg-museum-cream/30 transition-colors">
                    {/* User Info */}
                    <td className="py-3.5 px-4 font-bold text-museum-brown flex items-center gap-3">
                      <img
                        src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                        alt={u.name}
                        className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-xs"
                      />
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-sm text-museum-brown">{u.name}</span>
                          {isCurrent && (
                            <span className="px-1.5 py-0.5 bg-museum-gold text-white text-[10px] font-extrabold rounded-md uppercase">
                              Bạn
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 font-normal">{u.id}</span>
                      </div>
                    </td>

                    {/* Email */}
                    <td className="py-3.5 px-4 font-medium text-gray-600">{u.email}</td>

                    {/* Current Role Badge */}
                    <td className="py-3.5 px-4 font-semibold">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-100 text-amber-800 border border-amber-300 rounded-lg text-xs font-bold">
                          <Shield className="w-3.5 h-3.5 text-amber-600" />
                          <span>Admin (Quản trị viên)</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Visitor (Khách hàng)</span>
                        </span>
                      )}
                    </td>

                    {/* Interactive Role Switcher */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className="px-3 py-1.5 bg-gray-50 border border-gray-300 rounded-xl text-xs font-bold text-museum-brown focus:outline-none focus:ring-2 focus:ring-museum-gold cursor-pointer"
                        >
                          <option value="admin">👑 Quyền Admin</option>
                          <option value="visitor">👤 Quyền Visitor</option>
                        </select>
                      </div>
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <Badge variant={u.status === 'Hoạt động' ? 'success' : 'secondary'}>
                        {u.status || 'Hoạt động'}
                      </Badge>
                    </td>

                    {/* Joined Date */}
                    <td className="py-3.5 px-4 text-gray-500 font-medium">{u.joinedAt || '2024-01-01'}</td>
                  </tr>
                );
              })}

              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 font-medium">
                    Không tìm thấy tài khoản phù hợp.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-museum-brown flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-museum-gold" />
                <span>Thêm Tài Khoản & Phân Quyền</span>
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Họ và tên *</label>
                <input
                  type="text"
                  required
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn B"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Địa chỉ Email *</label>
                <input
                  type="email"
                  required
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="VD: user@gmail.com"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Mật khẩu khởi tạo</label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Mặc định: 123456"
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Phân quyền vai trò *</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs sm:text-sm font-bold text-museum-brown focus:outline-none focus:ring-2 focus:ring-museum-gold"
                >
                  <option value="visitor">👤 Khách tham quan (Visitor)</option>
                  <option value="admin">👑 Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-museum-brown text-white font-bold text-xs rounded-xl hover:bg-museum-brown-dk shadow-sm"
                >
                  Lưu & Cấp quyền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
