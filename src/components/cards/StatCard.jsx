import React from 'react';
import { formatNumber } from '@/utils/formatters';

export const StatCard = ({ title, value, growth, icon: Icon, customSvg }) => {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Background subtle bronze drum watermark */}
      <div className="absolute right-0 top-0 bottom-0 w-24 opacity-[0.04] pointer-events-none flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-32 h-32 text-[#B8860B]" fill="currentColor">
          <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="1" fill="none" />
          <circle cx="50" cy="50" r="12" fill="currentColor" />
        </svg>
      </div>

      <div className="flex items-center gap-4 relative z-10">
        {/* Circular icon container */}
        <div className="w-13 h-13 rounded-full bg-[#F5EFE0] border border-[#E8DDCC] flex items-center justify-center text-[#B8860B] flex-shrink-0">
          {customSvg ? (
            customSvg
          ) : (
            <Icon className="w-6 h-6 stroke-[1.8]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">
            {title}
          </div>
          <div className="text-2xl sm:text-[28px] font-extrabold text-[#3E2712] tracking-tight leading-none mt-1.5 mb-1.5">
            {typeof value === 'number' ? formatNumber(value) : value}
          </div>
          <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
            <span>↗</span>
            <span>+{growth} so với tháng trước</span>
          </div>
        </div>
      </div>
    </div>
  );
};
