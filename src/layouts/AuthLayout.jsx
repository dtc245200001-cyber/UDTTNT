import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { Landmark, ArrowLeft } from 'lucide-react';
import { ToastContainer } from '@/components/ui/Toast';

export const AuthLayout = () => {
  return (
    <div className="min-h-screen flex bg-museum-ivory text-gray-800 font-sans antialiased">
      {/* Left Column: Heritage Illustration (Desktop only) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-museum-brown p-12 flex-col justify-between select-none">
        <img
          src="/images/museum-hero.jpg"
          alt="Bảo tàng Việt Nam"
          className="absolute inset-0 w-full h-full object-cover opacity-35 filter brightness-90 contrast-110"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-museum-brown-dk/95 via-museum-brown/70 to-transparent" />

        {/* Brand Header */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-museum-gold flex items-center justify-center text-white shadow-lg">
            <Landmark className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-widest text-white">BẢO TÀNG VIỆT NAM</h1>
            <p className="text-xs font-semibold text-museum-gold-lt uppercase tracking-widest">
              Hệ Thống Quản Lý & Khám Phá Di Sản
            </p>
          </div>
        </div>

        {/* Slogan */}
        <div className="relative z-10 space-y-4 max-w-lg">
          <blockquote className="text-2xl font-extrabold text-white leading-snug tracking-wide">
            "Lưu Giữ & Tôn Vinh Hàng Nghìn Năm Di Sản Văn Hóa Dân Tộc Việt Nam"
          </blockquote>
          <p className="text-sm text-museum-cream/80 leading-relaxed font-normal">
            Trải nghiệm không gian khám phá di sản tích hợp Trợ lý Trí tuệ Nhân tạo thông minh, hỗ trợ tra cứu hiện vật và kết nối văn hóa 24/7.
          </p>
        </div>

        {/* Footer info */}
        <div className="relative z-10 text-xs text-museum-gold-lt/80 font-medium">
          © 2026 Bảo Tàng Quốc Gia Việt Nam. Tất cả quyền được bảo lưu.
        </div>
      </div>

      {/* Right Column: Auth Form Area */}
      <div className="w-full lg:w-1/2 flex flex-col justify-between p-6 sm:p-12 overflow-y-auto">
        <div className="flex items-center justify-between">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-xs font-bold text-museum-brown hover:text-museum-gold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Về trang chủ công khai</span>
          </Link>
          <div className="lg:hidden flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-museum-gold flex items-center justify-center text-white shadow-xs">
              <Landmark className="w-5 h-5" />
            </div>
            <span className="font-extrabold text-sm text-museum-brown tracking-wider">BẢO TÀNG VIỆT NAM</span>
          </div>
        </div>

        <div className="my-auto py-8 max-w-md w-full mx-auto space-y-6">
          <Outlet />
        </div>

        <div className="text-center text-xs text-gray-400 font-medium">
          Hệ thống bảo mật bởi mã hóa 256-bit chuẩn quốc gia.
        </div>
      </div>

      <ToastContainer />
    </div>
  );
};
