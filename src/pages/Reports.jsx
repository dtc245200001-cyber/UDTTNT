import React, { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  FileSpreadsheet,
  FileText,
  TrendingUp,
  Ticket,
  Users,
  Landmark,
  Calendar,
  Filter,
  Download,
} from 'lucide-react';
import { formatCurrency, formatNumber } from '@/utils/formatters';
import { exportToExcel, exportToPDF } from '@/utils/exportHelpers';

export const Reports = () => {
  const { artifacts, tickets, bookedTickets, ticketStats, reviews } = useApp();
  const [reportPeriod, setReportPeriod] = useState('2026');

  // Chart 1: Line Chart Data (Monthly Visitors)
  const visitorTrendData = [
    { month: 'Tháng 1', visitors: 1200, revenue: 60000000 },
    { month: 'Tháng 2', visitors: 1900, revenue: 95000000 },
    { month: 'Tháng 3', visitors: 1500, revenue: 75000000 },
    { month: 'Tháng 4', visitors: 2200, revenue: 110000000 },
    { month: 'Tháng 5', visitors: 2800, revenue: 140000000 },
    { month: 'Tháng 6', visitors: 3100, revenue: 155000000 },
    { month: 'Tháng 7', visitors: 3500, revenue: 175000000 },
    { month: 'Tháng 8', visitors: 4200, revenue: 210000000 },
  ];

  // Chart 2: Bar Chart Data (Revenue by Ticket Type)
  const ticketRevenueData = [
    { name: 'Vé Người lớn', sold: 4800, revenue: 240000000 },
    { name: 'Vé Học sinh - SV', sold: 2900, revenue: 58000000 },
    { name: 'Vé Trẻ em', sold: 1500, revenue: 0 },
    { name: 'Vé Quốc tế', sold: 1100, revenue: 110000000 },
  ];

  // Chart 3: Pie Chart Data (Artifact Category Distribution)
  const categoryCountMap = useMemo(() => {
    const counts = {};
    artifacts.forEach((a) => {
      const cat = a.category || 'Khác';
      counts[cat] = (counts[cat] || 0) + 1;
    });
    return Object.keys(counts).map((cat) => ({ name: cat, value: counts[cat] }));
  }, [artifacts]);

  const PIE_COLORS = ['#5C2C16', '#C5A059', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

  // Summary Metrics
  const totalRevenueCalculated = ticketRevenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalTicketsSold = ticketRevenueData.reduce((sum, item) => sum + item.sold, 0);
  const totalVisitors = visitorTrendData.reduce((sum, item) => sum + item.visitors, 0);

  // Table Data for Export & View
  const tableData = visitorTrendData.map((row) => ({
    'Tháng': row.month,
    'Lượt khách': row.visitors,
    'Doanh thu (VNĐ)': row.revenue,
    'Tăng trưởng so cùng kỳ': '+15.4%',
  }));

  const handleExportExcel = () => {
    const exportRows = visitorTrendData.map((r) => ({
      'Thời gian': r.month,
      'Số lượt khách tham quan': r.visitors,
      'Doanh thu bán vé (VNĐ)': r.revenue,
      'Số vé đã bán': Math.round(r.visitors * 0.95),
      'Đánh giá trung bình': '4.8/5',
    }));

    exportToExcel(exportRows, `Bao_cao_bao_tang_${reportPeriod}`);
  };

  const handleExportPDF = () => {
    const pdfHtml = `
      <div class="summary-box">
        <h3>TỔNG QUAN NĂM ${reportPeriod}</h3>
        <p><strong>Tổng lượt khách:</strong> ${formatNumber(totalVisitors)} người</p>
        <p><strong>Tổng số vé bán ra:</strong> ${formatNumber(totalTicketsSold)} vé</p>
        <p><strong>Tổng doanh thu bán vé:</strong> ${formatCurrency(totalRevenueCalculated)}</p>
        <p><strong>Số hiện vật lưu trữ:</strong> ${artifacts.length} hiện vật</p>
      </div>

      <h3>BẢNG SỐ LIỆU CHI TIẾT THEO THÁNG</h3>
      <table>
        <thead>
          <tr>
            <th>Tháng</th>
            <th>Lượt khách</th>
            <th>Số vé bán ra</th>
            <th>Doanh thu (VNĐ)</th>
          </tr>
        </thead>
        <tbody>
          ${visitorTrendData
            .map(
              (r) => `
            <tr>
              <td>${r.month}</td>
              <td>${formatNumber(r.visitors)}</td>
              <td>${formatNumber(Math.round(r.visitors * 0.95))}</td>
              <td>${formatCurrency(r.revenue)}</td>
            </tr>
          `
            )
            .join('')}
        </tbody>
      </table>
    `;
    exportToPDF(`Bao_cao_thong_ke_bao_tang_${reportPeriod}`, pdfHtml);
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans max-w-7xl mx-auto px-4 py-6">
      {/* Header & Export Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-stone-200/60 pb-4">
        <div>
          <div className="text-xs font-medium text-[#8A7D6B] mb-1">
            Tổng quan / <span className="text-[#3E2712] font-semibold">Thống kê & Báo cáo</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#3E2712] tracking-tight flex items-center gap-2 uppercase">
            <TrendingUp className="w-6 h-6 text-[#B8860B]" />
            <span>BÁO CÁO THỐNG KÊ BIỂU ĐỒ & DỮ LIỆU</span>
          </h2>
          <p className="text-xs text-[#8A7D6B] mt-1">
            Tổng hợp dữ liệu tham quan, doanh thu bán vé & hiện vật bảo tàng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Period Select */}
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
            className="px-3.5 py-2 bg-[#F7F3EE] border border-stone-200/80 text-xs font-semibold text-[#3E2712] rounded-full focus:outline-none focus:ring-2 focus:ring-[#B8860B]"
          >
            <option value="2026">Năm 2026</option>
            <option value="Q3-2026">Quý 3 / 2026</option>
            <option value="Q2-2026">Quý 2 / 2026</option>
          </select>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="btn-secondary px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#B8860B]" />
            <span>Xuất Excel (.csv)</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="btn-primary px-5 py-2 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs"
          >
            <FileText className="w-4 h-4 text-white" />
            <span>Xuất Báo cáo PDF</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200/80 border-l-4 border-l-[#5B3A1F]">
          <div className="flex items-center justify-between text-xs font-bold text-[#8A7D6B] uppercase">
            <span>TỔNG LƯỢT KHÁCH</span>
            <Users className="w-4 h-4 text-[#5B3A1F]" />
          </div>
          <div className="text-3xl font-extrabold text-[#3E2712] mt-2">
            {formatNumber(totalVisitors)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
            ▲ +24.5% so với kỳ trước
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200/80 border-l-4 border-l-[#B8860B]">
          <div className="flex items-center justify-between text-xs font-bold text-[#8A7D6B] uppercase">
            <span>TỔNG DOANH THU VÉ</span>
            <TrendingUp className="w-4 h-4 text-[#B8860B]" />
          </div>
          <div className="text-2xl font-extrabold text-[#B8860B] mt-2">
            {formatCurrency(totalRevenueCalculated)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
            ▲ +18.2% tăng trưởng
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200/80 border-l-4 border-l-emerald-600">
          <div className="flex items-center justify-between text-xs font-bold text-[#8A7D6B] uppercase">
            <span>SỐ VÉ ĐÃ BÁN</span>
            <Ticket className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-3xl font-extrabold text-[#3E2712] mt-2">
            {formatNumber(totalTicketsSold)}
          </div>
          <span className="text-[11px] text-[#8A7D6B] mt-1 inline-block">
            Bao gồm vé trực tuyến & tại quầy
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200/80 border-l-4 border-l-[#B8860B]">
          <div className="flex items-center justify-between text-xs font-bold text-[#8A7D6B] uppercase">
            <span>HIỆN VẬT LƯU TRỮ</span>
            <Landmark className="w-4 h-4 text-[#B8860B]" />
          </div>
          <div className="text-3xl font-extrabold text-[#3E2712] mt-2">
            {artifacts.length}
          </div>
          <span className="text-[11px] text-[#B8860B] font-semibold mt-1 inline-block">
            100% đã phân loại CSDL
          </span>
        </div>
      </div>

      {/* CHARTS SECTION (Feature 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Line Chart - Monthly Visitors & Revenue */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 shadow-xs border border-stone-200/80 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#3E2712]">
              📈 BIỂU ĐỒ ĐƯỜNG: TĂNG TRƯỞNG LƯỢT KHÁCH & DOANH THU HÀNG THÁNG
            </h3>
            <span className="text-xs text-[#B8860B] font-bold bg-[#FAF6EF] border border-[#E8DDCC] px-2.5 py-0.5 rounded-full">
              Line Chart
            </span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitorTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#8A7D6B" fontSize={11} />
                <YAxis stroke="#8A7D6B" fontSize={11} />
                <Tooltip
                  formatter={(value, name) => [
                    name === 'visitors' ? `${formatNumber(value)} lượt` : formatCurrency(value),
                    name === 'visitors' ? 'Lượt khách' : 'Doanh thu',
                  ]}
                />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="visitors"
                  name="Lượt khách"
                  stroke="#3E2712"
                  strokeWidth={3}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu (VNĐ)"
                  stroke="#B8860B"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Pie Chart - Category Distribution */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-xs border border-stone-200/80 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-[#3E2712]">
              🥧 BIỂU ĐỒ TRÒN: TỈ LỆ HIỆN VẬT THEO DANH MỤC
            </h3>
            <span className="text-xs text-emerald-700 font-bold bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              Pie Chart
            </span>
          </div>

          <div className="w-full h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={categoryCountMap}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={75}
                  innerRadius={35}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  labelLine={false}
                >
                  {categoryCountMap.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="text-[11px] text-[#8A7D6B] pt-2 border-t border-stone-200/60 text-center font-medium">
            Tổng cộng <strong>{artifacts.length}</strong> hiện vật thuộc <strong>{categoryCountMap.length}</strong> phân loại
          </div>
        </div>
      </div>

      {/* Chart 2: Bar Chart - Ticket Sales Revenue */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-stone-200/80 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-[#3E2712]">
            📊 BIỂU ĐỒ CỘT: DOANH THU & SỐ LƯỢNG THEO PHÂN LOẠI VÉ
          </h3>
          <span className="text-xs text-[#B8860B] font-bold bg-[#FAF6EF] border border-[#E8DDCC] px-2.5 py-0.5 rounded-full">
            Bar Chart
          </span>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ticketRevenueData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#8A7D6B" fontSize={11} />
              <YAxis stroke="#8A7D6B" fontSize={11} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" name="Doanh thu (VNĐ)" fill="#B8860B" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Data Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-stone-200/80 overflow-hidden space-y-2">
        <div className="p-4 bg-[#FAF6EF] border-b border-[#E8DDCC] font-bold text-sm text-[#3E2712] flex items-center justify-between">
          <span>📋 BẢNG SỐ LIỆU TỔNG HỢP THEO THÁNG ({reportPeriod})</span>
          <span className="text-xs font-normal text-[#8A7D6B]">Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-[#FAF6EF] text-[#3E2712] text-xs font-bold uppercase tracking-wider border-b border-[#E8DDCC]">
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Lượt khách tham quan</th>
                <th className="py-3 px-4">Ước tính số vé bán</th>
                <th className="py-3 px-4">Doanh thu vé (VNĐ)</th>
                <th className="py-3 px-4">Tăng trưởng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-200/60 text-xs text-[#3E2712]">
              {visitorTrendData.map((row, idx) => (
                <tr key={idx} className="hover:bg-[#FAF6EF]/60 transition-colors">
                  <td className="py-3 px-4 font-bold text-[#3E2712]">{row.month}</td>
                  <td className="py-3 px-4 font-semibold text-[#3E2712]">{formatNumber(row.visitors)} người</td>
                  <td className="py-3 px-4 text-[#8A7D6B]">{formatNumber(Math.round(row.visitors * 0.95))} vé</td>
                  <td className="py-3 px-4 font-bold text-[#B8860B]">{formatCurrency(row.revenue)}</td>
                  <td className="py-3 px-4 text-emerald-600 font-semibold">+15.4%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-[#FAF6EF] font-bold text-xs text-[#3E2712] border-t border-[#E8DDCC]">
                <td className="py-3.5 px-4">TỔNG CỘNG:</td>
                <td className="py-3.5 px-4">{formatNumber(totalVisitors)} người</td>
                <td className="py-3.5 px-4">{formatNumber(totalTicketsSold)} vé</td>
                <td className="py-3.5 px-4 text-[#B8860B] text-sm">{formatCurrency(totalRevenueCalculated)}</td>
                <td className="py-3.5 px-4 text-emerald-700">+24.5% avg</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
