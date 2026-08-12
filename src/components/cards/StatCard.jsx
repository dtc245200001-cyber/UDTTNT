import React from 'react';
import { TrendingUp } from 'lucide-react';
import { formatNumber } from '@/utils/formatters';

export const StatCard = ({ title, value, growth, icon: Icon }) => {
  return (
    <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-[3px] border-l-museum-gold hover:-translate-y-1 hover:shadow-md transition-all duration-200 cursor-pointer">
      <div className="flex items-center gap-4">
        {/* Icon container */}
        <div className="w-13 h-13 rounded-2xl bg-museum-cream flex items-center justify-center text-museum-gold flex-shrink-0">
          <Icon className="w-6 h-6" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">
            {title}
          </div>
          <div className="text-2xl lg:text-3xl font-extrabold text-museum-brown tracking-tight">
            {typeof value === 'number' ? formatNumber(value) : value}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs font-semibold text-success">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>+{growth} so với tháng trước</span>
          </div>
        </div>
      </div>
    </div>
  );
};
