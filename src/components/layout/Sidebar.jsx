import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  LayoutDashboard,
  Landmark,
  FolderTree,
  Image,
  Archive,
  CalendarDays,
  Ticket,
  QrCode,
  Users,
  FileText,
  Star,
  Bot,
  BarChart3,
  Settings,
  X,
  BookOpen,
} from 'lucide-react';

export const navItems = [
  { name: 'Tổng quan', icon: LayoutDashboard, path: '/dashboard' },
  { name: 'Hiện vật', icon: Landmark, path: '/artifacts' },
  { name: 'Danh mục', icon: FolderTree, path: '/categories' },
  { name: 'Trưng bày chuyên đề', icon: BookOpen, path: '/galleries' },
  { name: 'Triển lãm', icon: Archive, path: '/exhibitions' },
  { name: 'Sự kiện', icon: CalendarDays, path: '/events' },
  { name: 'Vé tham quan', icon: Ticket, path: '/tickets' },
  { name: 'Soát vé Quầy', icon: QrCode, path: '/staff/checkin' },
  { name: 'Người dùng', icon: Users, path: '/users' },
  { name: 'Bài viết', icon: FileText, path: '/articles' },
  { name: 'Đánh giá', icon: Star, path: '/reviews' },
  { name: 'AI Trợ lý', icon: Bot, path: '/ai-assistant' },
  { name: 'Báo cáo', icon: BarChart3, path: '/reports' },
  { name: 'Cài đặt', icon: Settings, path: '/settings' },
];

export const Sidebar = () => {
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useApp();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-museum-brown text-white select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-museum-brown-dk/60">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-museum-gold flex items-center justify-center text-white shadow-md">
            <Landmark className="w-6 h-6" />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-sm tracking-wider text-white">BẢO TÀNG QUỐC GIA</div>
            <div className="font-semibold text-xs tracking-widest text-museum-gold-lt uppercase">VIỆT NAM</div>
          </div>
        </div>
        {/* Close button for Mobile Drawer */}
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden p-1 text-gray-300 hover:text-white hover:bg-museum-brown-dk rounded-lg"
        >
          <X className="w-6 h-6" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileSidebarOpen(false)}
              className={({ isActive }) =>
                `relative flex items-center gap-3.5 px-4 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                  isActive
                    ? 'bg-museum-gold-lt text-museum-brown-dk font-bold shadow-md'
                    : 'text-museum-cream/90 hover:bg-museum-brown-dk hover:text-white'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-6 bg-museum-brown rounded-r-md" />
                  )}
                  <Icon
                    className={`w-5 h-5 flex-shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-museum-brown-dk' : 'text-museum-gold'
                    }`}
                  />
                  <span className="truncate md:inline lg:inline">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer Image Card */}
      <div className="p-4 m-3 rounded-xl relative overflow-hidden bg-cover bg-center h-32 flex flex-col justify-end border border-museum-gold-lt/30 shadow-inner group">
        <img
          src="/images/museum-building.jpg"
          alt="Bảo tàng Việt Nam"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/50 to-transparent" />
        <div className="relative z-10 text-xs">
          <div className="font-bold text-museum-gold-lt tracking-wide">BẢO TÀNG QUỐC GIA</div>
          <div className="text-gray-300 text-[11px] font-normal">Mở cửa: 08:00 - 17:00</div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Permanent Sidebar */}
      <aside className="hidden md:flex flex-col w-[270px] flex-shrink-0 h-screen sticky top-0 shadow-xl border-r border-museum-brown-dk/40 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
          />
          <div className="fixed top-0 bottom-0 left-0 w-[270px] bg-museum-brown shadow-2xl z-10 animate-slideRight">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};
