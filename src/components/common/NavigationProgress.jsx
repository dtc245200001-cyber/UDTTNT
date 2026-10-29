import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

/**
 * NavigationProgress — Hiển thị thanh tiến trình màu vàng hoàng kim siêu mượt
 * ở đỉnh trình duyệt mỗi khi chuyển trang, loại bỏ cảm giác chờ đợi trắng trang.
 */
export const NavigationProgress = () => {
  const location = useLocation();
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // 1. Tự động cuộn lên đầu trang tức thì
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });

    // 2. Kích hoạt thanh tiến trình
    setVisible(true);
    setProgress(35);

    const timer1 = setTimeout(() => {
      setProgress(80);
    }, 100);

    const timer2 = setTimeout(() => {
      setProgress(100);
    }, 220);

    const timer3 = setTimeout(() => {
      setVisible(false);
      setProgress(0);
    }, 450);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [location.pathname, location.search]);

  if (!visible && progress === 0) return null;

  return (
    <div
      className="fixed top-0 left-0 right-0 h-[2.5px] z-[99999] pointer-events-none transition-opacity duration-200"
      style={{ opacity: visible ? 1 : 0 }}
    >
      <div
        className="h-full bg-gradient-to-r from-[#B8860B] via-[#E5A93C] to-[#8B5A1E] shadow-[0_0_10px_rgba(184,134,11,0.85)] transition-all duration-200 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
};
