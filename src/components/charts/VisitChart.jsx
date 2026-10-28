import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { formatNumber } from '@/utils/formatters';
import { TrendingUp } from 'lucide-react';

export const VisitChart = () => {
  const data = [
    { month: '05/2026', visitors: 450 },
    { month: '06/2026', visitors: 820 },
    { month: '07/2026', visitors: 1050 },
    { month: '08/2026', visitors: 760 },
    { month: '09/2026', visitors: 1180 },
    { month: '10/2026', visitors: 1680 },
  ];

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-2.5 rounded-xl shadow-lg border border-stone-200/80 text-xs">
          <p className="font-semibold text-[#3E2712] mb-0.5">Tháng: {label}</p>
          <p className="text-[#B8860B] font-bold">
            Lượt tham quan: <span>{formatNumber(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-stone-200/80 shadow-xs flex flex-col justify-between">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 rounded-full bg-[#B8860B]/15 flex items-center justify-center text-[#B8860B]">
            <TrendingUp className="w-3 h-3 text-[#B8860B]" />
          </span>
          <h3 className="font-bold text-[11px] sm:text-xs uppercase tracking-wider text-[#3E2712]">
            LƯỢT THAM QUAN (6 THÁNG GẦN NHẤT)
          </h3>
        </div>
        <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100">
          +18.5% tăng trưởng
        </span>
      </div>

      <div className="w-full h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <defs>
              <linearGradient id="visitorGoldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#B8860B" stopOpacity={0.4} />
                <stop offset="95%" stopColor="#B8860B" stopOpacity={0.03} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#F4EFE6" vertical={false} />
            <XAxis
              dataKey="month"
              stroke="#8C7A6B"
              fontSize={10.5}
              tickLine={false}
              axisLine={{ stroke: '#ECE4D4' }}
            />
            <YAxis
              ticks={[0, 450, 900, 1350, 1800]}
              domain={[0, 1800]}
              stroke="#8C7A6B"
              fontSize={10.5}
              tickLine={false}
              axisLine={false}
            />
            <Tooltip content={<CustomTooltip />} />
            <Area
              type="monotone"
              dataKey="visitors"
              stroke="#C9974C"
              strokeWidth={2.5}
              fill="url(#visitorGoldGradient)"
              dot={{ fill: '#C9974C', r: 4, stroke: '#FFFFFF', strokeWidth: 1.5 }}
              activeDot={{ r: 6, fill: '#B88128', stroke: '#FFFFFF', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
