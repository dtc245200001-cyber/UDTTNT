import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Landmark,
  Compass,
  Ticket,
  Bot,
  User,
  LogOut,
  LayoutDashboard,
  Menu,
  X,
  Sparkles,
  MessageSquareHeart,
} from 'lucide-react';

export const VisitorHeader = () => {
  const navigate = useNavigate();
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
    { name: 'Trang chủ', path: '/' },
    { name: 'Khám phá hiện vật', path: '/artifacts' },
    { name: 'Triển lãm', path: '/exhibitions' },
    { name: 'Sự kiện', path: '/events' },
    { name: 'Vé tham quan', path: '/#tickets' },
    { name: 'Trợ lý AI', path: '/ai-assistant' },
    { name: 'Đánh giá', path: '/visitor-reviews' },
  ];

  return (
    <header className="bg-white border-b border-gray-200/80 sticky top-0 z-40 shadow-xs font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-11 h-11 rounded-2xl bg-museum-brown group-hover:bg-museum-brown-dk flex items-center justify-center text-museum-gold shadow-md transition-colors">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <div className="font-black text-base tracking-wider text-museum-brown leading-tight">
              BẢO TÀNG QUỐC GIA VIỆT NAM
            </div>
            <div className="text-[11px] font-semibold text-museum-gold uppercase tracking-widest">
              DI SẢN VĂN HÓA DÂN TỘC
            </div>
          </div>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-5 text-xs sm:text-sm font-bold text-gray-700">
          {navLinks.map((link) => {
            const isInternal = link.path.startsWith('/') && !link.path.includes('#');
            return isInternal ? (
              <Link
                key={link.name}
                to={link.path}
                className="hover:text-museum-gold transition-colors py-1 relative group flex items-center gap-1"
              >
                {link.name === 'Khám phá hiện vật' && (
                  <Compass className="w-3.5 h-3.5 text-museum-gold inline" />
                )}
                <span>{link.name}</span>
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-museum-gold transition-all duration-200 group-hover:w-full" />
              </Link>
            ) : (
              <a
                key={link.name}
                href={link.path}
                className="hover:text-museum-gold transition-colors py-1 relative group"
              >
                {link.name}
                <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-museum-gold transition-all duration-200 group-hover:w-full" />
              </a>
            );
          })}
        </nav>

        {/* Right Auth / Profile / Ticket Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-2 bg-museum-cream/60 p-1.5 pr-3 rounded-full border border-museum-gold/30">
              <img
                src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                alt={currentUser?.name}
                className="w-9 h-9 rounded-full object-cover border-2 border-museum-gold shadow-xs"
              />
              <div className="text-left leading-tight">
                <div className="font-bold text-xs text-museum-brown">{currentUser?.name}</div>
                <div className="text-[10px] text-museum-gold font-semibold uppercase">
                  {currentUser?.roleLabel || currentUser?.role}
                </div>
              </div>

              {/* My Tickets Button */}
              <Link
                to="/my-tickets"
                className="px-3 py-1 bg-white hover:bg-museum-cream text-museum-brown text-xs font-bold rounded-full border border-museum-gold/40 transition-colors flex items-center gap-1 shadow-xs ml-1"
                title="Xem vé đã đặt"
              >
                <Ticket className="w-3.5 h-3.5 text-museum-gold" />
                <span>Vé của tôi</span>
                {userTicketsCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.2 bg-museum-gold text-white text-[10px] font-black rounded-full">
                    {userTicketsCount}
                  </span>
                )}
              </Link>

              {/* Admin Dashboard link if user is admin */}
              {currentUser?.role === 'admin' && (
                <Link
                  to="/dashboard"
                  className="px-3 py-1 bg-museum-gold hover:bg-museum-gold-lt text-white text-xs font-bold rounded-full transition-colors flex items-center gap-1 shadow-xs"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Quản trị</span>
                </Link>
              )}

              <button
                onClick={logout}
                className="p-1.5 text-gray-500 hover:text-red-600 rounded-full hover:bg-red-50 transition-colors cursor-pointer"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 text-xs font-bold text-museum-brown hover:text-museum-gold transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-5 py-2 bg-museum-gold hover:bg-museum-gold-lt text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="lg:hidden p-2 text-museum-brown hover:bg-museum-cream rounded-xl transition-colors cursor-pointer"
          aria-label="Toggle Menu"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-3 animate-fadeIn">
          <div className="flex flex-col gap-2 font-bold text-sm text-gray-700">
            {navLinks.map((link) => {
              const isInternal = link.path.startsWith('/') && !link.path.includes('#');
              return isInternal ? (
                <Link
                  key={link.name}
                  to={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-museum-cream hover:text-museum-brown transition-colors flex items-center justify-between"
                >
                  <span>{link.name}</span>
                  {link.name === 'Khám phá hiện vật' && <Compass className="w-4 h-4 text-museum-gold" />}
                </Link>
              ) : (
                <a
                  key={link.name}
                  href={link.path}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 rounded-lg hover:bg-museum-cream hover:text-museum-brown transition-colors"
                >
                  {link.name}
                </a>
              );
            })}
          </div>

          <div className="pt-3 border-t border-gray-200">
            {isAuthenticated ? (
              <div className="space-y-2">
                <div className="flex items-center gap-3 p-2 bg-museum-cream/60 rounded-xl">
                  <img
                    src={currentUser?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'}
                    alt={currentUser?.name}
                    className="w-10 h-10 rounded-full object-cover border-2 border-museum-gold"
                  />
                  <div>
                    <div className="font-bold text-sm text-museum-brown">{currentUser?.name}</div>
                    <div className="text-xs text-museum-gold font-semibold uppercase">
                      {currentUser?.roleLabel || currentUser?.role}
                    </div>
                  </div>
                </div>

                <Link
                  to="/my-tickets"
                  onClick={() => setMobileMenuOpen(false)}
                  className="w-full py-2.5 px-4 bg-white border border-museum-gold/30 rounded-xl text-museum-brown text-xs font-bold flex items-center justify-between shadow-xs"
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

                {currentUser?.role === 'admin' && (
                  <Link
                    to="/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block w-full py-2.5 text-center bg-museum-gold text-white text-xs font-bold rounded-xl shadow-xs"
                  >
                    Vào Trang Quản trị
                  </Link>
                )}

                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full py-2.5 text-center text-red-600 hover:bg-red-50 text-xs font-bold rounded-xl transition-colors"
                >
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center text-xs font-bold text-museum-brown bg-museum-cream/60 rounded-xl"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2.5 text-center text-xs font-bold text-white bg-museum-gold rounded-xl shadow-xs"
                >
                  Đăng ký
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
};
