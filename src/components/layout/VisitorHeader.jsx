import React, { useState } from 'react';
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
} from 'lucide-react';

export const VisitorHeader = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { currentUser, isAuthenticated, logout, bookedTickets } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  const navLinks = [
    { name: 'Trang chủ', path: '/', icon: Home },
    { name: 'Khám phá hiện vật', path: '/artifacts', icon: Compass },
    { name: 'Chuyên đề', path: '/galleries', icon: BookOpen },
    { name: 'Triển lãm', path: '/exhibitions', icon: Archive },
    { name: 'Sự kiện', path: '/events', icon: CalendarDays },
    { name: 'Vé tham quan', path: '/#tickets', icon: Ticket },
    { name: 'Đánh giá', path: '/visitor-reviews', icon: Star },
  ];

  const isLinkActive = (link) => {
    if (link.path === '/') {
      return location.pathname === '/' && (!location.hash || location.hash === '');
    }
    if (link.path.includes('#tickets')) {
      return location.hash === '#tickets';
    }
    return location.pathname === link.path || (link.path !== '/' && location.pathname.startsWith(link.path));
  };

  return (
    <header className="bg-white/95 backdrop-blur-md border-b border-amber-900/10 sticky top-0 z-40 shadow-[0_2px_15px_-3px_rgba(92,44,22,0.05)] font-sans transition-all">
      <div className="w-full max-w-full lg:max-w-[1500px] mx-auto px-3 sm:px-5 lg:px-6 xl:px-8 h-[74px] flex items-center justify-between gap-2 lg:gap-4 box-border">
        
        {/* 1. KHU VỰC LOGO BÊN TRÁI */}
        <div className="flex items-center shrink-0 min-w-0">
          <Link to="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 lg:w-10 lg:h-10 rounded-xl bg-gradient-to-br from-museum-brown to-museum-brown-dk group-hover:shadow-md flex items-center justify-center text-museum-gold border border-museum-gold/30 shadow-xs transition-all duration-300 group-hover:scale-105 shrink-0">
              <Landmark className="w-4 h-4 lg:w-5 lg:h-5 text-museum-gold" />
            </div>
            <div className="flex flex-col justify-center">
              <div className="font-black text-xs sm:text-sm lg:text-[14px] xl:text-[15px] tracking-wider text-museum-brown leading-tight group-hover:text-museum-gold transition-colors whitespace-nowrap">
                BẢO TÀNG QUỐC GIA VIỆT NAM
              </div>
              <div className="text-[8.5px] lg:text-[9.5px] font-bold text-museum-gold uppercase tracking-widest mt-0.5 whitespace-nowrap">
                DI SẢN VĂN HÓA DÂN TỘC
              </div>
            </div>
          </Link>
        </div>

        {/* 2. KHU VỰC MENU Ở GIỮA (flex: 1, min-width: 0 chống tràn) */}
        <nav className="hidden lg:flex items-center justify-center flex-1 min-w-0 gap-0.5 xl:gap-1.5 2xl:gap-2 px-1">
          {navLinks.map((link) => {
            const active = isLinkActive(link);
            const Icon = link.icon;
            const isInternal = link.path.startsWith('/') && !link.path.includes('#');

            const buttonContent = (
              <>
                <Icon
                  className={`w-3.5 h-3.5 xl:w-4 xl:h-4 transition-colors duration-200 shrink-0 ${
                    active
                      ? 'text-museum-gold'
                      : 'text-stone-500 group-hover:text-museum-gold'
                  }`}
                />
                <span className="whitespace-nowrap">{link.name}</span>
                {/* Subtle active indicator bar */}
                {active && (
                  <span className="absolute bottom-1 left-2.5 right-2.5 h-0.5 bg-museum-gold rounded-full" />
                )}
              </>
            );

            const baseClasses = `relative h-9 xl:h-10 px-2 xl:px-3 2xl:px-3.5 rounded-xl text-[11.5px] xl:text-[12.5px] 2xl:text-[13px] font-semibold transition-all duration-200 flex items-center justify-center gap-1 xl:gap-1.5 group select-none cursor-pointer whitespace-nowrap shrink-0 ${
              active
                ? 'bg-museum-cream/90 text-museum-brown font-bold border border-museum-gold/40 shadow-2xs'
                : 'bg-transparent text-stone-700 hover:text-museum-brown hover:bg-museum-cream/60 hover:-translate-y-0.5'
            }`;

            return isInternal ? (
              <Link key={link.name} to={link.path} className={baseClasses}>
                {buttonContent}
              </Link>
            ) : (
              <a key={link.name} href={link.path} className={baseClasses}>
                {buttonContent}
              </a>
            );
          })}
        </nav>

        {/* 3. KHU VỰC TÀI KHOẢN BÊN PHẢI (flex-shrink: 0, gap: 12px, luôn nằm trong màn hình) */}
        <div className="hidden md:flex items-center justify-end shrink-0">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 bg-museum-cream/50 p-1 pr-2 rounded-2xl border border-museum-gold/30 shadow-2xs h-10">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={currentUser?.name}
                className="w-7 h-7 rounded-lg object-cover border border-museum-gold shadow-2xs"
              />
              <div className="text-left leading-tight pr-1 hidden xl:block">
                <div className="font-bold text-[11px] text-museum-brown truncate max-w-[100px]">
                  {currentUser?.name}
                </div>
                <div className="text-[8.5px] text-museum-gold font-bold uppercase tracking-wider">
                  {currentUser?.roleLabel || currentUser?.role}
                </div>
              </div>

              {/* My Tickets Button */}
              <Link
                to="/my-tickets"
                className="h-7 px-2.5 bg-white hover:bg-museum-cream text-museum-brown text-[11px] font-bold rounded-lg border border-museum-gold/40 transition-all flex items-center gap-1 shadow-2xs hover:-translate-y-0.5"
                title="Xem vé đã đặt"
              >
                <Ticket className="w-3 h-3 text-museum-gold" />
                <span className="hidden sm:inline">Vé của tôi</span>
                {userTicketsCount > 0 && (
                  <span className="ml-0.5 px-1 py-0.2 bg-museum-gold text-white text-[9px] font-black rounded-full">
                    {userTicketsCount}
                  </span>
                )}
              </Link>

              {/* Staff Check-in link if user is staff or admin */}
              {(currentUser?.role === 'staff' || currentUser?.role === 'admin' || currentUser?.roleLabel?.toLowerCase()?.includes('quản trị') || currentUser?.email?.toLowerCase()?.includes('admin')) && (
                <Link
                  to="/staff/checkin"
                  className="h-7 px-2.5 bg-amber-700 hover:bg-amber-800 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs hover:-translate-y-0.5"
                  title="Cổng soát vé & thu tiền tại quầy"
                >
                  <QrCode className="w-3 h-3 text-amber-200" />
                  <span>Soát vé</span>
                </Link>
              )}

              {/* Admin Dashboard link if user is admin */}
              {(currentUser?.role === 'admin' || currentUser?.roleLabel?.toLowerCase()?.includes('quản trị') || currentUser?.email?.toLowerCase()?.includes('admin')) && (
                <Link
                  to="/dashboard"
                  className="h-7 px-2.5 bg-museum-gold hover:bg-museum-gold-lt text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-2xs hover:-translate-y-0.5"
                >
                  <LayoutDashboard className="w-3 h-3" />
                  <span>Quản trị</span>
                </Link>
              )}

              <button
                onClick={logout}
                className="p-1 text-stone-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 shrink-0 whitespace-nowrap">
              {/* Login Button (Refined Outline Style) */}
              <Link
                to="/login"
                className="h-9 xl:h-10 px-3.5 xl:px-4.5 text-xs xl:text-[13px] font-bold text-museum-brown bg-transparent hover:bg-museum-cream/80 border border-museum-gold/50 rounded-xl transition-all duration-200 flex items-center justify-center gap-1.5 hover:-translate-y-0.5 cursor-pointer select-none whitespace-nowrap shrink-0"
              >
                <LogIn className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-museum-gold shrink-0" />
                <span className="whitespace-nowrap">Đăng nhập</span>
              </Link>

              {/* Register Button (Primary CTA Button) */}
              <Link
                to="/register"
                className="h-9 xl:h-10 px-4 xl:px-5 text-xs xl:text-[13px] font-bold text-white bg-gradient-to-r from-museum-gold to-amber-600 hover:from-museum-gold-lt hover:to-amber-500 rounded-xl shadow-xs hover:shadow-md transition-all duration-200 flex items-center justify-center gap-1.5 hover:-translate-y-0.5 cursor-pointer select-none whitespace-nowrap shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5 xl:w-4 xl:h-4 text-amber-100 shrink-0" />
                <span className="whitespace-nowrap">Đăng ký</span>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-museum-brown hover:bg-museum-cream rounded-xl transition-colors cursor-pointer border border-museum-gold/30 shrink-0"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white/98 backdrop-blur-md border-b border-amber-900/10 px-4 py-4 space-y-3 shadow-lg animate-fadeIn">
          <div className="flex flex-col gap-1.5 text-xs font-semibold text-stone-700">
            {navLinks.map((link) => {
              const active = isLinkActive(link);
              const Icon = link.icon;
              const isInternal = link.path.startsWith('/') && !link.path.includes('#');

              const content = (
                <>
                  <div className="flex items-center gap-2.5">
                    <Icon className={`w-4 h-4 ${active ? 'text-museum-gold' : 'text-stone-400'}`} />
                    <span>{link.name}</span>
                  </div>
                  {active && <span className="w-1.5 h-1.5 rounded-full bg-museum-gold" />}
                </>
              );

              const mobileClasses = `px-3.5 py-2.5 rounded-xl transition-all flex items-center justify-between ${
                active
                  ? 'bg-museum-cream text-museum-brown font-bold border border-museum-gold/40'
                  : 'hover:bg-museum-cream/60 hover:text-museum-brown text-stone-700'
              }`;

              return isInternal ? (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileClasses}
                >
                  {content}
                </Link>
              ) : (
                <a
                  key={link.name}
                  href={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className={mobileClasses}
                >
                  {content}
                </a>
              );
            })}
          </div>

          <div className="pt-3 border-t border-gray-100">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2.5 bg-museum-cream/60 rounded-xl border border-museum-gold/30">
                  <img
                    src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={currentUser?.name}
                    className="w-9 h-9 rounded-xl object-cover border border-museum-gold"
                  />
                  <div>
                    <div className="font-bold text-xs text-museum-brown">{currentUser?.name}</div>
                    <div className="text-[10px] text-museum-gold font-bold uppercase tracking-wider">
                      {currentUser?.roleLabel || currentUser?.role}
                    </div>
                  </div>
                </div>

                <Link
                  to="/my-tickets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-4 bg-white border border-museum-gold/40 rounded-xl text-museum-brown text-xs font-bold flex items-center justify-between shadow-2xs"
                >
                  <span className="flex items-center gap-2">
                    <Ticket className="w-4 h-4 text-museum-gold" />
                    Vé tham quan của tôi
                  </span>
                  {userTicketsCount > 0 && (
                    <span className="px-2 py-0.5 bg-museum-gold text-white text-[10px] font-black rounded-full">
                      {userTicketsCount}
                    </span>
                  )}
                </Link>

                {(currentUser?.role === 'staff' || currentUser?.role === 'admin' || currentUser?.roleLabel?.toLowerCase()?.includes('quản trị') || currentUser?.email?.toLowerCase()?.includes('admin')) && (
                  <Link
                    to="/staff/checkin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-2.5 text-center bg-amber-700 text-white text-xs font-bold rounded-xl shadow-2xs"
                  >
                    Cổng Soát Vé Quầy
                  </Link>
                )}

                {(currentUser?.role === 'admin' || currentUser?.roleLabel?.toLowerCase()?.includes('quản trị') || currentUser?.email?.toLowerCase()?.includes('admin')) && (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-2.5 text-center bg-museum-gold text-white text-xs font-bold rounded-xl shadow-2xs"
                  >
                    Vào Trang Quản trị
                  </Link>
                )}

                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2 text-center text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Đăng xuất</span>
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2.5">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-10 px-3 text-center text-xs font-bold text-museum-brown bg-transparent border border-museum-gold/50 rounded-xl flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <LogIn className="w-4 h-4 text-museum-gold shrink-0" />
                  <span>Đăng nhập</span>
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="h-10 px-3 text-center text-xs font-bold text-white bg-gradient-to-r from-museum-gold to-amber-600 rounded-xl shadow-xs flex items-center justify-center gap-2 whitespace-nowrap"
                >
                  <UserPlus className="w-4 h-4 text-amber-100 shrink-0" />
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
