import React from 'react';
import { articles } from '@/data/articles';
import { FileText, Plus, Eye } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';

export const Articles = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Bài viết</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
            QUẢN LÝ BÀI VIẾT & TIN TỨC
          </h2>
        </div>
        <button className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md transition-colors">
          <Plus className="w-5 h-5" />
          <span>+ Viết bài mới</span>
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-museum-ivory text-museum-brown text-xs font-bold uppercase tracking-wider border-b border-gray-200">
              <th className="py-3.5 px-4">Tiêu đề bài viết</th>
              <th className="py-3.5 px-4">Chuyên mục</th>
              <th className="py-3.5 px-4">Tác giả</th>
              <th className="py-3.5 px-4">Trạng thái</th>
              <th className="py-3.5 px-4">Lượt xem</th>
              <th className="py-3.5 px-4">Ngày đăng</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
            {articles.map((art) => (
              <tr key={art.id} className="hover:bg-museum-cream/30 transition-colors">
                <td className="py-3.5 px-4 font-bold text-museum-brown">{art.title}</td>
                <td className="py-3.5 px-4 font-medium text-gray-600">{art.category}</td>
                <td className="py-3.5 px-4">{art.author}</td>
                <td className="py-3.5 px-4"><Badge>{art.status}</Badge></td>
                <td className="py-3.5 px-4 text-gray-500 font-semibold">{art.views}</td>
                <td className="py-3.5 px-4 text-gray-400">{art.date}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
