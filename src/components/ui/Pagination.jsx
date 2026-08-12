import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { formatNumber } from '@/utils/formatters';

export const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems = 1254,
  itemsPerPage = 10,
}) => {
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4 px-2 text-sm text-gray-600">
      <div>
        Hiển thị <span className="font-semibold text-museum-brown">{startItem}-{endItem}</span> trong tổng{' '}
        <span className="font-semibold text-museum-brown">{formatNumber(totalItems)}</span> hiện vật
      </div>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="p-2 rounded-lg border border-gray-200 hover:bg-museum-cream disabled:opacity-40 disabled:cursor-not-allowed text-museum-brown transition-colors"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`w-9 h-9 rounded-lg font-medium transition-colors ${
              currentPage === page
                ? 'bg-museum-brown text-white shadow-sm'
                : 'border border-gray-200 text-gray-700 hover:bg-museum-cream'
            }`}
          >
            {page}
          </button>
        ))}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="p-2 rounded-lg border border-gray-200 hover:bg-museum-cream disabled:opacity-40 disabled:cursor-not-allowed text-museum-brown transition-colors"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
