import React, { useRef, useState } from 'react';
import { ImagePlus, Trash2, UploadCloud, CheckCircle2, AlertCircle } from 'lucide-react';

export const ImageUploadField = ({
  value,
  onChange,
  error,
  label = 'Hình ảnh',
  required = true,
  description = 'Ảnh này sẽ hiển thị làm ảnh bìa chính trên hệ thống bảo tàng.',
  className = '',
}) => {
  const fileInputRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);
  const [localError, setLocalError] = useState('');

  const processImageFile = (file) => {
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setLocalError('Vui lòng chọn tệp hình ảnh hợp lệ (JPG, PNG, WebP...)');
      return;
    }

    if (file.size > 15 * 1024 * 1024) {
      setLocalError('Kích thước ảnh tối đa là 15MB.');
      return;
    }

    setLocalError('');
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Tối ưu kích thước tối đa 1600px để giữ chất lượng cao mà không làm quá nặng dữ liệu
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
        onChange?.(compressedDataUrl);
      };
      img.onerror = () => {
        setLocalError('Không thể đọc tệp hình ảnh này.');
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

  const activeError = error || localError;

  return (
    <div className={`space-y-1.5 ${className}`}>
      {/* Label & Status */}
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-museum-brown">
          <span>{label}</span>
          {required && (
            <span className="text-red-500 font-semibold ml-1">
              * (Bắt buộc chọn từ máy tính)
            </span>
          )}
        </label>
        {value && (
          <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Đã chọn ảnh
          </span>
        )}
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Upload Zone / Image Preview */}
      {value ? (
        <div className="relative rounded-2xl overflow-hidden border-2 border-museum-gold/40 bg-stone-50 p-3 flex flex-col sm:flex-row items-center gap-4">
          <div className="w-full sm:w-44 h-36 bg-museum-cream/50 rounded-xl overflow-hidden flex items-center justify-center shrink-0 border border-museum-gold/20 shadow-xs">
            <img
              src={value}
              alt="Preview"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.src = '/images/museum-hero.jpg';
              }}
            />
          </div>
          <div className="flex-1 space-y-2 text-center sm:text-left py-1 w-full">
            <p className="text-xs font-bold text-museum-brown">
              Hình ảnh đã được tải lên thành công
            </p>
            <p className="text-[11px] text-gray-500 leading-relaxed">
              {description}
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
                onClick={() => onChange?.('')}
                className="px-3.5 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 text-xs font-bold rounded-xl border border-red-200 transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
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
          className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-museum-gold bg-amber-50/80 scale-[1.01]'
              : activeError
              ? 'border-red-400 bg-red-50/40 hover:bg-red-50/60'
              : 'border-stone-300 bg-stone-50/60 hover:bg-stone-50 hover:border-museum-gold'
          }`}
        >
          <div className="w-12 h-12 mx-auto mb-2.5 rounded-full bg-museum-cream/80 border border-museum-gold/30 flex items-center justify-center text-museum-gold">
            <UploadCloud className="w-6 h-6 stroke-[1.8]" />
          </div>
          <div className="space-y-1">
            <p className="text-xs font-bold text-museum-brown">
              Nhấn để chọn ảnh từ máy tính hoặc kéo thả ảnh vào đây
            </p>
            <p className="text-[11px] text-gray-500">
              Định dạng hỗ trợ: PNG, JPG, JPEG, WebP (Tối đa 15MB, tự động tối ưu hóa)
            </p>
          </div>
        </div>
      )}

      {/* Error message */}
      {activeError && (
        <p className="text-xs text-red-500 font-semibold flex items-center gap-1 pt-0.5">
          <AlertCircle className="w-3.5 h-3.5 text-red-500 shrink-0" />
          <span>{activeError}</span>
        </p>
      )}
    </div>
  );
};
