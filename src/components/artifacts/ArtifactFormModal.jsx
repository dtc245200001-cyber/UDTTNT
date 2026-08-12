import React, { useState, useEffect } from 'react';
import { Modal } from '@/components/ui/Modal';
import { useApp } from '@/context/AppContext';

export const ArtifactFormModal = ({ isOpen, onClose, artifactToEdit = null }) => {
  const { categories, addArtifact, updateArtifact } = useApp();

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
    image: '/images/trong-dong.jpg',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (artifactToEdit) {
      setFormData(artifactToEdit);
    } else {
      setFormData({
        name: '',
        category: categories[0]?.name || 'Đồ đồng',
        culture: '',
        period: '',
        material: '',
        dimensions: '',
        origin: '',
        location: '',
        status: 'Đang trưng bày',
        description: '',
        image: '/images/trong-dong.jpg',
      });
    }
    setErrors({});
  }, [artifactToEdit, isOpen, categories]);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) newErrors.name = 'Vui lòng nhập tên hiện vật.';
    if (!formData.category) newErrors.category = 'Vui lòng chọn danh mục hiện vật.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    if (artifactToEdit) {
      updateArtifact(artifactToEdit.id, formData);
    } else {
      addArtifact(formData);
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
          {/* Tên hiện vật */}
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

          {/* Danh mục */}
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

          {/* Trạng thái */}
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

          {/* Văn hóa / Thời kỳ */}
          <div>
            <label className="block text-xs font-bold text-museum-brown mb-1">Văn hóa / Thời kỳ</label>
            <input
              type="text"
              value={formData.culture}
              onChange={(e) => setFormData({ ...formData, culture: e.target.value })}
              placeholder="VD: Văn hóa Đông Sơn / Thời Lý"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            />
          </div>

          {/* Niên đại */}
          <div>
            <label className="block text-xs font-bold text-museum-brown mb-1">Niên đại</label>
            <input
              type="text"
              value={formData.period}
              onChange={(e) => setFormData({ ...formData, period: e.target.value })}
              placeholder="VD: 1200 - 200 TCN"
              className="w-full px-3.5 py-2 bg-gray-50 border border-gray-200 text-sm rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
            />
          </div>

          {/* Chất liệu */}
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

          {/* Kích thước */}
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

          {/* Nguồn gốc */}
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

          {/* Vị trí trưng bày */}
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

          {/* Mô tả */}
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

        <div className="flex items-center justify-end gap-3 border-t border-gray-100 pt-4 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-5 py-2 rounded-xl bg-museum-brown text-white hover:bg-museum-brown-dk font-medium text-sm transition-colors shadow-sm"
          >
            {artifactToEdit ? 'Lưu thay đổi' : 'Thêm hiện vật'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
