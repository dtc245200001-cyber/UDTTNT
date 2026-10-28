import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Search,
  Bell,
  Menu,
  ChevronDown,
  User,
  Settings,
  LogOut,
  Star,
  Ticket,
  CalendarDays,
  Globe,
  Filter,
} from 'lucide-react';

export const Header = () => {
  const navigate = useNavigate();
  const { setIsMobileSidebarOpen, globalSearch, setGlobalSearch, currentUser, logout } = useApp();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);

  const notifications = [
    {
      id: 1,
      icon: Star,
      iconBg: 'bg-amber-100 text-amber-700',
      text: 'Có đánh giá 5 sao mới cho hiện vật Trống đồng Đông Sơn',
      time: '5 phút trước',
    },
    {
      id: 2,
      icon: Ticket,
      iconBg: 'bg-emerald-100 text-emerald-700',
      text: 'Vé tham quan hôm nay đã đạt: 45 vé đã bán',
      time: '25 phút trước',
    },
    {
      id: 3,
      icon: CalendarDays,
      iconBg: 'bg-blue-100 text-blue-700',
      text: 'Sự kiện "Tọa đàm Trống đồng" sắp diễn ra',
      time: '1 giờ trước',
    },
  ];

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/artifacts?q=${encodeURIComponent(globalSearch.trim())}`);
    } else {
      navigate('/artifacts');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="h-[72px] bg-white/95 backdrop-blur-md border-b border-stone-200/60 sticky top-0 z-20 flex items-center justify-between px-4 lg:px-8 shadow-[0_2px_15px_-3px_rgba(92,44,22,0.05)]">
      {/* Left: Mobile Toggle & Search */}
      <div className="flex items-center gap-3 flex-1 max-w-2xl">
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden p-2 rounded-xl text-[#3E2712] hover:bg-[#F5EFE0] transition-colors cursor-pointer"
          title="Mở menu"
        >
          <Menu className="w-6 h-6" />
        </button>

        {/* Integrated Search Input Pill */}
        <form onSubmit={handleSearchSubmit} className="relative flex items-center w-full max-w-md gap-2">
          <div className="relative flex-1 flex items-center">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 pointer-events-none" />
            <input
              type="text"
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Tìm kiếm hiện vật, triển lãm..."
              className="w-full pl-10 pr-10 py-2 bg-[#F7F3EE] text-sm text-[#2D241E] placeholder-stone-400 rounded-full border border-stone-200/80 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20 focus:border-[#D4A359] transition-all shadow-2xs"
            />
            <button
              type="submit"
              className="absolute right-1 w-7 h-7 bg-[#8B5A1E] hover:bg-[#734814] text-white rounded-full flex items-center justify-center transition-colors shadow-2xs cursor-pointer"
              title="Tìm kiếm"
            >
              <Search className="w-3.5 h-3.5" />
            </button>
          </div>
          <button
            type="button"
            onClick={() => navigate('/artifacts')}
            className="w-8 h-8 rounded-full bg-[#F7F3EE] border border-stone-200/80 text-stone-500 hover:text-[#3E2712] hover:bg-[#F5EFE0] flex items-center justify-center transition-colors shadow-2xs shrink-0 cursor-pointer"
            title="Lọc hiện vật"
          >
            <Filter className="w-3.5 h-3.5" />
          </button>
        </form>
      </div>

      {/* Right Action Icons & Profile */}
      <div className="flex items-center gap-3 sm:gap-4">
        {/* Link to Visitor Public Site */}
        <button
          onClick={() => navigate('/public-home')}
          className="btn-outline hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs shadow-2xs cursor-pointer"
          title="Xem giao diện Khách tham quan"
        >
          <Globe className="w-3.5 h-3.5 text-[#B8860B]" />
          <span>Trang công khai</span>
        </button>

        {/* Notification Bell Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowNotifications(!showNotifications);
              setShowUserMenu(false);
            }}
            className="relative p-2 rounded-full text-stone-500 hover:bg-[#F5EFE0] hover:text-[#3E2712] transition-colors cursor-pointer"
          >
            <Bell className="w-5 h-5 text-stone-500" />
            <span className="absolute top-1 right-1 w-4 h-4 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              3
            </span>
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-stone-200/70 py-3 z-40 animate-fadeIn">
              <div className="flex items-center justify-between px-4 pb-3 border-b border-stone-100 bg-[#FAF6EF]/60">
                <h4 className="font-bold text-sm text-[#3E2712]">Thông báo mới</h4>
                <span className="text-xs bg-museum-cream text-[#3E2712] px-2 py-0.5 rounded-full font-semibold">
                  3 chưa đọc
                </span>
              </div>
              <div className="divide-y divide-stone-100 max-h-80 overflow-y-auto">
                {notifications.map((n) => {
                  const Icon = n.icon;
                  return (
                    <div
                      key={n.id}
                      className="p-3.5 hover:bg-[#FAF6EF]/60 flex items-start gap-3 transition-colors cursor-pointer"
                    >
                      <div className={`p-2 rounded-xl flex-shrink-0 ${n.iconBg}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs font-medium text-stone-800 leading-snug">{n.text}</p>
                        <span className="text-[11px] text-stone-400 mt-1 block">{n.time}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setShowUserMenu(!showUserMenu);
              setShowNotifications(false);
            }}
            className="flex items-center gap-2.5 p-1 rounded-full hover:bg-[#F5EFE0]/60 transition-colors cursor-pointer border border-transparent hover:border-stone-200/60"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150'}
              alt={currentUser?.name || 'ADMIN'}
              className="w-9 h-9 rounded-full object-cover border border-[#D4A359]/60 shadow-xs"
            />
            <div className="hidden sm:block text-left leading-tight">
              <div className="font-bold text-xs uppercase tracking-wide text-[#2D241E]">ADMIN</div>
              <div className="text-[11px] text-stone-500">Quản trị viên</div>
            </div>
          </button>

          {showUserMenu && (
            <div className="absolute right-0 mt-3 w-56 bg-white rounded-2xl shadow-xl border border-stone-200/70 py-2 z-40 animate-fadeIn">
              <div className="px-4 py-2 border-b border-stone-100 sm:hidden">
                <p className="font-bold text-sm text-[#3E2712]">{currentUser?.name || 'Admin'}</p>
                <p className="text-xs text-stone-500">{currentUser?.roleLabel || 'Quản trị viên'}</p>
              </div>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-[#FAF6EF] hover:text-[#3E2712] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <User className="w-4 h-4 text-[#B8860B]" />
                Hồ sơ cá nhân
              </button>
              <button
                onClick={() => {
                  setShowUserMenu(false);
                  navigate('/settings');
                }}
                className="w-full text-left px-4 py-2 text-sm text-stone-700 hover:bg-[#FAF6EF] hover:text-[#3E2712] flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <Settings className="w-4 h-4 text-[#B8860B]" />
                Cài đặt
              </button>
              <div className="my-1 border-t border-stone-100" />
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-rose-50 flex items-center gap-2.5 font-medium transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                Đăng xuất
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
