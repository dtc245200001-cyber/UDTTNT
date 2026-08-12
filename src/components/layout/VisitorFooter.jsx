import React from 'react';
import { Landmark, MapPin, Phone, Mail, Clock } from 'lucide-react';

export const VisitorFooter = () => {
  return (
    <footer className="bg-museum-brown text-museum-cream border-t border-museum-brown-dk select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 grid grid-cols-1 md:grid-cols-4 gap-8">
        {/* Brand Col */}
        <div className="space-y-4 md:col-span-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-museum-gold flex items-center justify-center text-white">
              <Landmark className="w-6 h-6" />
            </div>
            <div>
              <div className="font-extrabold text-base text-white tracking-wider">BẢO TÀNG</div>
              <div className="font-semibold text-xs text-museum-gold-lt uppercase tracking-widest">
                VIỆT NAM
              </div>
            </div>
          </div>
          <p className="text-xs text-museum-cream/80 leading-relaxed">
            Nơi lưu giữ, trưng bày và tôn vinh hơn 100.000 hiện vật lịch sử văn hóa vô giá của dân tộc Việt Nam qua các thời kỳ.
          </p>
        </div>

        {/* Contact info */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-museum-gold uppercase tracking-wider">Thông tin liên hệ</h4>
          <ul className="space-y-2 text-xs text-museum-cream/80">
            <li className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-museum-gold flex-shrink-0" />
              <span>Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội</span>
            </li>
            <li className="flex items-center gap-2">
              <Phone className="w-4 h-4 text-museum-gold flex-shrink-0" />
              <span>(024) 3825 3557</span>
            </li>
            <li className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-museum-gold flex-shrink-0" />
              <span>info@baotang.gov.vn</span>
            </li>
          </ul>
        </div>

        {/* Operating Hours */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-museum-gold uppercase tracking-wider">Giờ phục vụ</h4>
          <ul className="space-y-2 text-xs text-museum-cream/80">
            <li className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-museum-gold flex-shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block">Thứ Ba - Chủ Nhật</strong>
                <span>Sáng: 08:00 - 12:00</span>
                <span className="block">Chiều: 13:30 - 17:00</span>
              </div>
            </li>
            <li className="text-amber-300 font-medium">Bảo tàng đóng cửa bảo trì vào Thứ Hai hàng tuần.</li>
          </ul>
        </div>

        {/* Quick Links */}
        <div className="space-y-3">
          <h4 className="font-bold text-sm text-museum-gold uppercase tracking-wider">Khám phá di sản</h4>
          <ul className="space-y-1.5 text-xs text-museum-cream/80">
            <li><a href="#artifacts" className="hover:text-museum-gold-lt transition-colors">Bộ sưu tập Hiện vật cổ</a></li>
            <li><a href="#exhibitions" className="hover:text-museum-gold-lt transition-colors">Triển lãm chuyên đề</a></li>
            <li><a href="#events" className="hover:text-museum-gold-lt transition-colors">Sự kiện & Tọa đàm văn hóa</a></li>
            <li><a href="#tickets" className="hover:text-museum-gold-lt transition-colors">Đặt vé tham quan trực tuyến</a></li>
          </ul>
        </div>
      </div>

      <div className="bg-museum-brown-dk py-4 px-4 text-center text-xs text-museum-cream/60">
        © 2026 Bảo Tàng Quốc Gia Việt Nam. Phát triển tích hợp Trợ lý Trí tuệ Nhân tạo AI.
      </div>
    </footer>
  );
};
