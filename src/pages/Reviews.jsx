import React, { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Star, MessageSquare, Plus, Trash2, ShieldCheck, User } from 'lucide-react';
import { ReviewFormModal } from '@/components/reviews/ReviewFormModal';

export const Reviews = () => {
  const { reviews, currentUser, isAuthenticated, deleteReview } = useApp();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterRating, setFilterRating] = useState('ALL');

  const filteredReviews = reviews.filter((r) => {
    if (filterRating === 'ALL') return true;
    return r.rating === Number(filterRating);
  });

  return (
    <div className="space-y-6 animate-fadeIn font-sans max-w-7xl mx-auto px-4 py-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Đánh giá khách hàng</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight flex items-center gap-2">
            <MessageSquare className="w-7 h-7 text-museum-gold" />
            ĐÁNH GIÁ & PHẢN HỒI TỪ DU KHÁCH
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Ý kiến phản hồi công khai đã qua hệ thống kiểm duyệt tự động
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer w-fit"
        >
          <Plus className="w-4 h-4" />
          <span>+ Gửi đánh giá mới</span>
        </button>
      </div>

      {/* Rating Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        <span className="text-xs font-bold text-gray-500 mr-2">Lọc theo sao:</span>
        <button
          onClick={() => setFilterRating('ALL')}
          className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors ${
            filterRating === 'ALL'
              ? 'bg-museum-brown text-white shadow-xs'
              : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
          }`}
        >
          Tất cả ({reviews.length})
        </button>
        {[5, 4, 3, 2, 1].map((star) => (
          <button
            key={star}
            onClick={() => setFilterRating(String(star))}
            className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-colors flex items-center gap-1 ${
              filterRating === String(star)
                ? 'bg-museum-gold text-white shadow-xs'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            <span>{star}</span>
            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
          </button>
        ))}
      </div>

      {/* Reviews Grid */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl p-8 text-center border border-gray-100 text-gray-400 text-xs font-medium">
          Chưa có đánh giá nào phù hợp với bộ lọc này.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filteredReviews.map((rev) => (
            <div
              key={rev.id}
              className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between space-y-3 hover:shadow-md transition-all relative group"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-museum-cream flex items-center justify-center font-bold text-museum-brown text-xs">
                      {rev.author.charAt(0)}
                    </div>
                    <div>
                      <span className="font-bold text-xs text-museum-brown block">{rev.author}</span>
                      {rev.authorEmail && (
                        <span className="text-[10px] text-gray-400 block">{rev.authorEmail}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center text-amber-500">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-amber-400" />
                    ))}
                  </div>
                </div>

                <p className="text-xs text-gray-700 leading-relaxed italic bg-museum-ivory/50 p-3 rounded-xl border border-museum-cream/60">
                  "{rev.comment}"
                </p>
              </div>

              <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
                <span>Hiện vật: <strong className="text-museum-gold">{rev.artifactName}</strong></span>
                <span>{rev.date}</span>

                {/* Admin Delete Action */}
                {currentUser?.role === 'admin' && (
                  <button
                    onClick={() => deleteReview(rev.id)}
                    className="p-1 text-gray-400 hover:text-danger hover:bg-rose-50 rounded-lg transition-colors ml-2"
                    title="Xóa đánh giá (Dành cho Admin)"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Form Modal */}
      <ReviewFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
