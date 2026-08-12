import React from 'react';
import { BarChart3, TrendingUp, Users, Ticket, Landmark } from 'lucide-react';
import { VisitChart } from '@/components/charts/VisitChart';

export const Reports = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <div className="text-xs font-semibold text-gray-400 mb-1">
          Tổng quan / <span className="text-museum-brown font-bold">Báo cáo</span>
        </div>
        <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
          BÁO CÁO THỐNG KÊ & PHÂN TÍCH
        </h2>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8">
          <VisitChart />
        </div>
        <div className="lg:col-span-4 bg-white rounded-2xl p-6 shadow-xs border border-gray-100 space-y-4">
          <h3 className="font-bold text-sm text-museum-brown uppercase">TỔNG QUAN TỈ LỆ VÉ</h3>
          <div className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Vé Người lớn (50.000đ)</span>
                <span>65%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-museum-brown h-full w-[65%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Vé Học sinh - Sinh viên (20.000đ)</span>
                <span>25%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-museum-gold h-full w-[25%]" />
              </div>
            </div>
            <div>
              <div className="flex justify-between font-semibold mb-1">
                <span>Vé Khách Quốc tế (100.000đ)</span>
                <span>10%</span>
              </div>
              <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                <div className="bg-emerald-600 h-full w-[10%]" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
