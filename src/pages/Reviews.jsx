import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Star, MessageSquare, Plus, Trash2, User, LogIn, AlertCircle, Quote, TrendingUp } from 'lucide-react';
import { ReviewFormModal } from '@/components/reviews/ReviewFormModal';
import { Modal } from '@/components/ui/Modal';

export const Reviews = () => {
  const navigate = useNavigate();
  const { reviews, currentUser, isAuthenticated, deleteReview } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [filterRating, setFilterRating] = useState('ALL');

  const filteredReviews = reviews.filter((r) => {
    if (filterRating === 'ALL') return true;
    return r.rating === Number(filterRating);
  });

  const handleOpenCreateReview = () => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  // Compute average rating
  const avgRating = reviews.length > 0
    ? (reviews.reduce((s, r) => s + (r.rating || 5), 0) / reviews.length).toFixed(1)
    : '—';

  const ratingCounts = [5, 4, 3, 2, 1].map(star => ({
    star,
    count: reviews.filter(r => (r.rating || 5) === star).length,
    pct: reviews.length ? Math.round((reviews.filter(r => (r.rating || 5) === star).length / reviews.length) * 100) : 0,
  }));

  return (
    <div className="min-h-screen bg-[#faf8f5] font-sans pb-12">

      {/* ── Hero Banner ── */}
      <div className="relative overflow-hidden bg-gradient-to-br from-museum-brown via-[#3d1f0d] to-[#1a0a04] mb-8">
        <div className="absolute inset-0 opacity-10 bg-[url('/images/museum-hero.jpg')] bg-cover bg-center" />
        <div className="absolute inset-0 bg-gradient-to-r from-museum-brown/95 to-museum-brown/50" />
        <div className="relative max-w-7xl mx-auto px-6 py-10 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
          <div>
            <p className="text-xs text-amber-300/60 mb-2">Tổng quan / <span className="text-museum-gold font-bold">Đánh giá khách hàng</span></p>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-museum-gold/20 border border-museum-gold/40 flex items-center justify-center flex-none">
                <MessageSquare className="w-5 h-5 text-museum-gold" />
              </div>
              ĐÁNH GIÁ & PHẢN HỒI
            </h1>
            <p className="text-amber-200/60 text-sm mt-1.5">Ý kiến phản hồi công khai đã qua hệ thống kiểm duyệt tự động</p>
          </div>
          <button onClick={handleOpenCreateReview}
            className="inline-flex items-center gap-2 px-5 py-3 bg-museum-gold hover:bg-amber-500 text-white font-bold text-sm rounded-2xl shadow-lg transition-all hover:-translate-y-0.5 flex-none">
            <Plus className="w-5 h-5" />
            + Gửi đánh giá mới
          </button>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-6 bg-[#faf8f5] rounded-t-[2rem]" />
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-6">

        {/* ── Rating Summary Card ── */}
        <div className="bg-white rounded-3xl border border-stone-100 shadow-sm p-6 flex flex-col md:flex-row gap-6 items-start">
          {/* Big average */}
          <div className="flex flex-col items-center justify-center min-w-[120px] bg-gradient-to-br from-museum-brown to-[#3d1f0d] rounded-2xl p-5 text-center text-white">
            <span className="text-5xl font-black text-museum-gold leading-none">{avgRating}</span>
            <div className="flex gap-0.5 mt-2">
              {[1,2,3,4,5].map(s => <Star key={s} className={`w-4 h-4 ${parseFloat(avgRating) >= s ? 'fill-museum-gold text-museum-gold' : 'fill-white/20 text-white/20'}`} />)}
            </div>
            <p className="text-white/70 text-xs mt-2">{reviews.length} đánh giá</p>
          </div>

          {/* Rating bars */}
          <div className="flex-1 space-y-2 w-full">
            {ratingCounts.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-3">
                <button onClick={() => setFilterRating(filterRating === String(star) ? 'ALL' : String(star))}
                  className="flex items-center gap-1 text-xs font-bold text-stone-600 w-10 shrink-0 hover:text-museum-brown transition-colors">
                  {star}<Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                </button>
                <div className="flex-1 h-2 bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-museum-gold to-amber-500 rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="text-xs text-stone-400 w-8 text-right">{count}</span>
              </div>
            ))}
          </div>

          {/* Filter badges */}
          <div className="flex flex-wrap gap-2 md:flex-col">
            <button onClick={() => setFilterRating('ALL')}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${filterRating === 'ALL' ? 'bg-museum-brown text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
              Tất cả ({reviews.length})
            </button>
            {[5,4,3,2,1].map(star => (
              <button key={star} onClick={() => setFilterRating(String(star))}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl flex items-center gap-1 transition-all ${filterRating === String(star) ? 'bg-museum-gold text-white shadow-sm' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'}`}>
                {star}<Star className="w-3 h-3 fill-amber-400 text-amber-400" />
              </button>
            ))}
          </div>
        </div>

        {/* ── Reviews Grid ── */}
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-100">
            <MessageSquare className="w-12 h-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">Chưa có đánh giá nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReviews.map((rev) => (
              <div key={rev.id} className="group bg-white rounded-3xl p-5 shadow-sm border border-stone-100 flex flex-col gap-3 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 relative">
                {/* Quote icon */}
                <Quote className="absolute top-4 right-5 w-8 h-8 text-museum-gold/10 group-hover:text-museum-gold/20 transition-colors" />

                {/* Author row */}
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-museum-brown to-museum-brown-dk flex items-center justify-center font-extrabold text-white text-sm flex-none shadow-sm">
                    {rev.author.charAt(0)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-xs text-museum-brown truncate">{rev.author}</p>
                    {rev.authorEmail && <p className="text-[10px] text-stone-400 truncate">{rev.authorEmail}</p>}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-3 h-3 fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                </div>

                {/* Comment */}
                <div className="bg-gradient-to-br from-museum-cream/50 to-amber-50/30 rounded-2xl p-3.5 border border-museum-gold/10">
                  <p className="text-xs text-stone-700 leading-relaxed italic">"{rev.comment}"</p>
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between text-[11px] text-stone-400 pt-1">
                  <span>Hiện vật: <strong className="text-museum-gold">{rev.artifactName}</strong></span>
                  <div className="flex items-center gap-2">
                    <span>{rev.date}</span>
                    {currentUser?.role === 'admin' && (
                      <button onClick={() => deleteReview(rev.id)}
                        className="p-1 text-stone-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Xóa (Admin)">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Auth Prompt Modal ── */}
      <Modal isOpen={isAuthPromptOpen} onClose={() => setIsAuthPromptOpen(false)} title="🔐 Yêu cầu đăng nhập" maxWidth="max-w-md">
        <div className="space-y-4 text-center py-2 font-sans">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-museum-brown">Bạn cần đăng nhập để gửi đánh giá.</h3>
            <p className="text-xs text-gray-500 mt-1">Vui lòng đăng nhập để viết nhận xét và chia sẻ cảm nhận với cộng đồng.</p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button onClick={() => { setIsAuthPromptOpen(false); navigate('/login?redirect=/reviews'); }}
              className="px-6 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer">
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>
            <button onClick={() => setIsAuthPromptOpen(false)}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer">
              Để sau
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Review Form Modal ── */}
      <ReviewFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
