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
        <div className="text-xs font-semibold text-gray-400 mb-1">
          Tổng quan / <span className="text-museum-brown font-bold">Cài đặt</span>
        </div>
        <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
          CÀI ĐẶT HỆ THỐNG
        </h2>
      </div>

      <form onSubmit={handleSave} className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 space-y-6">
        <div className="space-y-4">
          <h3 className="font-bold text-sm text-museum-brown uppercase border-b border-gray-100 pb-2">
            THÔNG TIN BẢO TÀNG
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block font-bold text-museum-brown mb-1">Tên đơn vị</label>
              <input type="text" defaultValue="Bảo tàng Quốc gia Việt Nam" className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-bold text-museum-brown mb-1">Email liên hệ</label>
              <input type="email" defaultValue="contact@baotang.gov.vn" className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-bold text-museum-brown mb-1">Thời gian mở cửa</label>
              <input type="text" defaultValue="08:00 - 17:00 (Thứ 3 - Chủ Nhật)" className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl" />
            </div>
            <div>
              <label className="block font-bold text-museum-brown mb-1">Địa chỉ</label>
              <input type="text" defaultValue="Số 1 Tràng Tien, Hoàn Kiếm, Hà Nội" className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 rounded-xl" />
            </div>
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-gray-100">
          <h3 className="font-bold text-sm text-museum-brown uppercase border-b border-gray-100 pb-2">
            CẤU HÌNH TRỢ LÝ AI
          </h3>
          <div className="text-xs space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-museum-brown">Bật tự động gợi ý hiện vật</div>
                <p className="text-gray-500">Trợ lý AI tự động đề xuất hiện vật tương tự khi trả lời du khách</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-museum-gold" />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <div className="font-bold text-museum-brown">Chế độ thuyết minh đa ngôn ngữ</div>
                <p className="text-gray-500">Tự động dịch câu trả lời AI sang tiếng Anh, Pháp, Trung</p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5 accent-museum-gold" />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t border-gray-100 flex justify-end">
          <button type="submit" className="inline-flex items-center gap-2 px-6 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors">
            <Save className="w-4 h-4" />
            <span>Lưu cấu hình</span>
          </button>
        </div>
      </form>
    </div>
  );
};
