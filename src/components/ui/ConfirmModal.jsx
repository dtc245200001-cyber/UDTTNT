import React from 'react';
import { Modal } from './Modal';
import { AlertTriangle } from 'lucide-react';

export const ConfirmModal = ({ isOpen, onClose, onConfirm, itemName }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Xác nhận xoá" maxWidth="max-w-md">
      <div className="flex flex-col items-center text-center py-2">
        <div className="w-14 h-14 bg-rose-50 rounded-full flex items-center justify-center text-danger mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <p className="text-gray-700 text-base mb-6">
          Bạn có chắc chắn muốn xoá <span className="font-bold text-museum-brown">"{itemName}"</span> này? Hành động này không thể hoàn tác.
        </p>
        <div className="flex items-center justify-end gap-3 w-full border-t border-gray-100 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl border border-gray-300 text-gray-700 hover:bg-gray-50 font-medium text-sm transition-colors"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-5 py-2.5 rounded-xl bg-danger text-white hover:bg-red-700 font-medium text-sm transition-colors shadow-sm"
          >
            Xoá
          </button>
        </div>
      </div>
    </Modal>
  );
};
