import React from 'react';
import { Settings as SettingsIcon, Save, Bell, Shield, Globe } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const Settings = () => {
  const { addToast } = useApp();

  const handleSave = (e) => {
    e.preventDefault();
    addToast('Đã lưu cấu hình hệ thống thành công!', 'success');
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl">
      <div>
        <div className="text-xs font-medium text-[#8A7D6B] mb-1">
          Tổng quan / <span className="text-[#3E2712] font-semibold">Cài đặt</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#3E2712] tracking-tight uppercase">
          CÀI ĐẶT HỆ THỐNG
        </h2>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-xs border border-stone-200/80 space-y-6">
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-[#3E2712] uppercase border-b border-stone-200/60 pb-2">
            THÔNG TIN BẢO TÀNG
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-[#5B3A1F] mb-1">Tên đơn vị</label>
              <input type="text" defaultValue="Bảo tàng Quốc gia Việt Nam" className="w-full px-3.5 py-2 bg-[#F7F3EE] border border-stone-200/80 rounded-xl text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B]" />
            </div>
            <div>
              <label className="block font-bold text-[#5B3A1F] mb-1">Email liên hệ</label>
              <input type="email" defaultValue="contact@baotang.gov.vn" className="w-full px-3.5 py-2 bg-[#F7F3EE] border border-stone-200/80 rounded-xl text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B]" />
            </div>
            <div>
              <label className="block font-bold text-[#5B3A1F] mb-1">Thời gian mở cửa</label>
              <input type="text" defaultValue="08:00 - 17:00 (Thứ 3 - Chủ Nhật)" className="w-full px-3.5 py-2 bg-[#F7F3EE] border border-stone-200/80 rounded-xl text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B]" />
            </div>
            <div>
              <label className="block font-bold text-[#5B3A1F] mb-1">Địa chỉ</label>
              <input type="text" defaultValue="Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội" className="w-full px-3.5 py-2 bg-[#F7F3EE] border border-stone-200/80 rounded-xl text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B]" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-stone-200/60">
          <h3 className="font-bold text-sm text-[#3E2712] uppercase border-b border-stone-200/60 pb-2">
            CẤU HÌNH TRỢ LÝ AI
          </h3>
          <div className="text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[#3E2712]">Bật tự động gợi ý hiện vật</div>
                <p className="text-[#8A7D6B]">Trợ lý AI tự động đề xuất hiện vật tương tự khi trả lời du khách</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#B8860B]" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-[#3E2712]">Chế độ thuyết minh đa ngôn ngữ</div>
                <p className="text-[#8A7D6B]">Tự động dịch câu trả lời AI sang tiếng Anh, Pháp, Trung</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-[#B8860B]" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-stone-200/60 flex justify-end">
          <button type="submit" className="btn-primary inline-flex items-center gap-2 px-6 py-2.5 typo-btn rounded-full shadow-sm cursor-pointer">
            <Save className="w-4 h-4" />
            <span>Lưu cấu hình</span>
          </button>
        </div>
      </form>
    </div>
  );
};
