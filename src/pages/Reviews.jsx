import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Star, MessageSquare, Plus, Trash2, User, LogIn, AlertCircle, Quote, TrendingUp, CalendarDays, MapPin, Bot, Landmark } from 'lucide-react';
import { ReviewFormModal } from '@/components/reviews/ReviewFormModal';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { Breadcrumb } from '@/components/common/Breadcrumb';

export const Reviews = () => {
  const navigate = useNavigate();
  const { reviews, currentUser, isAuthenticated, deleteReview } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [filterRating, setFilterRating] = useState('ALL');
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

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

  const confirmDeleteReview = async () => {
    if (!reviewToDelete || isDeleting) return false;
    setIsDeleting(true);
    try {
      const ok = await deleteReview(reviewToDelete.id);
      if (ok) setReviewToDelete(null);
      return ok;
    } finally {
      setIsDeleting(false);
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
    <div className="min-h-screen bg-[#faf6ef] font-sans pb-[90px] relative">

      {/* ── Hero Banner: Chiều cao chuẩn 220-240px, nền màu nâu di sản ── */}
      <div className="relative overflow-hidden min-h-[220px] md:h-[240px] bg-[#200e05] flex items-center select-none">
        {/* Background Image on the right */}
        <div className="absolute inset-0 bg-[url('/images/museum-hero.jpg')]" style={{ backgroundPosition: 'right center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }} />
        {/* Gradient Overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #200e05 0%, rgba(58,34,19,0.92) 40%, rgba(58,34,19,0.4) 75%, transparent 100%)' }} />
        
        {/* Content */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 sm:py-0 flex flex-col justify-center">
          <div className="max-w-full md:max-w-[60%] relative z-10">
            {/* Breadcrumb: TRANG CHỦ / ĐÁNH GIÁ */}
            <div className="relative z-10">
              <Breadcrumb
                items={[
                  { label: 'TRANG CHỦ', path: '/' },
                  { label: 'ĐÁNH GIÁ' },
                ]}
                variant="dark"
              />
            </div>

            {/* Title: Serif bold, large, white */}
            <h1 
              className="typo-page-title text-white tracking-wide leading-tight uppercase relative z-10"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,.45)' }}
            >
              ĐÁNH GIÁ & PHẢN HỒI
            </h1>

            {/* Description */}
            <p className="typo-body text-[#F5EFE0]/80 line-clamp-2 mt-2 max-w-xl relative z-10">
              Ý kiến phản hồi công khai đã qua hệ thống kiểm duyệt tự động của Bảo tàng.
            </p>

            {/* Short gold divider bar */}
            <div className="w-14 h-[2px] bg-[#D4A359] mt-3 rounded-full relative z-10" />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 space-y-8 relative z-30 mt-8">

        {/* ── Rating Summary Card ── */}
        <div className="bg-white rounded-[24px] shadow-sm border border-stone-100 p-[28px] flex flex-col md:flex-row items-center gap-8 w-full box-border" style={{ boxShadow: '0 8px 30px rgba(58,34,19,0.06)' }}>
          
          {/* Left: Overall Rating */}
          <div className="relative w-[265px] h-[205px] bg-gradient-to-b from-[#5a3a1f] to-[#3a2213] rounded-[20px] flex flex-col items-center justify-center text-center flex-none">
            {/* Wreath SVG */}
            <svg width="220" height="130" viewBox="0 0 220 130" fill="none" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-[#f0b93a] z-0 pointer-events-none">
              <path d="M 40 130 C 10 90, 10 40, 50 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 50 10 C 45 15, 35 15, 30 5 C 40 5, 50 5, 50 10 Z" fill="currentColor" />
              <path d="M 30 35 C 20 30, 15 40, 20 50 C 30 45, 35 35, 30 35 Z" fill="currentColor" />
              <path d="M 20 70 C 10 65, 5 75, 10 85 C 20 80, 25 70, 20 70 Z" fill="currentColor" />
              <path d="M 15 105 C 5 100, 0 110, 5 120 C 15 115, 20 105, 15 105 Z" fill="currentColor" />
              
              <path d="M 180 130 C 210 90, 210 40, 170 10" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
              <path d="M 170 10 C 175 15, 185 15, 190 5 C 180 5, 170 5, 170 10 Z" fill="currentColor" />
              <path d="M 190 35 C 200 30, 205 40, 200 50 C 190 45, 185 35, 190 35 Z" fill="currentColor" />
              <path d="M 200 70 C 210 65, 215 75, 210 85 C 200 80, 195 70, 200 70 Z" fill="currentColor" />
              <path d="M 205 105 C 215 100, 220 110, 215 120 C 205 115, 200 105, 205 105 Z" fill="currentColor" />
            </svg>
            <div className="relative z-10 flex flex-col items-center">
              <span className="text-[72px] font-bold text-[#f0b93a] leading-none mb-1">{avgRating}</span>
              <div className="flex gap-1.5 mb-2 mt-1">
                {[1,2,3,4,5].map(s => <Star key={s} className={`w-[22px] h-[22px] ${parseFloat(avgRating) >= s ? 'fill-[#f0b93a] text-[#f0b93a]' : 'fill-white/20 text-white/20'}`} />)}
              </div>
              <p className="text-[#faf6ef] text-[15px] mt-[10px]">{reviews.length} đánh giá</p>
            </div>
          </div>

          {/* Middle: Rating Bars */}
          <div className="flex-1 flex flex-col justify-center gap-1">
            {ratingCounts.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-4 h-[34px]">
                <span className="flex items-center justify-end gap-1 text-[16px] font-bold text-stone-600 w-10 shrink-0">
                  {star} <Star className="w-4 h-4 fill-[#c8952e] text-[#c8952e]" />
                </span>
                <div className="flex-1 h-[12px] bg-stone-100 rounded-full overflow-hidden">
                  <div className="h-full bg-[#c8952e] rounded-full transition-all duration-500" style={{ width: `${pct}%` }} />
                </div>
                <span className="flex items-center gap-1.5 w-[72px] shrink-0 justify-end">
                  <span className="text-[16px] font-semibold text-[#3a2213]">{count}</span>
                  <span className="text-[14px] text-[#9a8f82]">({pct}%)</span>
                </span>
              </div>
            ))}
          </div>

          {/* Right: Filters */}
          <div className="w-[210px] flex flex-col border-l border-[#eadfcf] pl-8 shrink-0 self-stretch justify-center gap-1">
            <button onClick={() => setFilterRating('ALL')}
              className={`w-full py-2 text-[14px] font-bold rounded-full transition-all mb-1 text-center
                ${filterRating === 'ALL' ? 'bg-[#3a2213] text-white shadow-sm' : 'bg-transparent text-[#3a2213] hover:bg-stone-50'}`}>
              Tất cả ({reviews.length})
            </button>
            {ratingCounts.map(({ star, count }) => {
              const isActive = filterRating === String(star);
              return (
                <button key={star} onClick={() => setFilterRating(String(star))}
                  className={`flex items-center justify-between px-4 h-[34px] rounded-full text-[14px] transition-all
                    ${isActive ? 'bg-[#fbefd2]' : 'bg-transparent hover:bg-stone-50'}`}
                >
                  <span className="flex items-center gap-1.5 text-[#3a2213]">
                    <span className="font-bold">{star}</span> <Star className={`w-3.5 h-3.5 fill-[#c8952e] text-[#c8952e]`} />
                  </span>
                  <span className="text-[#3a2213]">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── Section Title ── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#3a2213] flex items-center justify-center flex-none">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-[22px] font-bold text-[#3a2213]">Những đánh giá từ khách tham quan</h2>
              <div className="h-[3px] w-12 bg-[#c8952e] mt-1" />
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={handleOpenCreateReview} className="btn-primary h-11 px-6 typo-btn gap-2 rounded-full shadow-md cursor-pointer">
              <Plus className="w-4 h-4" /> Gửi đánh giá mới
            </button>
            <button className="btn-secondary h-11 px-5 typo-btn rounded-full cursor-pointer">
              Xem tất cả →
            </button>
          </div>
        </div>

        {/* ── Reviews Grid ── */}
        {filteredReviews.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-stone-100">
            <MessageSquare className="w-12 h-12 text-stone-200 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">Chưa có đánh giá nào phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredReviews.map((rev) => (
              <div key={rev.id} className="relative bg-white rounded-2xl p-5 sm:p-6 border border-stone-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col gap-4 h-full">

                {/* Admin: xóa đánh giá */}
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => setReviewToDelete(rev)}
                    title="Xóa đánh giá này"
                    aria-label={`Xóa đánh giá của ${rev.author}`}
                    className="absolute top-3 right-3 w-8 h-8 rounded-lg flex items-center justify-center text-stone-300 hover:text-red-500 hover:bg-red-50 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}

                {/* Author row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-[#3a2213] flex items-center justify-center font-bold text-white text-sm shrink-0">
                      {rev.author.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-sm sm:text-base text-[#3a2213] truncate">{rev.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-2">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#c8952e] text-[#c8952e]" />
                    ))}
                  </div>
                </div>

                {/* Comment box */}
                <div className="relative bg-[#fbf6ec] rounded-xl p-4 border border-[#f0e6d2] flex-1">
                  <Quote className="absolute top-2.5 left-2.5 w-4 h-4 text-[#e6d0a1] fill-[#e6d0a1]" />
                  <p className="typo-body text-xs sm:text-sm text-[#5a3a1f] leading-relaxed italic pl-6 line-clamp-3">
                    "{rev.comment}"
                  </p>
                </div>

                {/* Footer info */}
                <div className="flex items-start justify-between text-xs text-[#786a5f] pt-1 gap-2">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <CalendarDays className="w-3.5 h-3.5 text-museum-gold" />
                    <span>{rev.date}</span>
                  </div>
                  <div className="flex items-start gap-1.5 max-w-[65%] text-right justify-end">
                    <MapPin className="w-3.5 h-3.5 text-museum-brown shrink-0 mt-0.5" />
                    <span className="leading-snug truncate">{rev.artifactName}</span>
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
              className="btn-primary h-10 px-6 typo-btn gap-1.5 rounded-full shadow-md transition-colors cursor-pointer">
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>
            <button onClick={() => setIsAuthPromptOpen(false)}
              className="h-10 px-5 bg-gray-100 hover:bg-gray-200 text-gray-700 typo-btn rounded-full transition-colors cursor-pointer">
              Để sau
            </button>
          </div>
        </div>
      </Modal>

      {/* ── Review Form Modal ── */}
      <ReviewFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

      {/* ── Admin Delete Confirmation ── */}
      <ConfirmModal
        isOpen={!!reviewToDelete}
        onClose={() => { if (!isDeleting) setReviewToDelete(null); }}
        onConfirm={confirmDeleteReview}
        itemName={reviewToDelete ? `đánh giá của ${reviewToDelete.author}` : ''}
        description="Đánh giá này sẽ bị xóa khỏi hệ thống và không thể khôi phục."
      />
    </div>
  );
};
