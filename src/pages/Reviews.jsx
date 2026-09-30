import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Star, MessageSquare, Plus, Trash2, User, LogIn, AlertCircle, Quote, TrendingUp, CalendarDays, MapPin, Bot, Landmark } from 'lucide-react';
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
    <div className="min-h-screen bg-[#faf6ef] font-sans pb-[90px] relative">

      {/* ── Hero Banner ── */}
      <div className="relative w-full h-[190px]">
        {/* Background Image on the right */}
        <div className="absolute inset-0 bg-[url('/images/museum-hero.jpg')]" style={{ backgroundPosition: 'right center', backgroundSize: 'cover', backgroundRepeat: 'no-repeat' }} />
        {/* Gradient Overlay */}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(90deg, #3a2213 0%, rgba(58,34,19,0.92) 35%, rgba(58,34,19,0.3) 70%, rgba(58,34,19,0) 100%)' }} />
        
        {/* Content */}
        <div className="relative max-w-7xl mx-auto px-6 h-full flex items-center gap-6 z-10">
          <div className="w-[90px] h-[90px] rounded-full bg-[#c8952e]/20 border border-[#c8952e]/40 flex items-center justify-center flex-none">
            <MessageSquare className="w-10 h-10 text-[#c8952e]" />
          </div>
          <div>
            <h1 className="text-[48px] font-bold text-white tracking-tight leading-none whitespace-nowrap">
              Đánh giá & Phản hồi
            </h1>
            <p className="text-[#faf6ef] text-[18px] mt-2">Ý kiến phản hồi công khai đã qua hệ thống kiểm duyệt tự động</p>
          </div>
        </div>
        
        {/* Wavy bottom */}
        <div className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-20" style={{ transform: 'translateY(1px)' }}>
          <svg className="block w-full h-[30px]" viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V120H0V95.8C59.71,118.4,142.3,122.9,208.5,108.5Z" fill="#faf6ef"></path>
          </svg>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-10 relative z-30 -mt-2">

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
          <div className="flex items-center gap-4">
            <button onClick={handleOpenCreateReview} className="flex items-center gap-2 text-[#3a2213] font-medium text-[15px] hover:text-[#c8952e] transition-colors">
              <Plus className="w-4 h-4" /> Gửi đánh giá mới
            </button>
            <button className="px-5 py-2 rounded-full border border-stone-200 text-[#3a2213] bg-white font-medium hover:bg-stone-50 text-[14px]">
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
              <div key={rev.id} className="bg-white rounded-[20px] p-6 border border-stone-100 flex flex-col gap-4 transition-all duration-300 h-full" style={{ boxShadow: '0 4px 20px rgba(58,34,19,0.04)' }}>
                
                {/* Author row */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#3a2213] flex items-center justify-center font-bold text-white text-[15px] flex-none">
                      {rev.author.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-[16px] text-[#3a2213] truncate">{rev.author}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {Array.from({ length: rev.rating || 5 }).map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-[#c8952e] text-[#c8952e]" />
                    ))}
                  </div>
                </div>

                {/* Comment box */}
                <div className="relative bg-[#fbf6ec] rounded-xl p-4 border border-[#f0e6d2] flex-1">
                  <Quote className="absolute top-2 left-2 w-4 h-4 text-[#e6d0a1] fill-[#e6d0a1]" />
                  <p className="text-[15px] text-[#5a3a1f] leading-relaxed italic pl-6 line-clamp-3">
                    "{rev.comment}"
                  </p>
                </div>

                {/* Footer info */}
                <div className="flex items-start justify-between text-[13px] text-[#786a5f] pt-1">
                  <div className="flex items-center gap-1.5 shrink-0">
                    <CalendarDays className="w-3.5 h-3.5" />
                    <span>{rev.date}</span>
                  </div>
                  <div className="flex items-start gap-1.5 max-w-[65%] text-right justify-end">
                    <MapPin className="w-3.5 h-3.5 flex-none mt-0.5" />
                    <span className="leading-snug">{rev.artifactName}</span>
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
