import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { getLast6Months, formatNumber } from '@/utils/formatters';

export const VisitChart = () => {
  const months = getLast6Months();
  const sampleValues = [400, 700, 1100, 800, 1300, 1800];

  const data = months.map((month, index) => ({
    month,
    visitors: sampleValues[index] || 1000 + index * 200,
  }));

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 rounded-xl shadow-lg border border-museum-cream text-xs">
          <p className="font-bold text-museum-brown mb-1">Tháng: {label}</p>
          <p className="text-museum-gold font-semibold">
            Lượt tham quan: <span className="font-bold">{formatNumber(payload[0].value)}</span>
          </p>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-xs uppercase tracking-wider text-museum-brown">
          LƯỢT THAM QUAN (6 THÁNG GẦN NHẤT)
        </h3>
        <span className="text-xs text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold">
          +18.5% tăng trưởng
        </span>
      </div>

      <div className="w-full h-64 flex-1">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" vertical={false} />
            <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} tickLine={false} />
            <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="visitors"
              stroke="#B8860B"
              strokeWidth={3}
              dot={{ fill: '#5B3A1F', r: 4, strokeWidth: 2, stroke: '#B8860B' }}
              activeDot={{ r: 6, fill: '#B8860B', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};
