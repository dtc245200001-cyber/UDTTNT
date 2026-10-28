import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Star,
  MessageSquare,
  Plus,
  Trash2,
  CalendarDays,
  MapPin,
  Landmark,
  Quote,
  ChevronRight,
  AlertCircle,
  LogIn,
} from 'lucide-react';
import { ReviewFormModal } from '@/components/reviews/ReviewFormModal';
import { Modal } from '@/components/ui/Modal';

export const Reviews = () => {
  const navigate = useNavigate();
  const { reviews, currentUser, isAuthenticated, deleteReview } = useApp();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthPromptOpen, setIsAuthPromptOpen] = useState(false);
  const [filterRating, setFilterRating] = useState('ALL');
  const [deletingId, setDeletingId] = useState(null);

  const isAdmin =
    isAuthenticated &&
    (currentUser?.role === 'admin' ||
      (currentUser?.roleLabel && String(currentUser.roleLabel).toLowerCase().includes('quản trị')) ||
      (currentUser?.email && String(currentUser.email).toLowerCase().includes('admin')));

  const filteredReviews = reviews.filter((r) => {
    if (filterRating === 'ALL') return true;
    return (r.rating || 5) === Number(filterRating);
  });

  const handleOpenCreateReview = () => {
    if (!isAuthenticated) {
      setIsAuthPromptOpen(true);
    } else {
      setIsModalOpen(true);
    }
  };

  const handleDelete = async (id, author) => {
    if (window.confirm(`Bạn có chắc chắn muốn xóa đánh giá của "${author}"?`)) {
      setDeletingId(id);
      try {
        await deleteReview(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  // Tính toán điểm đánh giá trung bình từ dữ liệu thực tế
  const totalReviews = reviews.length;
  const avgRating =
    totalReviews > 0
      ? (reviews.reduce((s, r) => s + (Number(r.rating) || 5), 0) / totalReviews).toFixed(1)
      : '0.0';

  // Thống kê phân bố 5 sao -> 1 sao
  const ratingCounts = [5, 4, 3, 2, 1].map((star) => {
    const count = reviews.filter((r) => (Number(r.rating) || 5) === star).length;
    const pct = totalReviews > 0 ? Math.round((count / totalReviews) * 100) : 0;
    return { star, count, pct };
  });

  return (
    <div className="font-sans pb-12 -mx-4 lg:-mx-6 -mt-4 lg:-mt-6">
      {/* ── 1. Banner Tiêu Đề Kiến Trúc Bảo Tàng ── */}
      <div className="relative w-full h-[180px] sm:h-[200px] lg:h-[220px] overflow-hidden select-none">
        {/* Ảnh nền kiến trúc bảo tàng bên phải */}
        <div
          className="absolute inset-0 bg-no-repeat bg-right bg-cover"
          style={{
            backgroundImage: "url('/images/museum-hero.jpg')",
          }}
        />

        {/* Lớp phủ chuyển màu nâu sẫm thanh lịch sang ảnh */}
        <div
          className="absolute inset-0"
          style={{
            background:
              'linear-gradient(90deg, #241208 0%, rgba(36,18,8,0.96) 35%, rgba(36,18,8,0.75) 65%, rgba(36,18,8,0.2) 100%)',
          }}
        />

        {/* Nội dung Banner */}
        <div className="relative max-w-[1400px] mx-auto px-4 lg:px-8 h-full flex items-center z-10">
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Biểu tượng bong bóng đánh giá tròn viền vàng đồng */}
            <div className="w-14 h-14 sm:w-16 sm:h-16 lg:w-[72px] lg:h-[72px] rounded-full bg-[#1F0E06]/80 border border-[#D8A452]/40 flex items-center justify-center shadow-lg backdrop-blur-xs shrink-0">
              <MessageSquare className="w-7 h-7 sm:w-8 sm:h-8 lg:w-9 lg:h-9 text-[#D8A452]" />
            </div>

            {/* Tiêu đề & phụ đề */}
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-[40px] font-bold text-white tracking-tight leading-tight">
                Đánh giá & Phản hồi
              </h1>
              <p className="text-xs sm:text-sm lg:text-[15px] text-[#E8DDD1]/90 mt-1 sm:mt-1.5 font-normal">
                Ý kiến phản hồi công khai đã qua hệ thống kiểm duyệt tự động
              </p>
            </div>
          </div>
        </div>

        {/* Đường cong mềm mại nối vào nền trang */}
        <div
          className="absolute bottom-0 left-0 w-full overflow-hidden leading-none z-10 pointer-events-none"
          style={{ transform: 'translateY(1px)' }}
        >
          <svg className="block w-full h-6 sm:h-8" viewBox="0 0 1440 60" preserveAspectRatio="none">
            <path d="M0,25 Q720,65 1440,25 L1440,60 L0,60 Z" fill="#F8F5EE" />
          </svg>
        </div>
      </div>

      {/* ── 2. Nội Dung Chính ── */}
      <div className="max-w-[1400px] mx-auto px-4 lg:px-8 space-y-8 relative z-20 -mt-6 sm:-mt-8">
        {/* ── Thẻ Thống Kê Tổng Quan (Rating Summary Card) ── */}
        <div className="bg-white rounded-[24px] sm:rounded-[28px] border border-[#ECE4D4] p-5 sm:p-7 lg:p-8 shadow-[0_10px_35px_rgba(43,23,11,0.06)] flex flex-col lg:flex-row items-center gap-6 lg:gap-8">
          {/* Khu vực 1 – Điểm đánh giá trung bình & Huy hiệu nguyệt quế */}
          <div className="w-full sm:w-[260px] h-[195px] rounded-[22px] bg-gradient-to-b from-[#4A2810] to-[#2B170B] border border-[#D8A452]/25 flex flex-col items-center justify-center text-center shrink-0 relative overflow-hidden shadow-md">
            {/* Cành nguyệt quế vàng ôm quanh số điểm */}
            <div className="relative flex items-center justify-center">
              {/* Nhánh nguyệt quế bên trái */}
              <svg viewBox="0 0 45 80" className="w-8 h-16 text-[#D8A452] opacity-90 fill-current">
                <path d="M40 75 C20 60 10 35 25 5 C22 12 18 15 12 14 C16 22 17 28 24 30 C16 35 14 42 22 47 C14 53 14 62 25 66 C18 70 22 75 40 75 Z" />
              </svg>

              {/* Số điểm trung bình thực tế */}
              <span className="text-[54px] sm:text-[62px] font-bold text-[#D8A452] leading-none px-2 tracking-tight">
                {avgRating}
              </span>

              {/* Nhánh nguyệt quế bên phải (lật đối xứng) */}
              <svg viewBox="0 0 45 80" className="w-8 h-16 text-[#D8A452] opacity-90 fill-current scale-x-[-1]">
                <path d="M40 75 C20 60 10 35 25 5 C22 12 18 15 12 14 C16 22 17 28 24 30 C16 35 14 42 22 47 C14 53 14 62 25 66 C18 70 22 75 40 75 Z" />
              </svg>
            </div>

            {/* 5 ngôi sao vàng kim */}
            <div className="flex items-center gap-1.5 mt-1 mb-2">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-4 h-4 ${
                    parseFloat(avgRating) >= s
                      ? 'fill-[#D8A452] text-[#D8A452]'
                      : parseFloat(avgRating) >= s - 0.5
                      ? 'fill-[#D8A452]/50 text-[#D8A452]'
                      : 'fill-white/20 text-white/20'
                  }`}
                />
              ))}
            </div>

            {/* Tổng số lượt đánh giá */}
            <p className="text-[#FAF6EF] text-xs sm:text-[13px] font-medium tracking-wide">
              {totalReviews} đánh giá
            </p>
          </div>

          {/* Khu vực 2 – Phân bố số sao (5 sao -> 1 sao) */}
          <div className="flex-1 w-full flex flex-col justify-center space-y-2.5">
            {ratingCounts.map(({ star, count, pct }) => (
              <div key={star} className="flex items-center gap-3 sm:gap-4 h-7 sm:h-8">
                {/* Số sao + icon Star */}
                <span className="flex items-center justify-end gap-1 text-xs sm:text-sm font-bold text-[#2B170B] w-10 shrink-0">
                  <span>{star}</span>
                  <Star className="w-3.5 h-3.5 fill-[#D8A452] text-[#D8A452]" />
                </span>

                {/* Thanh tiến trình */}
                <div className="flex-1 h-2 sm:h-2.5 bg-[#EFE8DC] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#D8A452] to-[#B88128] rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${pct}%` }}
                  />
                </div>

                {/* Số lượng và % */}
                <span className="flex items-center gap-1 text-xs sm:text-sm w-16 sm:w-20 shrink-0 justify-end">
                  <span className="font-bold text-[#2B170B]">{count}</span>
                  <span className="text-[#8C7A6B]">({pct}%)</span>
                </span>
              </div>
            ))}
          </div>

          {/* Khu vực 3 – Bộ lọc số sao */}
          <div className="w-full lg:w-[190px] shrink-0 border-t lg:border-t-0 lg:border-l border-[#ECE4D4] pt-4 lg:pt-0 lg:pl-6 flex flex-col justify-center gap-1.5">
            {/* Lựa chọn Tất cả */}
            <button
              onClick={() => setFilterRating('ALL')}
              className={`w-full py-2 px-4 rounded-full text-xs sm:text-[13px] font-bold transition-all text-center cursor-pointer ${
                filterRating === 'ALL'
                  ? 'bg-[#2B170B] text-white shadow-xs'
                  : 'bg-transparent text-[#2B170B] hover:bg-[#FAF6EF]'
              }`}
            >
              Tất cả ({totalReviews})
            </button>

            {/* Các lựa chọn từ 5 sao đến 1 sao */}
            {ratingCounts.map(({ star, count }) => {
              const isActive = filterRating === String(star);
              return (
                <button
                  key={star}
                  onClick={() => setFilterRating(String(star))}
                  className={`flex items-center justify-between px-3.5 py-1.5 rounded-full text-xs sm:text-[13px] font-medium transition-all cursor-pointer ${
                    isActive
                      ? 'bg-[#F4EBD9] text-[#2B170B] font-bold shadow-2xs'
                      : 'text-[#5C4535] hover:bg-[#FAF6EF]'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{star}</span>
                    <Star className="w-3 h-3 fill-[#D8A452] text-[#D8A452]" />
                  </span>
                  <span className="flex items-center gap-1.5">
                    {isActive && <span className="w-1.5 h-1.5 rounded-full bg-[#D8A452]" />}
                    <span className={isActive ? 'font-bold' : ''}>{count}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 3. Danh Sách Đánh Giá Từ Khách Tham Quan ── */}
        <div className="space-y-5">
          {/* Header tiêu đề danh sách */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-[#2B170B] flex items-center justify-center text-white shrink-0 shadow-xs">
                <Landmark className="w-4.5 h-4.5" />
              </div>
              <div>
                <h2 className="text-lg sm:text-[22px] font-bold text-[#2B170B]">
                  Những đánh giá từ khách tham quan
                </h2>
                <div className="h-[2.5px] w-12 bg-[#D8A452] mt-1 rounded-full" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                onClick={handleOpenCreateReview}
                className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#2B170B] hover:text-[#B88128] transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Gửi đánh giá mới</span>
              </button>

              <button
                onClick={() => setFilterRating('ALL')}
                className="inline-flex items-center gap-1 px-4 py-1.5 rounded-full border border-[#ECE4D4] text-[#2B170B] bg-white hover:bg-[#FAF6EF] text-xs font-semibold transition-colors shadow-2xs cursor-pointer"
              >
                <span>Xem tất cả</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Lưới các thẻ đánh giá */}
          {filteredReviews.length === 0 ? (
            <div className="bg-white rounded-2xl p-10 text-center border border-[#ECE4D4] shadow-xs space-y-3">
              <div className="w-12 h-12 rounded-full bg-[#FAF6EF] text-[#D8A452] flex items-center justify-center mx-auto">
                <MessageSquare className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-[#2B170B]">Chưa có đánh giá nào</h3>
              <p className="text-xs text-[#8C7A6B] max-w-sm mx-auto">
                {filterRating === 'ALL'
                  ? 'Hiện chưa có phản hồi nào từ khách tham quan trong hệ thống.'
                  : `Không tìm thấy đánh giá nào có mức xếp hạng ${filterRating} sao.`}
              </p>
              {filterRating !== 'ALL' && (
                <button
                  onClick={() => setFilterRating('ALL')}
                  className="px-4 py-1.5 bg-[#2B170B] text-white text-xs font-semibold rounded-full hover:bg-[#3D2210] transition-colors cursor-pointer"
                >
                  Xem tất cả đánh giá
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredReviews.map((rev) => (
                <div
                  key={rev.id}
                  className="bg-white rounded-[20px] p-5 sm:p-6 border border-[#ECE4D4] flex flex-col justify-between gap-4 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5 shadow-[0_4px_16px_rgba(43,23,11,0.04)]"
                >
                  {/* Tác giả & Số sao */}
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-[#2B170B] text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                        {rev.author ? rev.author.charAt(0).toUpperCase() : 'K'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-bold text-sm sm:text-[15px] text-[#2B170B] truncate">
                          {rev.author || 'Khách tham quan'}
                        </p>
                        <p className="text-[11px] text-[#8C7A6B] truncate">
                          {rev.authorEmail || 'Đã kiểm duyệt tự động'}
                        </p>
                      </div>
                    </div>

                    {/* Dãy sao vàng */}
                    <div className="flex items-center gap-0.5 shrink-0">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < (Number(rev.rating) || 5)
                              ? 'fill-[#D8A452] text-[#D8A452]'
                              : 'fill-stone-200 text-stone-200'
                          }`}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Hộp trích dẫn nhận xét */}
                  <div className="relative bg-[#FAF6EF] rounded-xl p-3.5 border border-[#EFE5D3] flex-1">
                    <Quote className="absolute top-2 left-2 w-4 h-4 text-[#D8A452]/40 fill-[#D8A452]/30" />
                    <p className="text-[13px] sm:text-[14px] text-[#4A2810] leading-relaxed italic pl-6 line-clamp-4">
                      "{rev.comment}"
                    </p>
                  </div>

                  {/* Chân thẻ: Ngày, Hiện vật & Nút xóa admin */}
                  <div className="flex items-center justify-between text-xs text-[#8C7A6B] pt-1 border-t border-[#F5EFE6]">
                    <div className="flex items-center gap-1.5 shrink-0">
                      <CalendarDays className="w-3.5 h-3.5 text-[#B88128]" />
                      <span>{rev.date || 'Gần đây'}</span>
                    </div>

                    <div className="flex items-center gap-2 max-w-[60%] justify-end">
                      <div className="flex items-center gap-1 truncate text-right" title={rev.artifactName}>
                        <MapPin className="w-3.5 h-3.5 text-[#B88128] shrink-0" />
                        <span className="truncate">{rev.artifactName || 'Bảo tàng Quốc gia'}</span>
                      </div>

                      {/* Nút xóa đánh giá (dành cho Admin) */}
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(rev.id, rev.author)}
                          disabled={deletingId === rev.id}
                          className="p-1 rounded-md text-stone-400 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0 cursor-pointer ml-1"
                          title="Xóa đánh giá này"
                        >
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
      </div>

      {/* ── 4. Auth Prompt Modal (Khi khách chưa đăng nhập bấm gửi đánh giá) ── */}
      <Modal
        isOpen={isAuthPromptOpen}
        onClose={() => setIsAuthPromptOpen(false)}
        title="🔐 Yêu cầu đăng nhập"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-center py-2 font-sans">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
            <AlertCircle className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-base font-bold text-museum-brown">Bạn cần đăng nhập để gửi đánh giá.</h3>
            <p className="text-xs text-gray-500 mt-1">
              Vui lòng đăng nhập để viết nhận xét và chia sẻ cảm nhận với cộng đồng.
            </p>
          </div>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                setIsAuthPromptOpen(false);
                navigate('/login?redirect=/reviews');
              }}
              className="px-6 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập</span>
            </button>
            <button
              onClick={() => setIsAuthPromptOpen(false)}
              className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
            >
              Để sau
            </button>
          </div>
        </div>
      </Modal>

      {/* ── 5. Review Form Modal ── */}
      <ReviewFormModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />
    </div>
  );
};
