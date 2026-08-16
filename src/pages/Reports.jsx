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
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-4">
        <div>
          <div className="text-xs font-semibold text-gray-400 mb-1">
            Tổng quan / <span className="text-museum-brown font-bold">Thống kê & Báo cáo</span>
          </div>
          <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight flex items-center gap-2">
            <TrendingUp className="w-7 h-7 text-museum-gold" />
            BÁO CÁO THỐNG KÊ BIỂU ĐỒ & DỮ LIỆU
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Tổng hợp dữ liệu tham quan, doanh thu bán vé & hiện vật bảo tàng
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Period Select */}
          <select
            value={reportPeriod}
            onChange={(e) => setReportPeriod(e.target.value)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 text-xs font-bold text-gray-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold"
          >
            <option value="2026">Năm 2026</option>
            <option value="Q3-2026">Quý 3 / 2026</option>
            <option value="Q2-2026">Quý 2 / 2026</option>
          </select>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Xuất Excel (.csv)</span>
          </button>

          {/* Export PDF Button */}
          <button
            onClick={handleExportPDF}
            className="px-4 py-2 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <FileText className="w-4 h-4 text-museum-gold-lt" />
            <span>Xuất Báo cáo PDF</span>
          </button>
        </div>
      </div>

      {/* Metric Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-4 border-l-museum-brown">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase">
            <span>TỔNG LƯỢT KHÁCH</span>
            <Users className="w-4 h-4 text-museum-brown" />
          </div>
          <div className="text-3xl font-extrabold text-museum-brown mt-2">
            {formatNumber(totalVisitors)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
            ▲ +24.5% so với kỳ trước
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-4 border-l-museum-gold">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase">
            <span>TỔNG DOANH THU VÉ</span>
            <TrendingUp className="w-4 h-4 text-museum-gold" />
          </div>
          <div className="text-2xl font-extrabold text-museum-gold mt-2">
            {formatCurrency(totalRevenueCalculated)}
          </div>
          <span className="text-[11px] text-emerald-600 font-semibold mt-1 inline-block">
            ▲ +18.2% tăng trưởng
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-4 border-l-emerald-500">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase">
            <span>SỐ VÉ ĐÃ BÁN</span>
            <Ticket className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-gray-800 mt-2">
            {formatNumber(totalTicketsSold)}
          </div>
          <span className="text-[11px] text-gray-400 mt-1 inline-block">
            Bao gồm vé trực tuyến & tại quầy
          </span>
        </div>

        <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 border-l-4 border-l-blue-500">
          <div className="flex items-center justify-between text-xs font-bold text-gray-400 uppercase">
            <span>HIỆN VẬT LƯU TRỮ</span>
            <Landmark className="w-4 h-4 text-blue-500" />
          </div>
          <div className="text-3xl font-extrabold text-gray-800 mt-2">
            {artifacts.length}
          </div>
          <span className="text-[11px] text-blue-600 font-semibold mt-1 inline-block">
            100% đã phân loại CSDL
          </span>
        </div>
      </div>

      {/* CHARTS SECTION (Feature 7) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chart 1: Line Chart - Monthly Visitors & Revenue */}
        <div className="lg:col-span-8 bg-white rounded-2xl p-5 shadow-xs border border-gray-100 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-museum-brown">
              📈 BIỂU ĐỒ ĐƯỜNG: TĂNG TRƯỞNG LƯỢT KHÁCH & DOANH THU HÀNG THÁNG
            </h3>
            <span className="text-xs text-museum-gold font-bold bg-museum-cream px-2.5 py-0.5 rounded-full">
              Line Chart
            </span>
          </div>

          <div className="w-full h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={visitorTrendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" stroke="#9ca3af" fontSize={11} />
                <YAxis stroke="#9ca3af" fontSize={11} />
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
                  stroke="#5C2C16"
                  strokeWidth={3}
                  activeDot={{ r: 7 }}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  name="Doanh thu (VNĐ)"
                  stroke="#C5A059"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Pie Chart - Category Distribution */}
        <div className="lg:col-span-4 bg-white rounded-2xl p-5 shadow-xs border border-gray-100 space-y-4 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-xs uppercase tracking-wider text-museum-brown">
              🥧 BIỂU ĐỒ TRÒN: TỈ LỆ HIỆN VẬT THEO DANH MỤC
            </h3>
            <span className="text-xs text-emerald-600 font-bold bg-emerald-50 px-2 py-0.5 rounded-full">
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

          <div className="text-[11px] text-gray-500 pt-2 border-t border-gray-100 text-center font-medium">
            Tổng cộng <strong>{artifacts.length}</strong> hiện vật thuộc <strong>{categoryCountMap.length}</strong> phân loại
          </div>
        </div>
      </div>

      {/* Chart 2: Bar Chart - Ticket Sales Revenue */}
      <div className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-xs uppercase tracking-wider text-museum-brown">
            📊 BIỂU ĐỒ CỘT: DOANH THU & SỐ LƯỢNG THEO PHÂN LOẠI VÉ
          </h3>
          <span className="text-xs text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded-full">
            Bar Chart
          </span>
        </div>

        <div className="w-full h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={ticketRevenueData} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" stroke="#9ca3af" fontSize={11} />
              <YAxis stroke="#9ca3af" fontSize={11} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Bar dataKey="revenue" name="Doanh thu (VNĐ)" fill="#C5A059" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Summary Data Table */}
      <div className="bg-white rounded-2xl shadow-xs border border-gray-100 overflow-hidden space-y-2">
        <div className="p-4 bg-museum-ivory border-b border-gray-200 font-bold text-sm text-museum-brown flex items-center justify-between">
          <span>📋 BẢNG SỐ LIỆU TỔNG HỢP THEO THÁNG ({reportPeriod})</span>
          <span className="text-xs font-normal text-gray-500">Cập nhật lúc: {new Date().toLocaleTimeString('vi-VN')}</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead>
              <tr className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider border-b border-gray-100">
                <th className="py-3 px-4">Thời gian</th>
                <th className="py-3 px-4">Lượt khách tham quan</th>
                <th className="py-3 px-4">Ước tính số vé bán</th>
                <th className="py-3 px-4">Doanh thu vé (VNĐ)</th>
                <th className="py-3 px-4">Tăng trưởng</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs text-gray-700">
              {visitorTrendData.map((row, idx) => (
                <tr key={idx} className="hover:bg-museum-cream/30 transition-colors">
                  <td className="py-3 px-4 font-bold text-museum-brown">{row.month}</td>
                  <td className="py-3 px-4 font-semibold text-gray-800">{formatNumber(row.visitors)} người</td>
                  <td className="py-3 px-4 text-gray-600">{formatNumber(Math.round(row.visitors * 0.95))} vé</td>
                  <td className="py-3 px-4 font-bold text-museum-gold">{formatCurrency(row.revenue)}</td>
                  <td className="py-3 px-4 text-emerald-600 font-semibold">+15.4%</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-museum-cream/50 font-black text-xs text-museum-brown border-t border-museum-gold/30">
                <td className="py-3.5 px-4">TỔNG CỘNG:</td>
                <td className="py-3.5 px-4">{formatNumber(totalVisitors)} người</td>
                <td className="py-3.5 px-4">{formatNumber(totalTicketsSold)} vé</td>
                <td className="py-3.5 px-4 text-museum-gold text-sm">{formatCurrency(totalRevenueCalculated)}</td>
                <td className="py-3.5 px-4 text-emerald-700">+24.5% avg</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
};
