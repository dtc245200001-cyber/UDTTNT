import React, { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '@/utils/formatters';

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems = 0,
  itemsPerPage = 10,
}) => {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  // Windowing algorithm: compute visible page numbers and ellipses
  const pageNumbers = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    if (currentPage <= 4) {
      return [1, 2, 3, 4, 5, '...', totalPages];
    }

    if (currentPage >= totalPages - 3) {
      return [
        1,
        '...',
        totalPages - 4,
        totalPages - 3,
        totalPages - 2,
        totalPages - 1,
        totalPages,
      ];
    }

    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  }, [currentPage, totalPages]);

  if (totalPages <= 1 && totalItems <= itemsPerPage) {
    return (
      <div className="w-full max-w-full min-w-0 flex items-center justify-between text-xs text-[#8C7A6B] py-1">
        <div>
          Hiển thị{' '}
          <span className="font-bold text-[#2B170B]">{startItem}–{endItem}</span> trong tổng{' '}
          <span className="font-bold text-[#2B170B]">{formatNumber(totalItems)}</span> hiện vật
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-full min-w-0 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-[#8C7A6B]">
      {/* Information text: left on desktop */}
      <div className="shrink-0 text-center sm:text-left">
        Hiển thị{' '}
        <span className="font-bold text-[#2B170B]">{startItem}–{endItem}</span> trong tổng{' '}
        <span className="font-bold text-[#2B170B]">{formatNumber(totalItems)}</span> hiện vật
      </div>

      {/* Pagination controls: right on desktop */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0 flex-wrap justify-center">
        {/* Previous button */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="w-8 h-8 rounded-lg border border-[#E8DFC9] bg-white hover:bg-[#FAF5EB] disabled:opacity-35 disabled:cursor-not-allowed text-[#5B3A1F] transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
          title="Trang trước"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page buttons */}
        {pageNumbers.map((page, index) => {
          if (page === '...') {
            return (
              <span
                key={`ellipsis-${index}`}
                className="w-8 h-8 flex items-center justify-center text-xs text-[#8C7A6B] select-none font-medium"
              >
                ...
              </span>
            );
          }

          const isActive = currentPage === page;
          return (
            <button
              key={`page-${page}`}
              onClick={() => onPageChange(page)}
              className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center shadow-2xs ${
                isActive
                  ? 'bg-[#B88128] text-white border border-[#B88128]'
                  : 'bg-white border border-[#E8DFC9] text-[#5B3A1F] hover:bg-[#FAF5EB]'
              }`}
              title={`Trang ${page}`}
            >
              {page}
            </button>
          );
        })}

        {/* Next button */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="w-8 h-8 rounded-lg border border-[#E8DFC9] bg-white hover:bg-[#FAF5EB] disabled:opacity-35 disabled:cursor-not-allowed text-[#5B3A1F] transition-colors flex items-center justify-center cursor-pointer shadow-2xs"
          title="Trang tiếp theo"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
