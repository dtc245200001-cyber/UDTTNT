import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Plus, ChevronRight, FolderTree, Pencil, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ImageUploadField } from '@/components/common/ImageUploadField';

// Specific image mappings matching the screenshot
const categoryImageMap = {
  DM01: '/images/vu-khi-quan-su.jpg',
  DM02: '/images/events/hero-events.jpg',
  DM03: '/images/sach-co-chu-han.jpg',
  DM04: '/images/events/thang-long-night.jpg',
  DM05: '/images/trang-phuc-trieu-dinh.jpg',
  DM06: '/images/binh-gom.jpg',
  DM07: '/images/tuong-phat.jpg',
  DM08: '/images/trong-dong.jpg',
  DM09: '/images/tuong-da-linh-vat.jpg',
  DM10: '/images/events/chu-dau-ceramic.jpg',
  DM11: '/images/museum-hero.jpg',
  DM12: '/images/events/dong-son-drum.jpg',
  DM13: '/images/bia-tien-si.jpg',
};

const EMPTY_FORM = { name: '', description: '', image: '' };

export const Categories = () => {
  const navigate = useNavigate();
  const { categories, addCategory, updateCategory, deleteCategory, currentUser } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [formData, setFormData] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const openAdd = () => {
    setEditingCategory(null);
    setFormData(EMPTY_FORM);
    setErrors({});
    setIsFormOpen(true);
  };

  const openEdit = (item, e) => {
    if (e) e.stopPropagation();
    setEditingCategory(item);
    setFormData({
      name: item.name || '',
      description: item.description || '',
      image: item.image || categoryImageMap[item.id] || '',
    });
    setErrors({});
    setIsFormOpen(true);
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Vui lòng nhập tên danh mục.';
    if (!formData.image || !formData.image.trim()) {
      errs.image = 'Vui lòng chọn hình ảnh danh mục từ máy tính (bắt buộc).';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate() || isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (editingCategory) {
        const ok = await updateCategory(editingCategory.id, formData);
        if (ok) setIsFormOpen(false);
      } else {
        const created = await addCategory(formData);
        if (created) setIsFormOpen(false);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget || isDeleting) return;
    setIsDeleting(true);
    try {
      const ok = await deleteCategory(deleteTarget.id);
      if (ok) setDeleteTarget(null);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn pb-8 max-w-[1400px] mx-auto font-sans w-full min-w-0">
      {/* Header: Breadcrumbs, Title and + Thêm danh mục Button */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          {/* Breadcrumbs matching museum theme */}
          <div className="text-xs text-[#8A7D6B] font-medium mb-1">
            <Link to="/dashboard" className="hover:text-[#3E2712] transition-colors">
              Tổng quan
            </Link>
            <span className="mx-1.5 text-[#8A7D6B] font-normal">/</span>
            <span className="text-[#3E2712] font-semibold">Danh mục</span>
          </div>

          {/* Title */}
          <h1 className="text-xl sm:text-2xl font-bold text-[#3E2712] tracking-tight uppercase">
            DANH MỤC HIỆN VẬT
          </h1>
        </div>

        {/* Button + Thêm danh mục matching museum theme */}
        {isAdmin && (
          <button
            onClick={openAdd}
            className="btn-primary inline-flex items-center justify-center gap-1.5 px-5 py-2.5 typo-btn rounded-full shadow-sm cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm danh mục</span>
          </button>
        )}
      </div>

      {/* Categories Grid (4 columns matching screenshot) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {categories.map((c) => {
          const imageSrc = c.image || categoryImageMap[c.id] || '/images/dong-son-showcase.jpg';
          const isFeatured = c.id === 'DM02'; // Highlights DM02 with warm gold title

          return (
            <div
              key={c.id}
              role="button"
              tabIndex={0}
              onClick={() => navigate(`/artifacts?category=${encodeURIComponent(c.id)}`)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  navigate(`/artifacts?category=${encodeURIComponent(c.id)}`);
                }
              }}
              className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex flex-col justify-between group cursor-pointer"
            >
              <div>
                {/* Top Row: Thumbnail with "tg" badge + Count */}
                <div className="flex items-center justify-between mb-3">
                  {/* Thumbnail Container */}
                  <div className="relative w-20 h-13 rounded-xl overflow-hidden bg-[#FAF6EF] border border-stone-200/80 shrink-0">
                    <img
                      src={imageSrc}
                      alt={c.name}
                      onError={(e) => {
                        e.target.src = '/images/dong-son-showcase.jpg';
                      }}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                    {/* "tg" museum badge overlay */}
                    <div className="absolute top-1 left-1 px-1.5 py-0.5 rounded-md bg-[#FAF6EF]/95 border border-[#E8DDCC] text-[10px] font-bold text-[#B8860B] font-serif shadow-2xs leading-none">
                      tg
                    </div>
                  </div>

                  {/* Artifact Count Badge */}
                  <span className="text-xs font-semibold text-[#8A7D6B]">
                    {c.count} hiện vật
                  </span>
                </div>

                {/* Category Title */}
                <h3
                  className={`font-bold text-sm sm:text-[15px] transition-colors line-clamp-2 leading-snug ${
                    isFeatured
                      ? 'text-[#B8860B]'
                      : 'text-[#3E2712] group-hover:text-[#B8860B]'
                  }`}
                >
                  {c.name}
                </h3>

                {/* Category Description */}
                <p className="text-xs text-[#8A7D6B] mt-1.5 line-clamp-2 leading-relaxed">
                  {c.description}
                </p>
              </div>

              {/* Card Footer: Category Code + Chevron arrow + Admin actions */}
              <div className="pt-3 mt-4 border-t border-stone-200/60 flex items-center justify-between text-xs text-[#8A7D6B] font-medium">
                <span>Mã: {c.id}</span>
                <div className="flex items-center gap-1.5">
                  {isAdmin && (
                    <>
                      <button
                        onClick={(e) => openEdit(c, e)}
                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-[#5B3A1F] hover:bg-[#FAF6EF] border border-stone-200/80 shadow-xs cursor-pointer"
                        title="Sửa danh mục"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(c); }}
                        className="w-8 h-8 bg-white rounded-lg flex items-center justify-center text-red-500 hover:bg-red-50 border border-stone-200/80 shadow-xs cursor-pointer"
                        title="Xóa danh mục"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </>
                  )}
                  <ChevronRight className="w-4 h-4 text-[#B8860B] group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Thêm / Sửa danh mục */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => { if (!isSubmitting) setIsFormOpen(false); }}
        title={editingCategory ? 'Chỉnh sửa danh mục' : 'Thêm danh mục mới'}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-[#5B3A1F] uppercase mb-1">
              Tên danh mục <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="Ví dụ: Cổ vật cung đình, Tiền cổ..."
              className={`w-full px-3.5 py-2.5 rounded-xl border text-xs text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B] bg-white ${errors.name ? 'border-red-400 bg-red-50' : 'border-stone-200/80'}`}
            />
            {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
          </div>

          {/* Chọn ảnh danh mục từ máy tính (BẮT BUỘC) */}
          <div>
            <ImageUploadField
              value={formData.image}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, image: val }));
                if (errors.image) setErrors((prev) => ({ ...prev, image: null }));
              }}
              error={errors.image}
              label="Hình ảnh đại diện danh mục"
              required={true}
              description="Ảnh này sẽ hiển thị làm ảnh minh họa của thẻ danh mục trên hệ thống."
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#5B3A1F] uppercase mb-1">
              Mô tả danh mục
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Mô tả tóm tắt về các hiện vật trong danh mục..."
              className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200/80 text-xs text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B] bg-white resize-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200/60">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
              className="btn-secondary px-5 py-2 rounded-full text-xs cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-5 py-2 rounded-full text-xs shadow-xs cursor-pointer disabled:opacity-60"
            >
              {isSubmitting ? 'Đang lưu...' : editingCategory ? 'Lưu thay đổi' : 'Lưu danh mục'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => { if (!isDeleting) setDeleteTarget(null); }}
        onConfirm={confirmDelete}
        itemName={deleteTarget?.name || ''}
        description="Danh mục sẽ bị xóa. Các hiện vật thuộc danh mục này vẫn được giữ lại."
      />
    </div>
  );
};
