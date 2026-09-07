import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Users as UsersIcon, Plus, Search, ShieldCheck, UserCheck, Shield,
  User, X, Lock, Unlock, Trash2, Eye, AlertTriangle
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const UsersPage = () => {
  const { users, currentUser, usersLoading, updateUserRole, addUser, toggleUserStatus, deleteUser } = useApp();

  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [detailUser, setDetailUser] = useState(null);

  // Confirm dialog state
  const [confirmAction, setConfirmAction] = useState(null);
  // confirmAction = { type: 'delete'|'lock'|'unlock'|'role', user, newRole }

  // Form state for adding new user
  const [newUserData, setNewUserData] = useState({ name: '', email: '', password: '', role: 'visitor' });
  const [addErrors, setAddErrors] = useState({});

  // Filter users list
  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === 'all' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const handleRoleChange = (user, newRole) => {
    if (user.role === newRole) return;
    setConfirmAction({ type: 'role', user, newRole });
  };

  const handleToggleLock = (user) => {
    const isLocked = user.status === 'Tạm khóa';
    setConfirmAction({ type: isLocked ? 'unlock' : 'lock', user });
  };

  const handleDeleteUser = (user) => {
    setConfirmAction({ type: 'delete', user });
  };

  const handleConfirm = async () => {
    if (!confirmAction) return;
    const { type, user, newRole } = confirmAction;
    if (type === 'role') await updateUserRole(user.id, newRole);
    else if (type === 'lock' || type === 'unlock') await toggleUserStatus(user.id);
    else if (type === 'delete') await deleteUser(user.id);
    setConfirmAction(null);
  };

  const validateAddUser = () => {
    const errs = {};
    if (!newUserData.name.trim()) errs.name = 'Vui lòng nhập họ tên.';
    if (!newUserData.email.trim() || !/\S+@\S+\.\S+/.test(newUserData.email)) errs.email = 'Email không hợp lệ.';
    if (!newUserData.password || newUserData.password.length < 6) errs.password = 'Mật khẩu tối thiểu 6 ký tự.';
    const exists = users.find((u) => u.email.toLowerCase() === newUserData.email.trim().toLowerCase());
    if (exists) errs.email = 'Email này đã được đăng ký trong hệ thống!';
    setAddErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    if (!validateAddUser()) return;
    const res = await addUser(newUserData);
    if (res && res.success) {
      setIsAddModalOpen(false);
      setNewUserData({ name: '', email: '', password: '', role: 'visitor' });
      setAddErrors({});
    }
  };

  const confirmMessages = {
    role: (a) => `Bạn có chắc muốn đổi quyền của "${a.user.name}" thành ${a.newRole === 'admin' ? 'Quản trị viên (Admin)' : a.newRole === 'staff' ? 'Nhân viên (Staff)' : 'Khách tham quan (Visitor)'}?`,
    lock: (a) => `Bạn có chắc muốn KHÓA tài khoản "${a.user.name}"? Tài khoản này sẽ không thể đăng nhập.`,
    unlock: (a) => `Bạn có chắc muốn MỞ KHÓA tài khoản "${a.user.name}"?`,
    delete: (a) => `Bạn có chắc muốn XÓA VĨNH VIỄN tài khoản "${a.user.name}"? Hành động này không thể hoàn tác!`,
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
            Quản trị viên có thể thay đổi vai trò, khóa/mở khóa và xóa tài khoản trong hệ thống.
          </p>
        </div>
        <button
          onClick={() => { setIsAddModalOpen(true); setAddErrors({}); }}
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
            <option value="all">Tất cả ({users.length})</option>
            <option value="admin">Quản trị viên (Admin)</option>
            <option value="visitor">Khách tham quan (Visitor)</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[860px]">
            <thead>
              <tr className="bg-museum-ivory text-museum-brown text-xs font-bold uppercase tracking-wider border-b border-gray-200">
                <th className="py-3.5 px-4">Tài khoản & Họ tên</th>
                <th className="py-3.5 px-4">Địa chỉ Email</th>
                <th className="py-3.5 px-4">Phân quyền</th>
                <th className="py-3.5 px-4">Trạng thái</th>
                <th className="py-3.5 px-4">Ngày tham gia</th>
                <th className="py-3.5 px-4 text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {usersLoading ? (
                Array.from({ length: 4 }).map((_, idx) => (
                  <tr key={`skeleton-${idx}`} className="animate-pulse">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gray-200" />
                        <div className="space-y-1.5">
                          <div className="h-3.5 w-24 bg-gray-200 rounded" />
                          <div className="h-2.5 w-12 bg-gray-100 rounded" />
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-3.5 w-32 bg-gray-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-7 w-24 bg-gray-200 rounded-xl" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-5 w-20 bg-gray-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="h-3.5 w-20 bg-gray-200 rounded" />
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="h-6 w-16 bg-gray-200 rounded ml-auto" />
                    </td>
                  </tr>
                ))
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-8 text-gray-400 font-medium">
                    Không tìm thấy tài khoản phù hợp.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => {
                  const isCurrent = currentUser && currentUser.email?.toLowerCase() === u.email?.toLowerCase();
                  const isLocked = u.status === 'Tạm khóa';

                  return (
                    <tr key={u.id} className="hover:bg-museum-cream/30 transition-colors">
                      {/* User Info */}
                      <td className="py-3.5 px-4 font-bold text-museum-brown">
                        <div className="flex items-center gap-3">
                          <img
                            src={u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                            alt={u.name}
                            className="w-9 h-9 rounded-full object-cover border border-gray-200 shadow-xs"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-sm text-museum-brown">{u.name}</span>
                              {isCurrent && (
                                <span className="px-1.5 py-0.5 bg-museum-gold text-white text-[10px] font-extrabold rounded-md uppercase">Bạn</span>
                              )}
                            </div>
                            <span className="text-[10px] text-gray-400 font-normal">{u.id}</span>
                          </div>
                        </div>
                      </td>

                      {/* Email */}
                      <td className="py-3.5 px-4 font-medium text-gray-600">{u.email}</td>

                      {/* Role Switcher — disable on self */}
                      <td className="py-3.5 px-4">
                        <select
                          value={u.role}
                          disabled={isCurrent}
                          onChange={(e) => handleRoleChange(u, e.target.value)}
                          className={`px-3 py-1.5 border rounded-xl text-xs font-bold text-museum-brown focus:outline-none focus:ring-2 focus:ring-museum-gold ${isCurrent ? 'bg-gray-100 border-gray-200 cursor-not-allowed opacity-60' : 'bg-gray-50 border-gray-300 cursor-pointer'}`}
                        >
                          <option value="admin">👑 Admin</option>
                          <option value="staff">🛡️ Staff</option>
                          <option value="visitor">👤 Visitor</option>
                        </select>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <Badge variant={isLocked ? 'secondary' : 'success'}>
                          {u.status || 'Hoạt động'}
                        </Badge>
                      </td>

                      {/* Joined Date */}
                      <td className="py-3.5 px-4 text-gray-500 font-medium">{u.joinedAt || '—'}</td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => setDetailUser(u)}
                            className="p-1.5 text-gray-400 hover:text-museum-brown hover:bg-museum-cream rounded-lg transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleToggleLock(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors ${isCurrent ? 'opacity-30 cursor-not-allowed' : 'text-gray-400 hover:text-amber-600 hover:bg-amber-50'}`}
                            title={isLocked ? 'Mở khóa tài khoản' : 'Khóa tài khoản'}
                          >
                            {isLocked ? <Unlock className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            disabled={isCurrent}
                            className={`p-1.5 rounded-lg transition-colors ${isCurrent ? 'opacity-30 cursor-not-allowed' : 'text-gray-400 hover:text-red-600 hover:bg-red-50'}`}
                            title="Xóa tài khoản"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== ADD USER MODAL ===== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 relative space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-lg font-bold text-museum-brown flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-museum-gold" />
                <span>Thêm Tài Khoản & Phân Quyền</span>
              </h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3" noValidate>
              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Họ và tên *</label>
                <input
                  type="text"
                  value={newUserData.name}
                  onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                  placeholder="VD: Nguyễn Văn B"
                  className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold ${addErrors.name ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                />
                {addErrors.name && <p className="text-xs text-red-500 mt-1">{addErrors.name}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Địa chỉ Email *</label>
                <input
                  type="email"
                  value={newUserData.email}
                  onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                  placeholder="VD: user@gmail.com"
                  className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold ${addErrors.email ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                />
                {addErrors.email && <p className="text-xs text-red-500 mt-1">{addErrors.email}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Mật khẩu *</label>
                <input
                  type="password"
                  value={newUserData.password}
                  onChange={(e) => setNewUserData({ ...newUserData, password: e.target.value })}
                  placeholder="Tối thiểu 6 ký tự"
                  className={`w-full px-3.5 py-2 bg-gray-50 border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-museum-gold ${addErrors.password ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}
                />
                {addErrors.password && <p className="text-xs text-red-500 mt-1">{addErrors.password}</p>}
              </div>

              <div>
                <label className="block text-xs font-bold text-museum-brown mb-1">Phân quyền vai trò *</label>
                <select
                  value={newUserData.role}
                  onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value })}
                  className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-bold text-museum-brown focus:outline-none focus:ring-2 focus:ring-museum-gold"
                >
                  <option value="visitor">👤 Khách tham quan (Visitor)</option>
                  <option value="admin">👑 Quản trị viên (Admin)</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-gray-100">
                <button type="button" onClick={() => setIsAddModalOpen(false)} className="px-4 py-2 bg-gray-100 text-gray-700 font-bold text-xs rounded-xl hover:bg-gray-200">
                  Hủy
                </button>
                <button type="submit" className="px-5 py-2 bg-museum-brown text-white font-bold text-xs rounded-xl hover:bg-museum-brown-dk shadow-sm">
                  Tạo tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===== USER DETAIL MODAL ===== */}
      {detailUser && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 relative space-y-4">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-museum-brown">Chi tiết tài khoản</h3>
              <button onClick={() => setDetailUser(null)} className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex flex-col items-center gap-3 py-2">
              <img src={detailUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'} className="w-16 h-16 rounded-full border-2 border-museum-gold object-cover" />
              <div className="text-center">
                <div className="font-extrabold text-museum-brown text-lg">{detailUser.name}</div>
                <div className="text-sm text-gray-500">{detailUser.email}</div>
              </div>
            </div>
            <div className="space-y-2 text-sm">
              {[
                ['Mã tài khoản', detailUser.id],
                ['Vai trò', detailUser.roleLabel || detailUser.role],
                ['Trạng thái', detailUser.status || 'Hoạt động'],
                ['Ngày đăng ký', detailUser.joinedAt || '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between border-b border-gray-100 pb-1.5">
                  <span className="text-gray-500 font-medium">{k}</span>
                  <span className="font-bold text-museum-brown">{v}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setDetailUser(null)} className="w-full py-2.5 bg-museum-brown text-white font-bold text-sm rounded-xl hover:bg-museum-brown-dk">Đóng</button>
          </div>
        </div>
      )}

      {/* ===== CONFIRM DIALOG ===== */}
      {confirmAction && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 space-y-4">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${confirmAction.type === 'delete' ? 'bg-red-100' : 'bg-amber-100'}`}>
                <AlertTriangle className={`w-7 h-7 ${confirmAction.type === 'delete' ? 'text-red-600' : 'text-amber-600'}`} />
              </div>
              <h3 className="font-extrabold text-lg text-museum-brown">Xác nhận thao tác</h3>
              <p className="text-sm text-gray-600 leading-relaxed">
                {confirmMessages[confirmAction.type]?.(confirmAction)}
              </p>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setConfirmAction(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 font-bold text-sm rounded-xl hover:bg-gray-200">
                Hủy
              </button>
              <button
                onClick={handleConfirm}
                className={`flex-1 py-2.5 text-white font-bold text-sm rounded-xl shadow-sm ${confirmAction.type === 'delete' ? 'bg-red-600 hover:bg-red-700' : 'bg-museum-brown hover:bg-museum-brown-dk'}`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
