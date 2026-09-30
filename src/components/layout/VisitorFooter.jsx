import React from 'react';
import { Link } from 'react-router-dom';
import {
  Landmark, MapPin, Phone, Mail, Clock,
  BookOpen, Ticket, CalendarDays
} from 'lucide-react';

export const VisitorFooter = () => {
  return (
    <footer className="relative font-sans select-none overflow-hidden bg-[#23150C] border-t border-[rgba(184,134,11,0.35)]" role="contentinfo">
      {/* ── MAIN FOOTER ── */}
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          
          {/* Cột 1: Brand */}
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#D9A441] flex items-center justify-center flex-none">
                <Landmark className="w-6 h-6 text-white" />
              </div>
              <div>
                <div className="font-extrabold text-white text-lg tracking-widest leading-tight">BẢO TÀNG</div>
                <div className="text-[#D9A441] text-xs font-bold uppercase tracking-[0.2em]">VIỆT NAM</div>
              </div>
            </div>
            <p className="text-sm text-[#E8DCCB] leading-relaxed">
              Nơi lưu giữ, trưng bày và tôn vinh hơn 100.000 hiện vật lịch sử văn hóa vô giá của dân tộc Việt Nam qua các thời kỳ.
            </p>
          </div>

          {/* Cột 2: THÔNG TIN LIÊN HỆ */}
          <div className="space-y-4 lg:pl-4">
            <h4 className="text-lg font-bold text-[#D9A441] uppercase">
              THÔNG TIN LIÊN HỆ
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-[#E8DCCB]">
                <MapPin className="w-4 h-4 text-[#D9A441] flex-none mt-0.5" />
                <span>Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-[#E8DCCB]">
                <Phone className="w-4 h-4 text-[#D9A441] flex-none mt-0.5" />
                <span>(024) 3825 3557</span>
              </li>
              <li className="flex items-start gap-3 text-sm text-[#E8DCCB]">
                <Mail className="w-4 h-4 text-[#D9A441] flex-none mt-0.5" />
                <span>info@baotang.gov.vn</span>
              </li>
            </ul>
          </div>

          {/* Cột 3: GIỜ PHỤC VỤ */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-[#D9A441] uppercase">
              GIỜ PHỤC VỤ
            </h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-sm text-[#E8DCCB]">
                <Clock className="w-4 h-4 text-[#D9A441] flex-none mt-0.5" />
                <div className="space-y-0.5">
                  <strong className="block text-white font-bold">Thứ Ba - Chủ Nhật</strong>
                  <span className="block">Sáng: 08:00 - 12:00</span>
                  <span className="block">Chiều: 13:30 - 17:00</span>
                </div>
              </li>
              <li className="text-sm text-[#D9A441] pt-1">
                Bảo tàng đóng cửa bảo trì vào Thứ Hai hàng tuần.
              </li>
            </ul>
          </div>

          {/* Cột 4: KHÁM PHÁ DI SẢN */}
          <div className="space-y-4">
            <h4 className="text-lg font-bold text-[#D9A441] uppercase">
              KHÁM PHÁ DI SẢN
            </h4>
            <ul className="space-y-3">
              <li>
                <Link to="/galleries" className="text-sm text-[#E8DCCB] hover:text-[#F5B82E] transition-colors duration-200">
                  Bộ sưu tập Hiện vật cổ
                </Link>
              </li>
              <li>
                <Link to="/exhibitions" className="text-sm text-[#E8DCCB] hover:text-[#F5B82E] transition-colors duration-200">
                  Triển lãm chuyên đề
                </Link>
              </li>
              <li>
                <Link to="/events" className="text-sm text-[#E8DCCB] hover:text-[#F5B82E] transition-colors duration-200">
                  Sự kiện & Tọa đàm văn hóa
                </Link>
              </li>
              <li>
                <Link to="/tickets" className="text-sm text-[#E8DCCB] hover:text-[#F5B82E] transition-colors duration-200">
                  Đặt vé tham quan trực tuyến
                </Link>
              </li>
            </ul>
          </div>

        </div>
      </div>

      {/* ── Bottom copyright bar ── */}
      <div className="bg-[#160D07] border-t border-[rgba(255,255,255,0.08)] h-[50px] flex items-center justify-center px-6">
        <p className="text-xs text-[#BFAE98] text-center w-full">
          © 2026 Bảo Tàng Quốc Gia Việt Nam. Phát triển tích hợp Trợ lý Trí tuệ Nhân tạo AI.
        </p>
      </div>
    </footer>
  );
};
