import React from 'react';
import { formatNumber } from '@/utils/formatters';

export const StatCard = ({
  title,
  value,
  growth,
  icon: Icon,
  customSvg,
  percent = 90,
  percentLabel = 'Chỉ tiêu',
  badgeColor = '#B8860B',
}) => {
  return (
    <div className="bg-white rounded-2xl p-4 sm:p-5 border border-stone-200/80 shadow-xs relative overflow-hidden transition-all duration-200 hover:shadow-md hover:-translate-y-0.5">
      {/* Background subtle bronze drum watermark */}
      <div className="absolute right-[-12px] top-[-12px] bottom-0 w-28 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
        <svg viewBox="0 0 100 100" className="w-36 h-36 text-[#B8860B]" fill="currentColor">
          <circle cx="50" cy="50" r="48" stroke="currentColor" strokeWidth="2" fill="none" />
          <circle cx="50" cy="50" r="38" stroke="currentColor" strokeWidth="1.5" fill="none" />
          <circle cx="50" cy="50" r="28" stroke="currentColor" strokeWidth="1" fill="none" />
          <circle cx="50" cy="50" r="12" fill="currentColor" />
        </svg>
      </div>

      <div className="flex items-center justify-between gap-3 relative z-10">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Circular icon container */}
          <div className="w-12 h-12 rounded-full bg-[#F5EFE0] border border-[#E8DDCC] flex items-center justify-center text-[#B8860B] flex-shrink-0 shadow-xs">
            {customSvg ? (
              customSvg
            ) : (
              <Icon className="w-5 h-5 stroke-[1.8]" />
            )}
          </div>

          {/* Content */}
          <div className="min-w-0">
            <div className="text-[11px] font-bold text-stone-500 uppercase tracking-wider truncate">
              {title}
            </div>
            <div className="text-2xl sm:text-[26px] font-extrabold text-[#3E2712] tracking-tight leading-none mt-1 mb-1">
              {typeof value === 'number' ? formatNumber(value) : value}
            </div>
            <div className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1 whitespace-nowrap">
              <span>↗</span>
              <span>+{growth} so với tháng trước</span>
            </div>
          </div>
        </div>

        {/* Circular Progress Gauge with Real KPI Statistics */}
        <div className="relative flex-shrink-0 flex flex-col items-center justify-center w-14 h-14">
          <svg className="w-14 h-14 transform -rotate-90" viewBox="0 0 36 36">
            <path
              className="text-stone-100"
              strokeWidth="3.2"
              stroke="currentColor"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
            <path
              style={{ stroke: badgeColor }}
              strokeDasharray={`${percent}, 100`}
              strokeWidth="3.2"
              strokeLinecap="round"
              fill="none"
              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-[11px] font-extrabold text-[#3E2712] leading-tight">{percent}%</span>
            <span className="text-[7.5px] font-bold text-stone-500 tracking-tighter uppercase leading-none">{percentLabel}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
