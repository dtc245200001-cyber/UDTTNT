import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, ArrowLeft } from 'lucide-react';

export const NotFound = () => {
  const navigate = useNavigate();

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-white rounded-2xl border border-gray-100 shadow-xs my-6">
      <div className="w-20 h-20 bg-museum-cream rounded-full flex items-center justify-center text-museum-gold mb-6 shadow-xs">
        <HelpCircle className="w-10 h-10" />
      </div>
      <h1 className="text-4xl font-extrabold text-museum-brown mb-2">404</h1>
      <h2 className="text-xl font-bold text-gray-800 mb-3">Không tìm thấy trang bạn yêu cầu</h2>
      <p className="text-sm text-gray-500 max-w-md mb-8">
        Đường dẫn bạn vừa truy cập không tồn tại hoặc đã được thay đổi trong hệ thống.
      </p>
      <button
        onClick={() => navigate('/dashboard')}
        className="inline-flex items-center gap-2 px-6 py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>Quay về trang Tổng quan</span>
      </button>
    </div>
  );
};
