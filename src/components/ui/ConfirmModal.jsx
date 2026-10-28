import React, { useState } from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, itemName, description }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const result = await onConfirm?.();
      if (result !== false) {
        onClose();
      }
    } catch (err) {
      console.error('Lỗi khi thực hiện xác nhận trong ConfirmModal:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) onClose?.();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Xác nhận xoá" maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center text-red-600 mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <p className="text-stone-700 text-base mb-6">
          Bạn có chắc chắn muốn xoá <span className="font-bold text-[#3E2712]">"{itemName}"</span> này? Hành động này không thể hoàn tác.
          {description && (
            <span className="block mt-2 text-sm text-stone-500">{description}</span>
          )}
        </p>
        <div className="flex items-center justify-end gap-3 w-full border-t border-stone-100 pt-4">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="btn-secondary px-5 py-2.5 typo-btn rounded-full cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleConfirm}
            className={`px-5 py-2.5 rounded-full bg-red-600 text-white hover:bg-red-700 font-semibold typo-btn transition-colors shadow-xs cursor-pointer ${
              isSubmitting ? 'opacity-60 cursor-not-allowed' : ''
            }`}
          >
            {isSubmitting ? 'Đang xoá...' : 'Xoá'}
          </button>
        </div>
      </div>
    </Modal>
  );
};
