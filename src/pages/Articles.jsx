import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  FileText,
  Plus,
  Eye,
  Search,
  Pencil,
  Trash2,
  Calendar,
  User,
  Tag,
  Clock,
  Filter,
  X,
  AlertCircle,
} from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';

const DEFAULT_CATEGORIES = [
  'Nghiên cứu di sản',
  'Kỹ thuật bảo tồn',
  'Công nghệ bảo tàng',
  'Giới thiệu hiện vật',
  'Tin tức sự kiện',
];

const EMPTY_FORM = {
  title: '',
  author: '',
  category: 'Nghiên cứu di sản',
  status: 'Đã xuất bản',
  date: new Date().toISOString().split('T')[0],
  content: '',
};

export const Articles = () => {
  const { articles = [], addArticle, updateArticle, deleteArticle, currentUser } = useApp();
  const isAdmin = currentUser?.role === 'admin';

  // Filters & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('Tất cả');
  const [selectedStatus, setSelectedStatus] = useState('Tất cả');

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Extract all categories present in data + defaults
  const allCategories = useMemo(() => {
    const fromData = articles.map((a) => a.category).filter(Boolean);
    const set = new Set(['Tất cả', ...DEFAULT_CATEGORIES, ...fromData]);
    return Array.from(set);
  }, [articles]);

  // Filtered Articles
  const filteredArticles = useMemo(() => {
    return articles.filter((art) => {
      const q = searchTerm.trim().toLowerCase();
      const matchSearch =
        !q ||
        (art.title && art.title.toLowerCase().includes(q)) ||
        (art.author && art.author.toLowerCase().includes(q)) ||
        (art.category && art.category.toLowerCase().includes(q)) ||
        (art.content && art.content.toLowerCase().includes(q));

      const matchCategory =
        selectedCategory === 'Tất cả' || art.category === selectedCategory;

      const matchStatus =
        selectedStatus === 'Tất cả' || art.status === selectedStatus;

      return matchSearch && matchCategory && matchStatus;
    });
  }, [articles, searchTerm, selectedCategory, selectedStatus]);

  // Form Handlers
  const handleOpenCreate = () => {
    setEditingArticle(null);
    setFormData({
      ...EMPTY_FORM,
      author: currentUser?.name || 'Ban biên tập',
      date: new Date().toISOString().split('T')[0],
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (art, e) => {
    if (e) e.stopPropagation();
    setEditingArticle(art);
    setFormData({
      title: art.title || '',
      author: art.author || '',
      category: art.category || 'Nghiên cứu di sản',
      status: art.status || 'Đã xuất bản',
      date: art.date || new Date().toISOString().split('T')[0],
      content: art.content || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề bài viết.';
    }
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingArticle) {
        const ok = await updateArticle(editingArticle.id, formData);
        if (ok) {
          setIsFormOpen(false);
          setEditingArticle(null);
        }
      } else {
        const created = await addArticle(formData);
        if (created) {
          setIsFormOpen(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler (Async-safe: returns ok for ConfirmModal)
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return false;
    setIsDeleting(true);
    try {
      const ok = await deleteArticle(deleteTarget.id);
      if (ok) {
        setDeleteTarget(null);
      }
      return ok;
    } finally {
      setIsDeleting(false);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedCategory('Tất cả');
    setSelectedStatus('Tất cả');
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8 max-w-[1400px] mx-auto font-sans w-full min-w-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="text-xs font-medium text-[#8A7D6B] mb-1 flex items-center gap-1.5">
            <Link to="/dashboard" className="hover:text-[#3E2712] transition-colors">
              Tổng quan
            </Link>
            <span>/</span>
            <span className="text-[#3E2712] font-semibold">Bài viết</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#3E2712] tracking-tight uppercase">
            QUẢN LÝ BÀI VIẾT & TIN TỨC
          </h1>
          <p className="text-xs text-[#8A7D6B] mt-1">
            Quản lý các bài nghiên cứu di sản, kỹ thuật bảo tồn và tin tức bảo tàng kết nối Supabase PostgreSQL.
          </p>
        </div>

        {isAdmin && (
          <button
            type="button"
            onClick={handleOpenCreate}
            className="btn-primary inline-flex items-center gap-2 px-5 py-2.5 typo-btn rounded-full shadow-sm cursor-pointer self-start sm:self-auto"
          >
            <Plus className="w-4 h-4" />
            <span>+ Viết bài mới</span>
          </button>
        )}
      </div>

      {/* Search and Filters Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-stone-200/80 shadow-xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3 items-center">
          {/* Search Bar */}
          <div className="lg:col-span-5 relative">
            <Search className="w-4 h-4 text-[#8A7D6B] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm bài viết theo tiêu đề, tác giả, nội dung..."
              className="w-full pl-10 pr-4 py-2.5 bg-[#F7F3EE] border border-stone-200/80 rounded-full text-xs sm:text-sm text-[#3E2712] placeholder-[#8A7D6B] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 p-0.5 cursor-pointer"
                title="Xóa tìm kiếm"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div className="lg:col-span-4">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F3EE] border border-stone-200/80 rounded-full text-xs sm:text-sm text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all cursor-pointer"
            >
              {allCategories.map((cat) => (
                <option key={cat} value={cat}>
                  {cat === 'Tất cả' ? 'Tất cả chuyên mục' : cat}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div className="lg:col-span-3">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-[#F7F3EE] border border-stone-200/80 rounded-full text-xs sm:text-sm text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all cursor-pointer"
            >
              <option value="Tất cả">Tất cả trạng thái</option>
              <option value="Đã xuất bản">Đã xuất bản</option>
              <option value="Bản nháp">Bản nháp</option>
            </select>
          </div>
        </div>

        {/* Counter & Clear Filter indicator */}
        <div className="flex flex-wrap items-center justify-between text-xs text-[#8A7D6B] pt-2 border-t border-stone-200/60">
          <div>
            Hiển thị <span className="font-bold text-[#3E2712]">{filteredArticles.length}</span> trên tổng số{' '}
            <span className="font-semibold text-[#3E2712]">{articles.length}</span> bài viết
          </div>
          {(searchTerm || selectedCategory !== 'Tất cả' || selectedStatus !== 'Tất cả') && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-[#B8860B] hover:text-[#5B3A1F] font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              <X className="w-3 h-3" />
              Đặt lại bộ lọc
            </button>
          )}
        </div>
      </div>

      {/* Articles Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#FAF6EF] text-[#3E2712] text-xs font-bold uppercase tracking-wider border-b border-[#E8DDCC]">
                <th className="py-3.5 px-4 min-w-[280px]">Tiêu đề bài viết</th>
                <th className="py-3.5 px-4 min-w-[150px]">Chuyên mục</th>
                <th className="py-3.5 px-4 min-w-[140px]">Tác giả</th>
                <th className="py-3.5 px-4 min-w-[110px]">Trạng thái</th>
                <th className="py-3.5 px-4 min-w-[100px]">Lượt xem</th>
                <th className="py-3.5 px-4 min-w-[110px]">Ngày đăng</th>
                {isAdmin && <th className="py-3.5 px-4 text-right min-w-[110px]">Thao tác</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60 text-xs text-[#3E2712]">
              {filteredArticles.length === 0 ? (
                <tr>
                  <td colSpan={isAdmin ? 7 : 6} className="py-12 text-center text-[#8A7D6B]">
                    <FileText className="w-10 h-10 mx-auto text-stone-300 mb-2" />
                    <p className="text-sm font-semibold text-[#3E2712]">Không tìm thấy bài viết nào</p>
                    <p className="text-xs text-[#8A7D6B] mt-1">
                      {searchTerm || selectedCategory !== 'Tất cả' || selectedStatus !== 'Tất cả'
                        ? 'Thử thay đổi từ khóa hoặc đặt lại bộ lọc tìm kiếm.'
                        : 'Hiện chưa có bài viết nào trong hệ thống.'}
                    </p>
                  </td>
                </tr>
              ) : (
                filteredArticles.map((art) => (
                  <tr key={art.id} className="hover:bg-[#FAF6EF]/60 transition-colors">
                    {/* Tiêu đề & ID */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#3E2712] text-sm leading-snug">
                        {art.title}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="font-mono text-[10px] text-[#8A7D6B] uppercase tracking-wider bg-[#F7F3EE] px-1.5 py-0.5 rounded border border-stone-200/60">
                          {art.id}
                        </span>
                        {art.content && (
                          <span className="text-[11px] text-[#8A7D6B] line-clamp-1 italic max-w-md">
                            {art.content}
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Chuyên mục */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-medium text-[#5B3A1F]">
                        <Tag className="w-3 h-3 text-[#B8860B]" />
                        {art.category || 'Nghiên cứu di sản'}
                      </span>
                    </td>

                    {/* Tác giả */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 text-[#3E2712] font-medium">
                        <User className="w-3 h-3 text-[#8A7D6B]" />
                        {art.author || 'Ban biên tập'}
                      </span>
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4">
                      <Badge variant={art.status === 'Đã xuất bản' ? 'success' : 'warning'}>
                        {art.status}
                      </Badge>
                    </td>

                    {/* Lượt xem */}
                    <td className="py-3.5 px-4 text-[#8A7D6B] font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Eye className="w-3.5 h-3.5 text-[#8A7D6B]" />
                        {Number(art.views || 0).toLocaleString('vi-VN')}
                      </span>
                    </td>

                    {/* Ngày đăng */}
                    <td className="py-3.5 px-4 text-[#8A7D6B]">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-[#8A7D6B]" />
                        {art.date || 'Chưa rõ'}
                      </span>
                    </td>

                    {/* Thao tác (chỉ Admin) */}
                    {isAdmin && (
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={(e) => handleOpenEdit(art, e)}
                            className="p-1.5 rounded-lg text-[#8A7D6B] hover:text-[#B8860B] hover:bg-[#FAF6EF] transition-colors cursor-pointer"
                            title="Chỉnh sửa bài viết"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteTarget(art);
                            }}
                            className="p-1.5 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 transition-colors cursor-pointer"
                            title="Xóa bài viết"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create / Edit Modal */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          if (!isSubmitting) setIsFormOpen(false);
        }}
        title={editingArticle ? 'Chỉnh sửa bài viết' : 'Viết bài mới'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Tiêu đề bài viết */}
          <div>
            <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
              Tiêu đề bài viết <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (formErrors.title) setFormErrors({ ...formErrors, title: null });
              }}
              placeholder="Ví dụ: Hành trình phục dựng họa tiết Trống đồng Đông Sơn..."
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-[#3E2712] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all ${
                formErrors.title ? 'border-rose-400 ring-rose-200' : 'border-stone-200/80'
              }`}
            />
            {formErrors.title && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {formErrors.title}
              </p>
            )}
          </div>

          {/* Chuyên mục & Tác giả */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
                Chuyên mục <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all cursor-pointer"
              >
                {DEFAULT_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
                Tác giả / Người biên soạn
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                placeholder="Tên tác giả hoặc cơ quan nghiên cứu..."
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all"
              />
            </div>
          </div>

          {/* Trạng thái & Ngày đăng */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
                Trạng thái <span className="text-rose-500">*</span>
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all cursor-pointer"
              >
                <option value="Đã xuất bản">Đã xuất bản</option>
                <option value="Bản nháp">Bản nháp</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
                Ngày đăng
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all"
              />
            </div>
          </div>

          {/* Nội dung bài viết */}
          <div>
            <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
              Nội dung bài viết
            </label>
            <textarea
              rows={5}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Nhập nội dung tóm tắt, trích đoạn hoặc toàn văn bài viết..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all resize-y"
            />
          </div>

          {/* Note khi edit: bảo lưu views và id */}
          {editingArticle && (
            <div className="p-3 bg-[#FAF6EF] rounded-xl border border-stone-200/80 text-xs text-[#8A7D6B] flex items-center justify-between">
              <div>
                Mã bài viết: <span className="font-mono font-bold text-[#3E2712]">{editingArticle.id}</span>
              </div>
              <div>
                Lượt xem hiện tại:{' '}
                <span className="font-bold text-[#3E2712]">
                  {Number(editingArticle.views || 0).toLocaleString('vi-VN')}
                </span>{' '}
                <span className="text-[#8A7D6B]">(được giữ nguyên)</span>
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200/60">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
              className="btn-secondary px-5 py-2.5 rounded-full text-xs cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-5 py-2.5 rounded-full text-xs shadow-xs cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {isSubmitting
                ? 'Đang lưu...'
                : editingArticle
                ? 'Lưu thay đổi'
                : 'Lưu bài viết'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={deleteTarget?.title || ''}
        description="Bài viết sẽ bị xoá vĩnh viễn khỏi hệ thống Supabase. Hành động này không thể hoàn tác."
      />
    </div>
  );
};

