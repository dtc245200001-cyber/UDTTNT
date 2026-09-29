import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Landmark,
  Compass,
  Ticket,
  CalendarDays,
  Star,
  Archive,
  Home,
  LogIn,
  UserPlus,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  QrCode,
  BookOpen,
  ChevronDown,
} from 'lucide-react';

export const VisitorHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, logout, bookedTickets } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const moreMenuRef = useRef(null);
  const userMenuRef = useRef(null);

  const userTicketsCount = isAuthenticated
    ? (bookedTickets || []).filter(
        (b) =>
          !currentUser ||
          !b.email ||
          (b.userEmail && b.userEmail.toLowerCase() === currentUser?.email?.toLowerCase()) ||
          (b.email && b.email.toLowerCase() === currentUser?.email?.toLowerCase()) ||
          b.userId === currentUser.id
      ).length
    : 0;

  // Primary nav links (always visible on desktop)
  const primaryLinks = [
    { name: 'Trang chủ', path: '/', icon: Home },
    { name: 'Khám phá hiện vật', path: '/artifacts', icon: Compass },
    { name: 'Chuyên đề', path: '/galleries', icon: BookOpen },
    { name: 'Triển lãm', path: '/exhibitions', icon: Archive },
    { name: 'Sự kiện', path: '/events', icon: CalendarDays },
  ];

  // Secondary nav links (moved to "Thêm" dropdown on compact screens)
  const secondaryLinks = [
    { name: 'Vé tham quan', path: '/tickets', icon: Ticket },
    { name: 'Đánh giá', path: '/visitor-reviews', icon: Star },
  ];

  const allNavLinks = [...primaryLinks, ...secondaryLinks];

  const isLinkActive = (link) => {
    if (link.path === '/') {
      return location.pathname === '/' && (!location.hash || location.hash === '');
    }
    return location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreMenuOpen(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const isAdmin = currentUser?.role === 'admin' || currentUser?.roleLabel?.toLowerCase()?.includes('quản trị') || currentUser?.email?.toLowerCase()?.includes('admin');
  const isStaffOrAdmin = currentUser?.role === 'staff' || isAdmin;

  const navItemBase = (active) =>
    `relative h-8 sm:h-9 px-3.5 rounded-full text-[0.8rem] font-medium transition-all duration-200 flex items-center gap-1.5 select-none cursor-pointer whitespace-nowrap flex-none ${
      active
        ? 'bg-[#8B5A1E] text-white font-bold shadow-sm'
        : 'bg-transparent text-[#2D241E] hover:text-[#8B5A1E] hover:bg-[#F5EFE0]/70'
    }`;

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-stone-200/60 sticky top-0 z-40 shadow-[0_2px_15px_-3px_rgba(92,44,22,0.05)] font-sans">
      {/* ─────────────────────────────────────────────────────────────────────
          DESKTOP HEADER  (viewport ≥ 1100px → hamburger ngưỡng dưới)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="hidden min-[1100px]:flex w-full max-w-[1800px] mx-auto px-6 xl:px-8 h-[4.25rem] items-center justify-between gap-4 overflow-visible box-border">

        {/* 1 ── LOGO: Round dark brown background with gold icon + brown/gold text */}
        <div style={{ flex: '0 1 auto', minWidth: 0, overflow: 'hidden' }} className="flex items-center">
          <Link to="/" className="flex items-center gap-2.5 group min-w-0">
            {/* Round brown icon container */}
            <div className="w-10 h-10 rounded-full bg-[#8B5A1E] group-hover:bg-[#734814] flex items-center justify-center shadow-xs transition-all duration-300 group-hover:scale-105 flex-none">
              <Landmark className="w-5 h-5 text-[#F5E6B3]" />
            </div>
            {/* Text block */}
            <div className="flex flex-col justify-center min-w-0 overflow-hidden">
              <span className="font-extrabold text-[0.88rem] tracking-wide text-[#3E2712] leading-tight group-hover:text-[#8B5A1E] transition-colors whitespace-nowrap overflow-hidden text-ellipsis block">
                BẢO TÀNG QUỐC GIA VIỆT NAM
              </span>
              <span className="text-[0.6rem] font-bold text-[#C59B27] uppercase tracking-widest mt-0.5 whitespace-nowrap">
                DI SẢN VĂN HÓA DÂN TỘC
              </span>
            </div>
          </Link>
        </div>

        {/* 2 ── MENU: Inactive text dark, active pill brown var(--color-[#8B5A1E]) with white text */}
        <nav
          style={{ flex: '1 1 0%', minWidth: 0 }}
          className="flex items-center justify-center overflow-x-auto overflow-y-hidden [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none] gap-1 px-2"
        >
          {/* Primary links – always shown */}
          {primaryLinks.map((link) => {
            const active = isLinkActive(link);
            const Icon = link.icon;
            const isInternal = !link.path.includes('#');
            const cls = navItemBase(active);
            const content = (
              <>
                <Icon className={`w-3.5 h-3.5 flex-none transition-colors ${active ? 'text-white' : 'text-stone-500 group-hover:text-[#8B5A1E]'}`} />
                <span className="hidden min-[1280px]:inline">{link.name}</span>
              </>
            );
            return isInternal ? (
              <Link key={link.name} to={link.path} className={cls}>{content}</Link>
            ) : (
              <a key={link.name} href={link.path} className={cls}>{content}</a>
            );
          })}

          {/* Secondary links – shown inline above 1400px, as dropdown below */}
          <>
            {/* Inline on 1400px+ */}
            {secondaryLinks.map((link) => {
              const active = isLinkActive(link);
              const Icon = link.icon;
              const isInternal = !link.path.includes('#');
              const cls = `hidden min-[1400px]:flex ${navItemBase(active)}`;
              const content = (
                <>
                  <Icon className={`w-3.5 h-3.5 flex-none transition-colors ${active ? 'text-white' : 'text-stone-500 group-hover:text-[#8B5A1E]'}`} />
                  <span>{link.name}</span>
                </>
              );
              return isInternal ? (
                <Link key={link.name} to={link.path} className={cls}>{content}</Link>
              ) : (
                <a key={link.name} href={link.path} className={cls}>{content}</a>
              );
            })}

            {/* "Thêm ▾" dropdown for 1100–1399px */}
            <div ref={moreMenuRef} className="relative min-[1400px]:hidden flex-none">
              <button
                onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className={`h-9 px-3 rounded-full text-[0.78rem] font-medium transition-all duration-200 flex items-center gap-1 select-none cursor-pointer ${
                  moreMenuOpen
                    ? 'bg-[#F5EFE0] text-[#8B5A1E]'
                    : 'bg-transparent text-[#2D241E] hover:text-[#8B5A1E] hover:bg-[#F5EFE0]/60'
                }`}
              >
                <span className="hidden min-[1280px]:inline">Thêm</span>
                <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${moreMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreMenuOpen && (
                <div className="absolute top-full right-0 mt-2 min-w-[9rem] bg-white rounded-2xl border border-stone-200 shadow-xl z-50 py-1 overflow-hidden">
                  {secondaryLinks.map((link) => {
                    const active = isLinkActive(link);
                    const Icon = link.icon;
                    const isInternal = !link.path.includes('#');
                    const cls = `flex items-center gap-2.5 px-4 py-2.5 text-[0.8rem] font-semibold transition-colors ${
                      active
                        ? 'bg-[#8B5A1E] text-white'
                        : 'text-[#2D241E] hover:bg-[#F5EFE0] hover:text-[#8B5A1E]'
                    }`;
                    const content = (
                      <>
                        <Icon className={`w-3.5 h-3.5 flex-none ${active ? 'text-white' : 'text-stone-400'}`} />
                        <span className="whitespace-nowrap">{link.name}</span>
                      </>
                    );
                    return isInternal ? (
                      <Link key={link.name} to={link.path} className={cls} onClick={() => setMoreMenuOpen(false)}>{content}</Link>
                    ) : (
                      <a key={link.name} href={link.path} className={cls} onClick={() => setMoreMenuOpen(false)}>{content}</a>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        </nav>

        {/* 3 ── ACCOUNT AREA: Pill Avatar + "Hello, KHÁCH THAM QUAN" + Dropdown */}
        <div style={{ flex: '0 0 auto' }} className="flex items-center justify-end relative" ref={userMenuRef}>
          <button
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 bg-white pl-1 pr-3 py-1 rounded-full shadow-[0_2px_10px_rgba(0,0,0,0.06)] border border-stone-100 hover:shadow-md transition-all cursor-pointer select-none"
            aria-label="Tài khoản người dùng"
          >
            <img
              src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
              alt={currentUser?.name || 'Khách tham quan'}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full object-cover border border-stone-200/80 flex-none"
            />
            <div className="text-left leading-tight">
              <span className="block text-[10px] text-stone-400 font-normal leading-none">Hello,</span>
              <span className="block font-bold text-[11px] text-[#5B3A1F] uppercase tracking-wide leading-tight mt-0.5 truncate max-w-[140px]">
                {currentUser?.name || 'KHÁCH THAM QUAN'}
              </span>
            </div>
            <ChevronDown className={`w-3.5 h-3.5 text-stone-400 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
          </button>

          {/* User Dropdown Menu */}
          {userMenuOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl border border-stone-100 py-1.5 z-50 animate-fadeIn">
              <div className="px-4 py-2.5 border-b border-stone-100">
                <p className="text-xs font-bold text-[#2D241E] truncate">{currentUser?.name || 'Khách tham quan'}</p>
                <p className="text-[10px] text-stone-400 truncate">{currentUser?.email || (isAuthenticated ? 'Thành viên bảo tàng' : 'Khách vãng lai')}</p>
              </div>

              {isAuthenticated ? (
                <>
                  <Link
                    to="/my-tickets"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center justify-between px-4 py-2.5 text-xs text-stone-700 hover:bg-[#F5EFE0] hover:text-[#8B5A1E] font-medium transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Ticket className="w-4 h-4 text-[#8B5A1E]" />
                      <span>Vé của tôi</span>
                    </div>
                    {userTicketsCount > 0 && (
                      <span className="px-1.5 py-0.2 bg-[#8B5A1E] text-white text-[10px] font-bold rounded-full">
                        {userTicketsCount}
                      </span>
                    )}
                  </Link>

                  {isStaffOrAdmin && (
                    <Link
                      to="/staff/checkin"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-stone-700 hover:bg-[#F5EFE0] hover:text-[#8B5A1E] font-medium transition-colors"
                    >
                      <QrCode className="w-4 h-4 text-[#8B5A1E]" />
                      <span>Soát vé</span>
                    </Link>
                  )}

                  {isAdmin && (
                    <Link
                      to="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-xs text-stone-700 hover:bg-[#F5EFE0] hover:text-[#8B5A1E] font-medium transition-colors"
                    >
                      <LayoutDashboard className="w-4 h-4 text-[#8B5A1E]" />
                      <span>Quản trị</span>
                    </Link>
                  )}

                  <div className="border-t border-stone-100 mt-1 pt-1">
                    <button
                      onClick={() => {
                        setUserMenuOpen(false);
                        logout();
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-xs text-red-600 hover:bg-red-50 font-medium transition-colors cursor-pointer text-left"
                    >
                      <LogOut className="w-4 h-4 text-red-500" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="p-2 space-y-1">
                  <Link
                    to="/login"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-stone-700 hover:bg-[#F5EFE0] hover:text-[#8B5A1E] rounded-xl font-medium"
                  >
                    <LogIn className="w-4 h-4 text-[#8B5A1E]" />
                    <span>Đăng nhập</span>
                  </Link>
                  <Link
                    to="/register"
                    onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs text-white bg-[#8B5A1E] hover:bg-[#734814] rounded-xl font-bold"
                  >
                    <UserPlus className="w-4 h-4 text-amber-200" />
                    <span>Đăng ký tài khoản</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────────────
          MOBILE / COMPACT HEADER  (viewport < 1100px)
      ───────────────────────────────────────────────────────────────────── */}
      <div className="flex min-[1100px]:hidden w-full max-w-[100vw] mx-auto px-4 h-[3.75rem] items-center justify-between gap-3 overflow-hidden box-border">
        {/* Logo compact */}
        <Link to="/" className="flex items-center gap-2 group flex-none">
          <div className="w-8 h-8 rounded-full bg-[#8B5A1E] flex items-center justify-center shadow-xs transition-all duration-300 group-hover:scale-105">
            <Landmark className="w-4 h-4 text-[#F5E6B3]" />
          </div>
          <span className="font-extrabold text-[0.82rem] tracking-wider text-[#3E2712] leading-tight group-hover:text-[#8B5A1E] transition-colors hidden sm:block whitespace-nowrap">
            BẢO TÀNG QUỐC GIA
          </span>
        </Link>

        {/* Hamburger */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 text-[#8B5A1E] hover:bg-[#F5EFE0] rounded-xl transition-colors cursor-pointer border border-stone-200 flex-none"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile drawer */}
      {mobileMenuOpen && (
        <div className="min-[1100px]:hidden bg-white/98 backdrop-blur-md border-b border-stone-200 px-4 py-4 space-y-3 shadow-lg">
          <div className="flex flex-col gap-1.5">
            {allNavLinks.map((link) => {
              const active = isLinkActive(link);
              const Icon = link.icon;
              const isInternal = !link.path.includes('#');
              const cls = `px-4 py-2 rounded-full transition-all flex items-center justify-between text-[0.8rem] font-semibold ${
                active
                  ? 'bg-[#8B5A1E] text-white shadow-xs'
                  : 'hover:bg-[#F5EFE0] hover:text-[#8B5A1E] text-[#2D241E]'
              }`;
              const content = (
                <>
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-stone-400'}`} />
                    <span>{link.name}</span>
                  </div>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-white flex-none" />}
                </>
              );
              return isInternal ? (
                <Link key={link.name} to={link.path} onClick={() => setMobileMenuOpen(false)} className={cls}>{content}</Link>
              ) : (
                <a key={link.name} href={link.path} onClick={() => setMobileMenuOpen(false)} className={cls}>{content}</a>
              );
            })}
          </div>

          <div className="pt-3 border-t border-amber-900/10">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2.5 bg-museum-cream/60 rounded-xl border border-museum-gold/30">
                  <img
                    src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={currentUser?.name}
                    className="w-9 h-9 rounded-xl object-cover border border-museum-gold flex-none"
                  />
                  <div>
                    <div className="font-bold text-xs text-museum-brown">{currentUser?.name}</div>
                    <div className="text-[0.625rem] text-museum-gold font-bold uppercase tracking-wider">
                      {currentUser?.roleLabel || currentUser?.role}
                    </div>
                  </div>
                </div>

                <Link
                  to="/my-tickets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-4 bg-white border border-museum-gold/40 rounded-xl text-museum-brown text-xs font-bold flex items-center justify-between shadow-2xs"
                >
                  <span className="flex items-center gap-2"><Ticket className="w-4 h-4 text-museum-gold" />Vé tham quan của tôi</span>
                  {userTicketsCount > 0 && <span className="px-2 py-0.5 bg-museum-gold text-white text-[0.625rem] font-black rounded-full">{userTicketsCount}</span>}
                </Link>

                {isStaffOrAdmin && (
                  <Link to="/staff/checkin" onClick={() => setMobileMenuOpen(false)} className="block w-full py-2.5 text-center bg-amber-700 text-white text-xs font-bold rounded-xl">
                    Cổng Soát Vé Quầy
                  </Link>
                )}

                {isAdmin && (
                  <Link to="/dashboard" onClick={() => setMobileMenuOpen(false)} className="block w-full py-2.5 text-center bg-museum-gold text-white text-xs font-bold rounded-xl">
                    Vào Trang Quản trị
                  </Link>
                )}

                <button
                  onClick={() => { logout(); setMobileMenuOpen(false); }}
                  className="w-full py-2 text-center text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link to="/login" onClick={() => setMobileMenuOpen(false)} className="h-10 px-3 text-center text-xs font-bold text-museum-brown bg-transparent border border-museum-gold/50 rounded-xl flex items-center justify-center gap-2">
                  <LogIn className="w-4 h-4 text-museum-gold flex-none" />
                  <span>Đăng nhập</span>
                </Link>
                <Link to="/register" onClick={() => setMobileMenuOpen(false)} className="h-10 px-3 text-center text-xs font-bold text-white bg-gradient-to-r from-museum-gold to-amber-600 rounded-xl shadow-xs flex items-center justify-center gap-2">
                  <UserPlus className="w-4 h-4 text-amber-100 flex-none" />
                  <span>Đăng ký</span>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
