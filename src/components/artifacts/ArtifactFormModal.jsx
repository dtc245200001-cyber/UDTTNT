import React, { useState, useEffect, useRef } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';
import { Upload, ImagePlus, Trash2, CheckCircle2 } from 'lucide-react';

export const ArtifactFormModal = ({ isOpen, onClose, artifactToEdit = null }) => {
  const { categories, addArtifact, updateArtifact } = useApp();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = useState({
    name: '',
    category: 'Đồ đồng',
    culture: '',
    period: '',
    material: '',
    dimensions: '',
    origin: '',
    location: '',
    status: 'Đang trưng bày',
    description: '',
    image: '',
  });

  const [errors, setErrors] = useState({});
  const [isDragging, setIsDragging] = useState(false);

  useEffect(() => {
    if (artifactToEdit) {
      setFormData({
        ...artifactToEdit,
        period: artifactToEdit.period || artifactToEdit.culture || '',
        culture: artifactToEdit.culture || '',
        image: artifactToEdit.image || '',
      });
    } else {
      setFormData({
        name: '',
        category: categories[0]?.name || 'Đồ đồng',
        culture: '',
        period: 'Hiện đại',
        material: '',
        dimensions: '',
        origin: '',
        location: '',
        status: 'Đang trưng bày',
        description: '',
        image: '',
      });
    }
    setErrors({});
  }, [artifactToEdit, isOpen, categories]);

  const processImageFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setErrors((prev) => ({ ...prev, image: 'Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP...)' }));
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setErrors((prev) => ({ ...prev, image: 'Kích thước ảnh tối đa là 15MB.' }));
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Tối ưu kích thước tối đa 1600px để giữ chất lượng sắc nét mà không làm nặng DB
        const MAX_DIM = 1600;
        let width = img.width;
        let height = img.height;

        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);

        const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.88);
        setFormData((prev) => ({ ...prev, image: compressedDataUrl }));
        setErrors((prev) => {
          const next = { ...prev };
          delete next.image;
          return next;
        });
      };
      img.onerror = () => {
        setErrors((prev) => ({ ...prev, image: 'Không thể đọc tệp hình ảnh này.' }));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
    // Reset để có thể chọn lại cùng 1 file nếu cần
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên hiện vật.';
    if (!formData.category) newErrors.category = 'Vui lòng chọn danh mục hiện vật.';
    if (!formData.image || !formData.image.trim()) {
      newErrors.image = 'Vui lòng chọn hình ảnh hiện vật từ máy tính (bắt buộc).';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const finalPeriod = (formData.period || formData.culture || 'Hiện đại').trim();
    const finalCulture = (formData.culture || formData.period || '').trim();
    const payload = {
      ...formData,
      period: finalPeriod,
      culture: finalCulture,
      badge: finalPeriod,
    };

    if (artifactToEdit) {
      updateArtifact(artifactToEdit.id, payload);
    } else {
      addArtifact(payload);
    }
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={artifactToEdit ? 'Chỉnh sửa thông tin hiện vật' : 'Thêm mới hiện vật'}
      maxWidth="max-w-3xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* 1. Chọn ảnh từ máy tính (BẮT BUỘC) */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-museum-brown mb-1.5 flex items-center justify-between">
              <span>
                Hình ảnh hiện vật <span className="text-danger">* (Bắt buộc chọn từ máy tính)</span>
              </span>
              {formData.image && (
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Đã chọn ảnh
                </span>
              )}
            </label>

            {formData.image ? (
              <div className="relative rounded-2xl overflow-hidden border-2 border-museum-gold/40 bg-stone-50 p-3 flex flex-col sm:flex-row items-center gap-4">
                <div className="w-full sm:w-44 h-36 bg-museum-cream/50 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-museum-gold/20 shadow-xs">
                  <img
                    src={formData.image}
                    alt="Preview hiện vật"
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1 space-y-2 text-center sm:text-left py-1">
                  <p className="text-xs font-bold text-museum-brown">
                    Hình ảnh hiện vật đã được tải lên
                  </p>
                  <p className="text-[11px] text-gray-500 leading-relaxed">
                    Ảnh này sẽ hiển thị trên danh mục bảo tàng, chi tiết hiện vật và hỗ trợ tìm kiếm bằng hình ảnh qua AI.
                  </p>
                  <div className="flex items-center justify-center sm:justify-start gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="px-3.5 py-1.5 bg-museum-cream hover:bg-museum-gold/20 text-museum-brown text-xs font-bold rounded-xl border border-museum-gold/40 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <ImagePlus className="w-3.5 h-3.5 text-museum-gold" />
                      <span>Đổi ảnh khác</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, image: '' }))}
                      className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-danger text-xs font-bold rounded-xl border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa ảnh</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div
                role="button"
                tabIndex={0}
                onClick={() => fileInputRef.current?.click()}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`w-full p-6 border-2 border-dashed rounded-2xl flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-200 ${
                  isDragging
                    ? 'border-museum-gold bg-museum-gold/15 scale-[1.01]'
                    : errors.image
                    ? 'border-danger bg-red-50/50 hover:bg-red-50'
                    : 'border-museum-gold/40 bg-museum-cream/20 hover:border-museum-gold hover:bg-museum-cream/50'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-white shadow-xs border border-museum-gold/30 flex items-center justify-center mb-2 text-museum-brown">
                  <Upload className="w-6 h-6 text-museum-gold" />
                </div>
                <p className="text-xs font-bold text-museum-brown mb-1">
                  Nhấp để chọn ảnh từ máy tính <span className="text-gray-400 font-normal">hoặc kéo thả tệp vào đây</span>
                </p>
                <p className="text-[11px] text-gray-500">
                  Hỗ trợ định dạng: JPG, PNG, WEBP (Tối đa 15MB) • <span className="text-danger font-semibold">Bắt buộc chọn ảnh</span>
                </p>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {errors.image && (
              <p className="text-xs text-danger font-semibold mt-1.5 flex items-center gap-1">
                <span>⚠️ {errors.image}</span>
              </p>
            )}
          </div>

          {/* 2. Tên hiện vật */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-museum-brown mb-1">
              Tên hiện vật <span className="text-danger">*</span>
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Trống đồng Đông Sơn"
              className={`w-full px-3.5 py-2 bg-gray-50 border text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold ${
                errors.name ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
            {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
          </div>

          {/* 3. Danh mục */}
          <div>
            <label className="block text-xs font-bold text-museum-brown mb-1">
              Danh mục <span className="text-danger">*</span>
            </label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          {/* 4. Trạng thái */}
          <div>
            <label className="block text-xs font-bold text-museum-brown mb-1">Trạng thái</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            >
              <option value="Đang trưng bày">Đang trưng bày</option>
              <option value="Trong kho">Trong kho</option>
              <option value="Bảo trì">Bảo trì</option>
            </select>
          </div>

          {/* 5. Thời kỳ */}
          <div>
            <label className="block text-xs font-bold text-museum-brown mb-1">
              Thời kỳ <span className="text-stone-400 font-normal">(VD: Hiện đại, Cổ đại, Thời Lý...)</span>
            </label>
            <input
              type="text"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              placeholder="VD: Hiện đại / Cổ đại / Thời Lý"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            />
          </div>

          {/* 6. Văn hóa / Niên đại */}
          <div>
            <label className="block text-xs font-bold text-museum-brown mb-1">
              Văn hóa / Niên đại <span className="text-stone-400 font-normal">(VD: Văn hóa Đông Sơn / 1200 - 200 TCN)</span>
            </label>
            <input
              type="text"
              value={formData.culture}
              onChange={(e) => setFormData({ ...formData, culture: e.target.value })}
              placeholder="VD: Văn hóa Đông Sơn / 1200 - 200 TCN"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            />
          </div>

          {/* 7. Chất liệu */}
          <div>
            <label className="block text-xs font-bold text-museum-brown mb-1">Chất liệu</label>
            <input
              type="text"
              value={formData.material}
              onChange={(e) => setFormData({ ...formData, material: e.target.value })}
              placeholder="VD: Đồng đúc / Đá sa thạch"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            />
          </div>

          {/* 8. Kích thước */}
          <div>
            <label className="block text-xs font-bold text-museum-brown mb-1">Kích thước</label>
            <input
              type="text"
              value={formData.dimensions}
              onChange={(e) => setFormData({ ...formData, dimensions: e.target.value })}
              placeholder="VD: Cao 45cm, đường kính 80cm"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            />
          </div>

          {/* 9. Nguồn gốc */}
          <div>
            <label className="block text-xs font-bold text-museum-brown mb-1">Nguồn gốc</label>
            <input
              type="text"
              value={formData.origin}
              onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
              placeholder="VD: Thanh Hóa"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            />
          </div>

          {/* 10. Vị trí trưng bày */}
          <div>
            <label className="block text-xs font-bold text-museum-brown mb-1">Vị trí trưng bày</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="VD: Phòng trưng bày A - Kệ 3"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            />
          </div>

          {/* 11. Mô tả */}
          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-museum-brown mb-1">Mô tả chi tiết</label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Mô tả chi tiết lịch sử, giá trị văn hóa và đặc điểm hiện vật..."
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-stone-100 pt-4 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="btn-secondary px-5 py-2.5 typo-btn rounded-full cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="btn-primary px-5 py-2.5 typo-btn rounded-full cursor-pointer shadow-sm"
          >
            {artifactToEdit ? 'Lưu thay đổi' : 'Thêm hiện vật'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
