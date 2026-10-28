import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  MessageSquareQuote,
  Star,
  Search,
  Filter,
  Trash2,
  Eye,
  MessageCircle,
  Plus,
  Download,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  LayoutList,
  LayoutGrid,
  Clock,
  Landmark,
  User,
  ArrowUpDown,
  Send,
  X,
  Sparkles,
  Smile,
  Frown,
  Check,
} from 'lucide-react';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ReviewFormModal } from '@/components/reviews/ReviewFormModal';

export const AdminReviews = () => {
  const { reviews = [], deleteReview, replyReview, currentUser } = useApp();

  // Search, Filter & Sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [starFilter, setStarFilter] = useState('ALL');
  const [replyFilter, setReplyFilter] = useState('ALL'); // ALL, REPLIED, PENDING
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest, highest, lowest
  const [viewMode, setViewMode] = useState('table'); // 'table' | 'grid'

  // Selection states for batch actions
  const [selectedIds, setSelectedIds] = useState([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Detail & Reply Modal
  const [activeReviewDetail, setActiveReviewDetail] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isReplying, setIsReplying] = useState(false);

  // ── Thống kê KPI cấp cao ──
  const stats = useMemo(() => {
    const total = reviews.length;
    if (total === 0) {
      return { total: 0, avg: 0, positiveCount: 0, positivePct: 0, attentionCount: 0, repliedCount: 0 };
    }
    const sum = reviews.reduce((acc, r) => acc + (Number(r.rating) || 5), 0);
    const avg = (sum / total).toFixed(1);
    const positiveCount = reviews.filter((r) => (Number(r.rating) || 5) >= 4).length;
    const positivePct = Math.round((positiveCount / total) * 100);
    const attentionCount = reviews.filter((r) => (Number(r.rating) || 5) <= 3).length;
    const repliedCount = reviews.filter((r) => !!r.adminReply).length;

    return { total, avg, positiveCount, positivePct, attentionCount, repliedCount };
  }, [reviews]);

  // ── Lọc và sắp xếp danh sách ──
  const filteredReviews = useMemo(() => {
    return reviews
      .filter((r) => {
        // Search
        const q = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !q ||
          (r.author || '').toLowerCase().includes(q) ||
          (r.comment || '').toLowerCase().includes(q) ||
          (r.artifactName || '').toLowerCase().includes(q) ||
          (r.id || '').toLowerCase().includes(q);

        // Star filter
        const rating = Number(r.rating) || 5;
        const matchesStar =
          starFilter === 'ALL' ||
          (starFilter === 'POSITIVE' && rating >= 4) ||
          (starFilter === 'ATTENTION' && rating <= 3) ||
          rating === Number(starFilter);

        // Reply status filter
        const matchesReply =
          replyFilter === 'ALL' ||
          (replyFilter === 'REPLIED' && !!r.adminReply) ||
          (replyFilter === 'PENDING' && !r.adminReply);

        return matchesSearch && matchesStar && matchesReply;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.date || 0) - new Date(a.date || 0);
        if (sortBy === 'oldest') return new Date(a.date || 0) - new Date(b.date || 0);
        if (sortBy === 'highest') return (b.rating || 5) - (a.rating || 5);
        if (sortBy === 'lowest') return (a.rating || 5) - (b.rating || 5);
        return 0;
      });
  }, [reviews, searchTerm, starFilter, replyFilter, sortBy]);

  // ── Xử lý chọn nhiều ──
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedIds(filteredReviews.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // ── Thao tác Xóa ──
  const handleConfirmDelete = async () => {
    if (!reviewToDelete || isDeleting) return false;
    setIsDeleting(true);
    try {
      const ok = await deleteReview(reviewToDelete.id);
      if (ok) {
        if (activeReviewDetail?.id === reviewToDelete.id) {
          setActiveReviewDetail(null);
        }
        setSelectedIds((prev) => prev.filter((id) => id !== reviewToDelete.id));
        setReviewToDelete(null);
      }
      return ok;
    } finally {
      setIsDeleting(false);
    }
  };

  // ── Thao tác Xóa hàng loạt ──
  const handleBatchDelete = async () => {
    if (selectedIds.length === 0) return;
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa vĩnh viễn ${selectedIds.length} đánh giá đã chọn?`
      )
    ) {
      for (const id of selectedIds) {
        await deleteReview(id);
      }
      setSelectedIds([]);
    }
  };

  // ── Mở modal chi tiết & phản hồi ──
  const handleOpenDetail = (review) => {
    setActiveReviewDetail(review);
    setReplyText(review.adminReply || '');
  };

  // ── Lưu phản hồi của Ban quản trị ──
  const handleSaveReply = async () => {
    if (!activeReviewDetail || !replyText.trim()) return;
    setIsReplying(true);
    try {
      if (typeof replyReview === 'function') {
        await replyReview(activeReviewDetail.id, replyText.trim());
      }
      setActiveReviewDetail((prev) =>
        prev ? { ...prev, adminReply: replyText.trim(), repliedAt: new Date().toISOString().split('T')[0] } : null
      );
    } finally {
      setIsReplying(false);
    }
  };

  // ── Xuất file CSV báo cáo ──
  const handleExportCSV = () => {
    if (filteredReviews.length === 0) {
      alert('Không có dữ liệu đánh giá để xuất.');
      return;
    }

    const headers = ['Mã ĐG', 'Khách tham quan', 'Số sao', 'Hiện vật / Dịch vụ', 'Nội dung nhận xét', 'Ngày gửi', 'Phản hồi của BQT'];
    const rows = filteredReviews.map((r) => [
      `"${r.id || ''}"`,
      `"${(r.author || '').replace(/"/g, '""')}"`,
      `"${r.rating || 5}"`,
      `"${(r.artifactName || '').replace(/"/g, '""')}"`,
      `"${(r.comment || '').replace(/"/g, '""')}"`,
      `"${r.date || ''}"`,
      `"${(r.adminReply || '').replace(/"/g, '""')}"`,
    ]);

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `danh_sach_danh_gia_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper hàm hiển thị nhãn cảm xúc
  const getSentimentBadge = (rating) => {
    const num = Number(rating) || 5;
    if (num === 5) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Sparkles className="w-3 h-3 text-emerald-600" /> Xuất sắc
        </span>
      );
    }
    if (num === 4) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Smile className="w-3 h-3 text-blue-600" /> Hài lòng
        </span>
      );
    }
    if (num === 3) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
          Bình thường
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
        <AlertTriangle className="w-3 h-3 text-rose-600" /> Cần cải thiện
      </span>
    );
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* ── 1. Page Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#8A7D6B] mb-1">
            Tổng quan / <span className="text-[#3E2712] font-semibold">Đánh giá & Phản hồi</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3E2712] tracking-tight flex items-center gap-2 uppercase">
            <MessageSquareQuote className="w-6 h-6 text-[#B8860B]" />
            <span>QUẢN LÝ ĐÁNH GIÁ & Ý KIẾN KHÁCH HÀNG</span>
          </h2>
          <p className="text-xs text-[#8A7D6B] mt-1">
            Theo dõi ý kiến khách tham quan, phân tích chỉ số hài lòng (CSAT) và kiểm duyệt các phản hồi.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            onClick={handleExportCSV}
            className="inline-flex items-center gap-2 px-4 py-2.5 text-xs font-medium bg-white text-[#3E2712] border border-stone-200 rounded-xl hover:bg-stone-50 transition-all shadow-xs cursor-pointer"
            title="Tải danh sách đánh giá dạng Excel/CSV"
          >
            <Download className="w-4 h-4 text-[#8A7D6B]" />
            <span>Xuất CSV</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="btn-primary inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 typo-btn rounded-xl shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm đánh giá</span>
          </button>
        </div>
      </div>

      {/* ── 2. Top Executive KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Tổng số đánh giá */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Tổng số đánh giá</p>
            <h3 className="text-2xl font-extrabold text-[#3E2712] mt-1">{stats.total}</h3>
            <p className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              Đã kiểm duyệt hiển thị
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-[#B8860B]">
            <MessageSquareQuote className="w-6 h-6" />
          </div>
        </div>

        {/* Card 2: Điểm CSAT trung bình */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Điểm hài lòng CSAT</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-[#B8860B]">{stats.avg}</h3>
              <span className="text-xs text-stone-400">/ 5.0</span>
            </div>
            <div className="flex items-center gap-1 mt-1 text-amber-500">
              {[1, 2, 3, 4, 5].map((s) => (
                <Star
                  key={s}
                  className={`w-3.5 h-3.5 ${
                    parseFloat(stats.avg) >= s
                      ? 'fill-amber-400 text-amber-400'
                      : 'fill-stone-200 text-stone-200'
                  }`}
                />
              ))}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        {/* Card 3: Tỷ lệ khen ngợi (4-5 sao) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Đánh giá tích cực</p>
            <div className="flex items-baseline gap-2 mt-1">
              <h3 className="text-2xl font-extrabold text-emerald-600">{stats.positivePct}%</h3>
              <span className="text-xs text-stone-500">({stats.positiveCount} bài)</span>
            </div>
            <div className="w-28 h-1.5 bg-stone-100 rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full"
                style={{ width: `${stats.positivePct}%` }}
              />
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
            <Smile className="w-6 h-6" />
          </div>
        </div>

        {/* Card 4: Cần lưu ý / Khiếu nại (1-3 sao) */}
        <div className="bg-white p-5 rounded-2xl border border-stone-200/80 shadow-xs flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-stone-500 uppercase tracking-wider">Cần quản lý chú ý</p>
            <h3 className="text-2xl font-extrabold text-[#3E2712] mt-1">{stats.attentionCount}</h3>
            <p className="text-[11px] text-amber-600 font-medium mt-1">
              Đánh giá từ 1 - 3 sao
            </p>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-50 border border-rose-100 flex items-center justify-center text-rose-500">
            <AlertTriangle className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* ── 3. Filters & Controls Toolbar ── */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200/80 shadow-xs space-y-3">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Tìm theo tên khách, nội dung, mã ĐG hoặc hiện vật..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs border border-stone-200 rounded-xl focus:outline-none focus:border-[#B8860B] focus:ring-1 focus:ring-[#B8860B]"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filters */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Lọc số sao */}
            <select
              value={starFilter}
              onChange={(e) => setStarFilter(e.target.value)}
              className="text-xs border border-stone-200 rounded-xl px-3 py-2 bg-stone-50 text-stone-700 font-medium focus:outline-none focus:border-[#B8860B]"
            >
              <option value="ALL">★ Tất cả số sao ({reviews.length})</option>
              <option value="5">★★★★★ 5 sao</option>
              <option value="4">★★★★ 4 sao</option>
              <option value="3">★★★ 3 sao</option>
              <option value="2">★★ 2 sao</option>
              <option value="1">★ 1 sao</option>
              <option value="POSITIVE">Tích cực (4 - 5 sao)</option>
              <option value="ATTENTION">Cần chú ý (1 - 3 sao)</option>
            </select>

            {/* Lọc trạng thái phản hồi */}
            <select
              value={replyFilter}
              onChange={(e) => setReplyFilter(e.target.value)}
              className="text-xs border border-stone-200 rounded-xl px-3 py-2 bg-stone-50 text-stone-700 font-medium focus:outline-none focus:border-[#B8860B]"
            >
              <option value="ALL">Mọi trạng thái phản hồi</option>
              <option value="REPLIED">Đã có phản hồi của BQT</option>
              <option value="PENDING">Chưa có phản hồi</option>
            </select>

            {/* Sắp xếp */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-xs border border-stone-200 rounded-xl px-3 py-2 bg-stone-50 text-stone-700 font-medium focus:outline-none focus:border-[#B8860B]"
            >
              <option value="newest">Mới nhất trước</option>
              <option value="oldest">Cũ nhất trước</option>
              <option value="highest">Điểm cao nhất</option>
              <option value="lowest">Điểm thấp nhất</option>
            </select>

            {/* Chuyển đổi View Mode */}
            <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'table'
                    ? 'bg-white text-[#3E2712] shadow-xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Dạng bảng chi tiết"
              >
                <LayoutList className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition-all ${
                  viewMode === 'grid'
                    ? 'bg-white text-[#3E2712] shadow-xs font-semibold'
                    : 'text-stone-500 hover:text-stone-800'
                }`}
                title="Dạng thẻ lưới"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk Action Bar (khi có mục được chọn) */}
        {selectedIds.length > 0 && (
          <div className="flex items-center justify-between bg-amber-50/80 border border-amber-200/70 px-4 py-2 rounded-xl animate-fadeIn">
            <span className="text-xs font-medium text-amber-900">
              Đang chọn <b>{selectedIds.length}</b> đánh giá
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={handleBatchDelete}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 text-white text-xs font-medium rounded-lg hover:bg-rose-700 transition-colors cursor-pointer shadow-xs"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa các mục đã chọn
              </button>
              <button
                onClick={() => setSelectedIds([])}
                className="text-xs text-stone-500 hover:text-stone-800 px-2 py-1"
              >
                Hủy chọn
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ── 4. Main Reviews Content ── */}
      {filteredReviews.length === 0 ? (
        <div className="bg-white rounded-2xl border border-stone-200/80 p-12 text-center shadow-xs">
          <div className="w-16 h-16 rounded-full bg-stone-100 flex items-center justify-center mx-auto text-stone-400 mb-3">
            <MessageSquareQuote className="w-8 h-8" />
          </div>
          <h4 className="text-base font-bold text-stone-700">Không tìm thấy đánh giá nào</h4>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            Không có kết quả nào phù hợp với bộ lọc hiện tại. Thử xóa từ khóa tìm kiếm hoặc đổi điều kiện lọc.
          </p>
          {(searchTerm || starFilter !== 'ALL' || replyFilter !== 'ALL') && (
            <button
              onClick={() => {
                setSearchTerm('');
                setStarFilter('ALL');
                setReplyFilter('ALL');
              }}
              className="mt-4 px-4 py-2 text-xs font-medium text-[#B8860B] bg-amber-50 rounded-xl border border-amber-200 hover:bg-amber-100 transition-colors"
            >
              Đặt lại tất cả bộ lọc
            </button>
          )}
        </div>
      ) : viewMode === 'table' ? (
        /* ── TABLE VIEW (Chuẩn quản trị) ── */
        <div className="bg-white rounded-2xl border border-stone-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-stone-50/80 border-b border-stone-200/80 text-[11px] font-bold text-stone-600 uppercase tracking-wider">
                  <th className="py-3.5 px-4 w-10">
                    <input
                      type="checkbox"
                      checked={
                        filteredReviews.length > 0 &&
                        selectedIds.length === filteredReviews.length
                      }
                      onChange={handleSelectAll}
                      className="rounded border-stone-300 text-[#B8860B] focus:ring-[#B8860B] cursor-pointer"
                    />
                  </th>
                  <th className="py-3.5 px-4">Mã & Ngày</th>
                  <th className="py-3.5 px-4">Khách tham quan</th>
                  <th className="py-3.5 px-4">Đánh giá & Xếp hạng</th>
                  <th className="py-3.5 px-4">Hiện vật / Dịch vụ</th>
                  <th className="py-3.5 px-4 min-w-[280px]">Nội dung nhận xét</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100 text-xs text-stone-700">
                {filteredReviews.map((rev) => {
                  const isChecked = selectedIds.includes(rev.id);
                  const ratingNum = Number(rev.rating) || 5;

                  return (
                    <tr
                      key={rev.id}
                      className={`hover:bg-amber-50/30 transition-colors ${
                        isChecked ? 'bg-amber-50/50' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3.5 px-4">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(rev.id)}
                          className="rounded border-stone-300 text-[#B8860B] focus:ring-[#B8860B] cursor-pointer"
                        />
                      </td>

                      {/* ID & Ngày */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] font-bold text-stone-800 bg-stone-100 px-2 py-0.5 rounded-md">
                          {rev.id}
                        </span>
                        <div className="text-[11px] text-stone-400 mt-1 flex items-center gap-1">
                          <Clock className="w-3 h-3 text-stone-400" />
                          {rev.date || '—'}
                        </div>
                      </td>

                      {/* Tác giả */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#5A3A1F] to-[#3A2213] text-amber-300 font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                            {(rev.author || 'K').charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="font-bold text-stone-900 truncate max-w-[130px]">
                              {rev.author || 'Ẩn danh'}
                            </p>
                            <span className="text-[10.5px] text-stone-400 block truncate max-w-[130px]">
                              {rev.authorEmail || 'Khách tham quan'}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Điểm số & Xếp hạng */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-1 text-amber-500 mb-1">
                          {Array.from({ length: 5 }).map((_, i) => (
                            <Star
                              key={i}
                              className={`w-3.5 h-3.5 ${
                                i < ratingNum
                                  ? 'fill-amber-400 text-amber-400'
                                  : 'fill-stone-200 text-stone-200'
                              }`}
                            />
                          ))}
                          <span className="font-bold text-stone-800 text-xs ml-1">
                            {ratingNum}/5
                          </span>
                        </div>
                        {getSentimentBadge(ratingNum)}
                      </td>

                      {/* Đối tượng */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1.5 text-stone-700 font-medium">
                          <Landmark className="w-3.5 h-3.5 text-[#B8860B] shrink-0" />
                          <span className="truncate max-w-[160px]">
                            {rev.artifactName || 'Bảo tàng Lịch sử'}
                          </span>
                        </span>
                      </td>

                      {/* Nhận xét */}
                      <td className="py-3.5 px-4">
                        <p className="text-stone-800 line-clamp-2 leading-relaxed italic">
                          "{rev.comment}"
                        </p>
                        {rev.adminReply && (
                          <div className="mt-1.5 text-[11px] text-blue-700 bg-blue-50/80 px-2 py-1 rounded-md border border-blue-100 flex items-center gap-1">
                            <Check className="w-3 h-3 text-blue-600" />
                            <span className="font-semibold">BQT đã phản hồi:</span> {rev.adminReply}
                          </div>
                        )}
                      </td>

                      {/* Trạng thái */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Đã công khai
                        </span>
                      </td>

                      {/* Thao tác */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleOpenDetail(rev)}
                            className="p-1.5 text-stone-500 hover:text-[#B8860B] hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Xem chi tiết & Phản hồi"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleOpenDetail(rev)}
                            className="p-1.5 text-stone-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer"
                            title="Gửi phản hồi của Ban Quản Trị"
                          >
                            <MessageCircle className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => setReviewToDelete(rev)}
                            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa đánh giá này"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-4 bg-stone-50 border-t border-stone-200/70 text-xs text-stone-500 flex flex-col sm:flex-row items-center justify-between gap-2">
            <span>
              Hiển thị <b>{filteredReviews.length}</b> trên tổng số <b>{reviews.length}</b> đánh giá
            </span>
            <span className="text-stone-400">
              Hệ thống lọc ngôn từ vi phạm (Banned keywords) tự động bật 24/7.
            </span>
          </div>
        </div>
      ) : (
        /* ── GRID / CARDS VIEW ── */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredReviews.map((rev) => {
            const ratingNum = Number(rev.rating) || 5;
            const isChecked = selectedIds.includes(rev.id);

            return (
              <div
                key={rev.id}
                className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
                  isChecked ? 'border-[#B8860B] ring-1 ring-[#B8860B] bg-amber-50/20' : 'border-stone-200/80'
                }`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#5A3A1F] to-[#3A2213] text-amber-300 font-bold text-sm flex items-center justify-center shrink-0 shadow-xs">
                        {(rev.author || 'K').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <h4 className="font-bold text-stone-900 text-sm">{rev.author}</h4>
                        <span className="text-[11px] text-stone-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" /> {rev.date}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenDetail(rev)}
                        className="p-1.5 text-stone-400 hover:text-[#B8860B] hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setReviewToDelete(rev)}
                        className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title="Xóa đánh giá"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Stars & Target */}
                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-stone-100">
                    <div className="flex items-center gap-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Star
                          key={i}
                          className={`w-3.5 h-3.5 ${
                            i < ratingNum
                              ? 'fill-amber-400 text-amber-400'
                              : 'fill-stone-200 text-stone-200'
                          }`}
                        />
                      ))}
                    </div>
                    {getSentimentBadge(ratingNum)}
                  </div>

                  {/* Artifact / Target Tag */}
                  <div className="mt-2.5 text-xs text-[#B8860B] font-medium flex items-center gap-1">
                    <Landmark className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{rev.artifactName || 'Bảo tàng Quốc gia'}</span>
                  </div>

                  {/* Comment */}
                  <div className="mt-3 p-3 bg-stone-50 rounded-xl border border-stone-100">
                    <p className="text-xs text-stone-700 leading-relaxed italic line-clamp-3">
                      "{rev.comment}"
                    </p>
                  </div>

                  {/* Reply badge if exists */}
                  {rev.adminReply && (
                    <div className="mt-2 text-[11px] text-blue-700 bg-blue-50 p-2 rounded-lg border border-blue-100">
                      <span className="font-semibold block mb-0.5">Phản hồi của BQT:</span>
                      <p className="line-clamp-2">{rev.adminReply}</p>
                    </div>
                  )}
                </div>

                {/* Footer action button */}
                <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between">
                  <span className="font-mono text-[10px] text-stone-400 font-bold bg-stone-100 px-2 py-0.5 rounded">
                    {rev.id}
                  </span>
                  <button
                    onClick={() => handleOpenDetail(rev)}
                    className="text-xs font-semibold text-[#B8860B] hover:text-[#8B5A1E] flex items-center gap-1 cursor-pointer"
                  >
                    <MessageCircle className="w-3.5 h-3.5" />
                    {rev.adminReply ? 'Sửa phản hồi' : 'Gửi phản hồi'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── 5. Modal Xem chi tiết & Phản hồi của Ban Quản Trị ── */}
      {activeReviewDetail && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl border border-stone-200 space-y-5 animate-scaleUp">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-stone-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-50 text-[#B8860B] flex items-center justify-center font-bold">
                  <MessageSquareQuote className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Chi tiết Đánh giá #{activeReviewDetail.id}</h3>
                  <p className="text-xs text-stone-400">Gửi lúc {activeReviewDetail.date || 'Hôm nay'}</p>
                </div>
              </div>
              <button
                onClick={() => setActiveReviewDetail(null)}
                className="p-1.5 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Thông tin người gửi & đối tượng */}
            <div className="bg-stone-50 p-4 rounded-2xl space-y-3 border border-stone-100">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#3A2213] text-amber-300 font-bold text-xs flex items-center justify-center">
                    {(activeReviewDetail.author || 'K').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h5 className="font-bold text-xs text-stone-900">{activeReviewDetail.author}</h5>
                    <span className="text-[11px] text-stone-400">{activeReviewDetail.authorEmail || 'Khách tham quan'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="flex items-center text-amber-400">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-4 h-4 ${
                          i < (activeReviewDetail.rating || 5)
                            ? 'fill-amber-400 text-amber-400'
                            : 'fill-stone-200 text-stone-200'
                        }`}
                      />
                    ))}
                  </div>
                  <span className="text-xs font-bold text-stone-800">
                    ({activeReviewDetail.rating || 5}/5)
                  </span>
                </div>
              </div>

              <div className="text-xs text-stone-600 flex items-center gap-1.5 pt-1">
                <Landmark className="w-4 h-4 text-[#B8860B]" />
                <span>Nội dung đánh giá về:</span>
                <b className="text-stone-900">{activeReviewDetail.artifactName || 'Bảo tàng Quốc gia'}</b>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-stone-200 text-xs text-stone-800 leading-relaxed italic">
                "{activeReviewDetail.comment}"
              </div>
            </div>

            {/* Phản hồi chính thức của Ban Quản Trị */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-stone-800 flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-blue-600" />
                Phản hồi chính thức từ Ban Quản Trị:
              </label>
              <textarea
                rows={3}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                placeholder="Nhập nội dung phản hồi, cảm ơn hoặc giải đáp thắc mắc của khách tham quan..."
                className="w-full text-xs p-3 border border-stone-200 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
              <p className="text-[11px] text-stone-400">
                Phản hồi này sẽ được hiển thị công khai bên dưới bình luận của du khách.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-between pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setReviewToDelete(activeReviewDetail);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                Xóa đánh giá này
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveReviewDetail(null)}
                  className="px-4 py-2 text-xs font-medium text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
                <button
                  type="button"
                  onClick={handleSaveReply}
                  disabled={isReplying || !replyText.trim()}
                  className="btn-primary inline-flex items-center gap-1.5 px-5 py-2 text-xs typo-btn rounded-xl shadow-xs cursor-pointer disabled:opacity-50"
                >
                  <Send className="w-3.5 h-3.5" />
                  {isReplying ? 'Đang lưu...' : 'Lưu phản hồi'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Modal Thêm Đánh Giá Mới ── */}
      {isCreateModalOpen && (
        <ReviewFormModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
        />
      )}

      {/* ── 7. Modal Xác Nhận Xóa Đánh Giá ── */}
      {reviewToDelete && (
        <ConfirmModal
          isOpen={!!reviewToDelete}
          onClose={() => setReviewToDelete(null)}
          onConfirm={handleConfirmDelete}
          itemName={`Đánh giá của ${reviewToDelete?.author} (${reviewToDelete?.rating} sao)`}
          description="Hành động này sẽ xóa vĩnh viễn đánh giá khỏi hệ thống cơ sở dữ liệu và bảng tổng hợp."
        />
      )}
    </div>
  );
};
