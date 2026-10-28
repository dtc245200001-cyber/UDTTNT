import React from 'react';
import { NavLink } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Home,
  Landmark,
  FolderTree,
  Star,
  Archive,
  CalendarDays,
  Ticket,
  QrCode,
  Users,
  FileText,
  X,
} from 'lucide-react';

const VaseIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 3h6v2l-1 2c0 2 3 3 3 7a5 5 0 0 1-10 0c0-4 3-5 3-7L9 5V3z" />
    <path d="M8.5 14h7" />
  </svg>
);

const CategoryIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="7" width="12" height="12" rx="2" />
    <path d="M7 7V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-2" />
    <line x1="7" y1="13" x2="11" y2="13" />
  </svg>
);

const TicketNavIcon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2z" />
    <path d="M9 12h6" />
  </svg>
);

export const navItems = [
  { name: 'Tổng quan', icon: Home, path: '/dashboard' },
  { name: 'Hiện vật', icon: VaseIcon, path: '/artifacts' },
  { name: 'Chuyên đề nổi bật', icon: Star, path: '/galleries' },
  { name: 'Triển lãm', icon: Archive, path: '/exhibitions' },
  { name: 'Sự kiện', icon: CalendarDays, path: '/events' },
  { name: 'Vé tham quan', icon: TicketNavIcon, path: '/tickets' },
  { name: 'Soát vé Quầy', icon: QrCode, path: '/staff/checkin' },
  { name: 'Người dùng', icon: Users, path: '/users' },
  { name: 'Bài viết', icon: FileText, path: '/articles' },
  { name: 'Đánh giá', icon: FileText, path: '/reviews' },
];

export const Sidebar = () => {
  const { isMobileSidebarOpen, setIsMobileSidebarOpen } = useApp();

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#1C0F08] text-white select-none">
      {/* Brand Header */}
      <div className="flex items-center justify-between px-5 py-5 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D8A452] to-[#A36C18] flex items-center justify-center text-white shadow-md flex-shrink-0">
            <Landmark className="w-5 h-5 text-white" />
          </div>
          <div className="leading-tight">
            <div className="font-extrabold text-[13px] tracking-wider text-white">BẢO TÀNG QUỐC GIA</div>
            <div className="font-bold text-[9.5px] tracking-[0.2em] text-[#D8A452] uppercase">VIỆT NAM</div>
          </div>
        </div>
        {/* Close button for Mobile Drawer */}
        <button
          onClick={() => setIsMobileSidebarOpen(false)}
          className="lg:hidden p-1 text-gray-400 hover:text-white rounded-lg"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Navigation List */}
      <div className="flex-1 overflow-y-auto py-3.5 px-3 space-y-1 scrollbar-thin scrollbar-thumb-white/10">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsMobileSidebarOpen(false)}
              className={({ isActive }) =>
                `relative flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-[13px] transition-all duration-150 group ${
                  isActive
                    ? 'bg-gradient-to-r from-[#D8A452] to-[#B88128] text-[#1A0E07] font-bold shadow-md'
                    : 'text-[#E8DDD1]/85 hover:bg-white/5 hover:text-white font-medium'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon
                    className={`w-[18px] h-[18px] flex-shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-[#1A0E07]' : 'text-[#D8A452]'
                    }`}
                  />
                  <span className="truncate">{item.name}</span>
                </>
              )}
            </NavLink>
          );
        })}
      </div>

      {/* Footer Image Card */}
      <div className="p-3.5 m-3 rounded-2xl relative overflow-hidden h-28 flex flex-col justify-end border border-white/10 shadow-lg group">
        <img
          src="/images/museum-building.jpg"
          alt="Bảo tàng Việt Nam"
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent" />
        <div className="relative z-10 flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-[#D8A452]/20 border border-[#D8A452]/60 flex items-center justify-center flex-shrink-0">
            <Landmark className="w-3 h-3 text-[#D8A452]" />
          </div>
          <div className="leading-tight">
            <div className="font-bold text-white text-[11px] tracking-wide">BẢO TÀNG QUỐC GIA</div>
            <div className="text-stone-300 text-[10px] font-normal italic">Nơi lưu giữ hồn cốt dân tộc</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop & Tablet Permanent Sidebar */}
      <aside className="hidden md:flex flex-col w-[250px] flex-shrink-0 h-screen sticky top-0 shadow-2xl border-r border-black/30 z-30">
        {sidebarContent}
      </aside>

      {/* Mobile Drawer Overlay */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            onClick={() => setIsMobileSidebarOpen(false)}
            className="fixed inset-0 bg-black/70 backdrop-blur-xs transition-opacity"
          />
          <div className="fixed top-0 bottom-0 left-0 w-[250px] bg-[#1C0F08] shadow-2xl z-10 animate-slideRight">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
};

