import React, { useMemo } from 'react';
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
import { TrendingUp, Users } from 'lucide-react';
import { useApp } from '@/context/AppContext';

export const VisitChart = () => {
  const { bookedTickets } = useApp();

  // Tính toán 6 tháng gần nhất dựa trên thời gian thực tế
  const chartData = useMemo(() => {
    const months = [];
    const now = new Date();

    // Khởi tạo 6 tháng gần nhất (từ 5 tháng trước tới tháng hiện tại)
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const mStr = String(d.getMonth() + 1).padStart(2, '0');
      const yStr = d.getFullYear();
      months.push({
        key: `${yStr}-${mStr}`,
        label: `${mStr}/${yStr}`,
        visitors: 0,
        tickets: 0,
      });
    }

    const monthMap = new Map();
    months.forEach((m) => monthMap.set(m.key, m));

    // Lấy dữ liệu check-in từ localStorage của quầy vé (staff counter)
    let counterLogs = [];
    try {
      const saved = localStorage.getItem('staff_counter_recent_logs');
      if (saved) counterLogs = JSON.parse(saved);
    } catch {
      counterLogs = [];
    }

    // 1. Tổng hợp từ danh sách đặt vé thật (bookedTickets)
    const list = Array.isArray(bookedTickets) ? bookedTickets : [];
    list.forEach((b) => {
      // Xác định ngày tham quan hoặc ngày tạo đơn vé
      const rawDate = b.visitDate || b.visit_date || b.createdAt || b.created_at;
      if (!rawDate) return;

      const dateObj = new Date(rawDate);
      if (isNaN(dateObj.getTime())) return;

      const mKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
      if (monthMap.has(mKey)) {
        const item = monthMap.get(mKey);
        // Số lượng khách = quantity của vé (hoặc mặc định 1)
        const qty = Number(b.quantity) || 1;
        item.visitors += qty;
        item.tickets += 1;
      }
    });

    // 2. Tổng hợp thêm từ các lượt check-in trực tiếp tại quầy nếu có
    counterLogs.forEach((log) => {
      if (!log || !log.time) return;
      // Nếu log chưa được tính trong bookedTickets
      const rawDate = log.checkinAt || log.createdAt || now;
      const dateObj = new Date(rawDate);
      if (!isNaN(dateObj.getTime())) {
        const mKey = `${dateObj.getFullYear()}-${String(dateObj.getMonth() + 1).padStart(2, '0')}`;
        if (monthMap.has(mKey)) {
          const item = monthMap.get(mKey);
          item.visitors += Number(log.quantity) || 1;
        }
      }
    });

    // 3. Trả về đúng 100% dữ liệu thực tế từ hệ thống (vé đặt + check-in)
    return months.map((m) => {
      return {
        month: m.label,
        visitors: m.visitors,
        realBooked: m.visitors,
      };
    });
  }, [bookedTickets]);

  // Tính tỷ lệ tăng trưởng giữa tháng gần nhất và tháng trước đó
  const growthRate = useMemo(() => {
    if (chartData.length < 2) return null;
    const last = chartData[chartData.length - 1].visitors;
    const prev = chartData[chartData.length - 2].visitors;
    if (prev === 0 && last === 0) return '0% ổn định';
    if (prev === 0 && last > 0) return `+${last} lượt mới`;
    const pct = (((last - prev) / prev) * 100).toFixed(1);
    return pct >= 0 ? `+${pct}% tăng trưởng` : `${pct}% tăng trưởng`;
  }, [chartData]);

  // Max value cho trục Y tự động co giãn theo số lượng thật
  const maxVal = useMemo(() => {
    const max = Math.max(...chartData.map((d) => d.visitors), 0);
    if (max === 0) return 10;
    if (max <= 10) return 12;
    if (max <= 50) return Math.ceil(max * 1.25);
    return Math.ceil((max * 1.2) / 10) * 10;
  }, [chartData]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      const dataPoint = payload[0].payload;
      return (
        <div className="bg-white p-3 rounded-xl shadow-xl border border-stone-200/90 text-xs">
          <p className="font-semibold text-[#3E2712] mb-1">Tháng: {label}</p>
          <p className="text-[#B8860B] font-bold text-sm">
            Lượt tham quan: <span>{formatNumber(payload[0].value)}</span>
          </p>
          {dataPoint?.realBooked > 0 && (
            <p className="text-emerald-700 font-medium text-[11px] mt-0.5 flex items-center gap-1">
              <Users className="w-3 h-3 inline" /> +{formatNumber(dataPoint.realBooked)} khách đặt online/quầy
            </p>
          )}
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
          {growthRate}
        </span>
      </div>

      <div className="w-full h-56 sm:h-64">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
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
              domain={[0, maxVal]}
              stroke="#8C7A6B"
              fontSize={10.5}
              tickLine={false}
              axisLine={false}
              tickFormatter={(v) => formatNumber(v)}
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

