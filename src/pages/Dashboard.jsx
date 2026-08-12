import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Landmark, Archive, CalendarDays, Ticket } from 'lucide-react';
import { StatCard } from '@/components/cards/StatCard';
import { ArtifactCard } from '@/components/cards/ArtifactCard';
import { ExhibitionCard } from '@/components/cards/ExhibitionCard';
import { VisitChart } from '@/components/charts/VisitChart';
import { ChatWidget } from '@/components/ai/ChatWidget';
import { Skeleton } from '@/components/ui/Skeleton';

export const Dashboard = () => {
  const { artifacts, exhibitions } = useApp();
  const [loading, setLoading] = useState(true);

  // Mock 400ms loading effect when page mounts
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const recentArtifacts = artifacts.slice(0, 4);
  const ongoingExhibitions = exhibitions.slice(0, 3);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-60 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <Skeleton className="h-28 w-full rounded-2xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="h-80 lg:col-span-2 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* 6.1 Hero Banner */}
      <div className="relative h-56 sm:h-64 rounded-2xl overflow-hidden shadow-lg border border-museum-cream/60">
        <img
          src="/images/museum-hero.jpg"
          alt="Bảo tàng Việt Nam Hero Banner"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/85 via-black/60 to-black/30" />
        <div className="relative z-10 h-full flex flex-col justify-center px-6 sm:px-12 max-w-3xl">
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-wider uppercase drop-shadow-md">
            HỆ THỐNG QUẢN LÝ BẢO TÀNG
          </h1>
          <p className="text-sm sm:text-base text-museum-cream/90 font-normal mt-2.5 leading-relaxed drop-shadow-xs">
            Quản lý hiện vật, triển lãm, sự kiện và vé tham quan một cách hiệu quả
          </p>
        </div>
      </div>

      {/* 6.2 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard title="Hiện vật" value={1254} growth={24} icon={Landmark} />
        <StatCard title="Triển lãm" value={18} growth={2} icon={Archive} />
        <StatCard title="Sự kiện" value={7} growth={1} icon={CalendarDays} />
        <StatCard title="Vé đã bán" value={3246} growth={320} icon={Ticket} />
      </div>

      {/* Grid: 6.3 Hiện vật mới thêm & 6.4 Biểu đồ lượt tham quan */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Hiện vật mới thêm (8 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-museum-brown">
              HIỆN VẬT MỚI THÊM
            </h3>
            <Link
              to="/artifacts"
              className="text-xs font-semibold text-museum-gold hover:text-museum-brown transition-colors flex items-center gap-1"
            >
              Xem tất cả &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {recentArtifacts.map((item) => (
              <ArtifactCard key={item.id} artifact={item} />
            ))}
          </div>
        </div>

        {/* Biểu đồ lượt tham quan (5 cols) */}
        <div className="lg:col-span-5">
          <VisitChart />
        </div>
      </div>

      {/* Grid: 6.5 Triển lãm đang diễn ra & 6.6 Trợ lý AI */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Triển lãm đang diễn ra (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-xs uppercase tracking-wider text-museum-brown">
              TRIỂN LÃM ĐANG DIỄN RA
            </h3>
            <Link
              to="/exhibitions"
              className="text-xs font-semibold text-museum-gold hover:text-museum-brown transition-colors flex items-center gap-1"
            >
              Xem tất cả &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {ongoingExhibitions.map((item) => (
              <ExhibitionCard key={item.id} exhibition={item} />
            ))}
          </div>
        </div>

        {/* Trợ lý AI Widget (5 cols) */}
        <div className="lg:col-span-5">
          <ChatWidget />
        </div>
      </div>
    </div>
  );
};
