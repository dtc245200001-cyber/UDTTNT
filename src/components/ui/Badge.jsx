import React from 'react';

export const Badge = ({ children, variant = 'default', className = '' }) => {
  let styleClasses = 'bg-gray-100 text-gray-700';

  if (variant === 'success' || children === 'Đang trưng bày' || children === 'Đang diễn ra' || children === 'Hoạt động') {
    styleClasses = 'bg-emerald-100 text-emerald-800 border border-emerald-200';
  } else if (variant === 'danger' || children === 'Bảo trì' || children === 'Đã kết thúc' || children === 'Tạm khóa') {
    styleClasses = 'bg-rose-100 text-rose-800 border border-rose-200';
  } else if (variant === 'warning' || children === 'Trong kho' || children === 'Sắp diễn ra' || children === 'Bản nháp') {
    styleClasses = 'bg-amber-100 text-amber-800 border border-amber-200';
  } else if (variant === 'gold') {
    styleClasses = 'bg-museum-cream text-museum-brown border border-museum-gold/30 font-semibold';
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold whitespace-nowrap ${styleClasses} ${className}`}
    >
      {children}
    </span>
  );
};
