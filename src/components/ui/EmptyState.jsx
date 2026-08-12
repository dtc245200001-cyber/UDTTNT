import React from 'react';
import { SearchX } from 'lucide-react';

export const EmptyState = ({
  title = 'Không tìm thấy dữ liệu phù hợp',
  subtitle = 'Thử thay đổi bộ lọc tìm kiếm hoặc từ khóa tra cứu.',
}) => {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-white rounded-2xl border border-gray-100 shadow-sm my-6">
      <div className="w-16 h-16 bg-museum-cream/60 rounded-full flex items-center justify-center text-museum-gold mb-4">
        <SearchX className="w-8 h-8" />
      </div>
      <h4 className="text-lg font-bold text-museum-brown mb-1">{title}</h4>
      <p className="text-sm text-gray-500 max-w-md">{subtitle}</p>
    </div>
  );
};
