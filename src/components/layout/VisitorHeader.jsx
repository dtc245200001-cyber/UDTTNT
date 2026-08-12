import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Landmark,
  Menu,
  X,
  LogIn,
  UserPlus,
  LogOut,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

export const VisitorHeader = () => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, logout } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { name: 'Trang chủ', href: '#hero' },
    { name: 'Hiện vật nổi bật', href: '#artifacts' },
    { name: 'Triển lãm', href: '#exhibitions' },
    { name: 'Sự kiện', href: '#events' },
    { name: 'Vé tham quan', href: '#tickets' },
    { name: 'Bài viết', href: '#articles' },
  ];

  return (
    <header className="bg-white border-b border-gray-200/80 sticky top-0 z-40 shadow-xs">
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

        {/* Desktop Horizontal Navigation Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-sm font-bold text-gray-700">
          {navLinks.map((link) => (
            <a
              key={link.name}
              href={link.href}
              className="hover:text-museum-gold transition-colors py-1 relative group"
            >
              {link.name}
              <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-museum-gold transition-all duration-200 group-hover:w-full" />
            </a>
          ))}
        </nav>

        {/* Right Auth / Profile Buttons */}
        <div className="hidden md:flex items-center gap-3">
          {isAuthenticated ? (
            <div className="flex items-center gap-3 bg-museum-cream/60 p-1.5 pr-3 rounded-full border border-museum-gold/30">
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

              {/* Admin Jump Button */}
              {currentUser?.role === 'admin' && (
                <button
                  onClick={() => navigate('/dashboard')}
                  className="px-3 py-1 bg-museum-gold text-white text-xs font-bold rounded-full hover:bg-museum-gold-lt transition-colors flex items-center gap-1 shadow-xs ml-1"
                  title="Chuyển tới Trang Quản trị Dashboard"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span>Admin &rarr;</span>
                </button>
              )}

              <button
                onClick={logout}
                className="p-1.5 text-gray-400 hover:text-danger hover:bg-rose-50 rounded-full transition-colors ml-1"
                title="Đăng xuất"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 border border-museum-brown text-museum-brown font-bold text-xs rounded-xl hover:bg-museum-cream transition-colors"
              >
                <LogIn className="w-4 h-4 inline mr-1.5" />
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-xs transition-colors"
              >
                <UserPlus className="w-4 h-4 inline mr-1.5" />
                Đăng ký
              </Link>
            </div>
          )}
        </div>

        {/* Mobile Hamburger Toggle */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 text-museum-brown hover:bg-museum-cream rounded-xl transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-4 space-y-3 animate-fadeIn">
          <div className="flex flex-col gap-2 font-bold text-sm text-gray-700">
            {navLinks.map((link) => (
              <a
                key={link.name}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 rounded-lg hover:bg-museum-cream hover:text-museum-brown transition-colors"
              >
                {link.name}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-gray-100 flex flex-col gap-2">
            {isAuthenticated ? (
              <div className="flex items-center justify-between p-2 bg-museum-cream rounded-xl">
                <div className="flex items-center gap-2">
                  <img
                    src={currentUser?.avatar}
                    alt={currentUser?.name}
                    className="w-8 h-8 rounded-full object-cover"
                  />
                  <div>
                    <div className="font-bold text-xs text-museum-brown">{currentUser?.name}</div>
                    <div className="text-[10px] text-gray-500">{currentUser?.roleLabel}</div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {currentUser?.role === 'admin' && (
                    <button
                      onClick={() => navigate('/dashboard')}
                      className="px-2.5 py-1 bg-museum-gold text-white text-xs font-bold rounded-lg"
                    >
                      Admin
                    </button>
                  )}
                  <button
                    onClick={logout}
                    className="p-1.5 text-danger hover:bg-rose-50 rounded-lg"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 pt-1">
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-center border border-museum-brown text-museum-brown font-bold text-xs rounded-xl"
                >
                  Đăng nhập
                </Link>
                <Link
                  to="/register"
                  onClick={() => setMobileMenuOpen(false)}
                  className="py-2 text-center bg-museum-brown text-white font-bold text-xs rounded-xl"
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
