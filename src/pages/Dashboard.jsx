import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  Landmark,
  CalendarDays,
  Ticket,
  MapPin,
  Calendar,
  Package,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { StatCard } from '@/components/cards/StatCard';
import { VisitChart } from '@/components/charts/VisitChart';
import { Skeleton } from '@/components/ui/Skeleton';
import { ArtifactDetailModal } from '@/components/artifacts/ArtifactDetailModal';

// Custom Vase Icon for "HIỆN VẬT" Stat Card
const VaseIcon = () => (
  <svg viewBox="0 0 24 24" className="w-6 h-6 fill-none stroke-current stroke-[1.8]">
    <path d="M9 3h6v2l-1 2c0 2 3 3 3 7a5 5 0 0 1-10 0c0-4 3-5 3-7L9 5V3z" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.5 14h7" strokeLinecap="round" />
  </svg>
);

export const Dashboard = () => {
  const navigate = useNavigate();
  const { artifacts } = useApp();
  const [selectedArtifact, setSelectedArtifact] = useState(null);
  const [loading, setLoading] = useState(true);

  // Mock 300ms loading effect
  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 300);
    return () => clearTimeout(timer);
  }, []);

  // Display items exactly as requested in target screenshot
  const displayArtifacts = [
    {
      id: 'AV_DONG_SON',
      name: 'Trống đồng Đông Sơn',
      period: 'Hiện đại',
      date: 'Thế kỷ I TCN - I',
      description: 'Trống đồng Đông Sơn là biểu tượng của nền văn minh lúa nước...',
      location: 'Tầng 1 - Phòng 1',
      image: '/images/events/dong-son-drum.jpg',
    },
    {
      id: 'AV_SACH_CO',
      name: 'Sách cổ chữ Hán',
      period: 'Hiện đại',
      date: 'Thế kỷ XIX',
      description: 'Sách cổ ghi chép các tư liệu lịch sử quý giá về Việt Nam...',
      location: 'Tầng 2 - Phòng 3',
      image: '/images/sach-co-chu-han.jpg',
    },
    {
      id: 'AV_GOM_HOA_LAM',
      name: 'Bình gốm hoa lam',
      period: 'Cổ đại',
      date: 'Thế kỷ XV',
      description: 'Bình gốm với họa tiết hoa lam tinh xảo, phản ánh kỹ thuật...',
      location: 'Tầng 2 - Phòng 2',
      image: '/images/binh-gom.jpg',
    },
    {
      id: 'AV_TUONG_DA',
      name: 'Tượng đá Linh vật',
      period: 'Cận đại',
      date: 'Thế kỷ XVIII',
      description: 'Tượng đá linh vật được chạm khắc tỉ mỉ, thể hiện tín ngưỡng...',
      location: 'Tầng 1 - Phòng 4',
      image: '/images/tuong-da-linh-vat.jpg',
    },
  ];

  const displayExhibitions = [
    {
      id: 'EX001',
      name: 'Tinh hoa văn hóa Việt',
      status: 'Đang diễn ra',
      statusColor: 'bg-[#8B1E1E]',
      date: '01/06/2026 - 30/10/2026',
      location: 'Phòng trưng bày A',
      image: '/images/museum-gallery-banner.jpg',
    },
    {
      id: 'EX003',
      name: 'Gốm Việt xưa và nay',
      status: 'Sắp diễn ra',
      statusColor: 'bg-[#C9974C]',
      date: '01/07/2026 - 30/12/2026',
      location: 'Phòng trưng bày C',
      image: '/images/binh-gom.jpg',
    },
    {
      id: 'EX004',
      name: 'Trang phục triều đình nhà Nguyễn',
      status: 'Đã kết thúc',
      statusColor: 'bg-[#2B2B2B]',
      date: '01/01/2026 - 30/04/2026',
      location: 'Phòng trưng bày D',
      image: '/images/tuong-phat.jpg',
    },
  ];

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
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <Skeleton className="h-96 lg:col-span-8 rounded-2xl" />
          <Skeleton className="h-96 lg:col-span-4 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn pb-8">
      {/* 1. Hero Banner */}
      <div className="relative rounded-2xl overflow-hidden shadow-sm border border-[#ECE4D4] min-h-[220px] sm:min-h-[240px] flex items-center">
        <img
          src="/images/dong-son-showcase.jpg"
          alt="Bảo tàng Quốc gia Việt Nam Showcase"
          className="absolute inset-0 w-full h-full object-cover object-center"
        />
        {/* Cinematic gradient overlay matching screenshot */}
        <div className="absolute inset-0 bg-gradient-to-r from-black/92 via-black/75 to-transparent" />

        {/* Banner content */}
        <div className="relative z-10 px-6 sm:px-10 py-6 max-w-2xl">
          <div className="text-[11px] font-bold text-[#D4A359] tracking-wider uppercase mb-2">
            BẢO TÀNG QUỐC GIA VIỆT NAM
          </div>
          <h1 className="text-2xl sm:text-[34px] font-serif font-bold text-white tracking-wide leading-tight">
            Hệ thống quản lí <span className="font-normal">bảo tàng</span>
          </h1>
          <p className="text-xs sm:text-[13px] text-white/80 font-normal mt-2.5 max-w-lg leading-relaxed">
            Nơi lưu giữ, bảo tồn và lan tỏa những giá trị văn hóa lịch sử quý báu của dân tộc.
          </p>
          <div className="mt-5">
            <button
              onClick={() => navigate('/artifacts')}
              className="px-5 py-2.5 bg-[#D4A359] hover:bg-[#C9974C] text-[#2B170B] font-bold text-xs rounded-full inline-flex items-center gap-2 transition-all transform hover:translate-x-0.5 shadow-sm cursor-pointer"
            >
              <span>Khám phá ngay</span>
              <span>&rarr;</span>
            </button>
          </div>
        </div>

        {/* Carousel indicators on bottom right */}
        <div className="absolute right-5 bottom-4 hidden sm:flex items-center gap-2 z-10">
          <button
            className="w-5 h-5 rounded-full bg-black/50 hover:bg-black/70 text-[#D4A359] flex items-center justify-center transition-colors cursor-pointer border border-[#D4A359]/30"
            title="Trước"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <div className="flex items-center gap-1 px-1">
            <span className="w-2 h-2 rounded-full bg-[#D4A359]" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
            <span className="w-1.5 h-1.5 rounded-full bg-white/40" />
          </div>
          <button
            className="w-5 h-5 rounded-full bg-black/50 hover:bg-black/70 text-[#D4A359] flex items-center justify-center transition-colors cursor-pointer border border-[#D4A359]/30"
            title="Tiếp theo"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>

      {/* 2. 4 Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        <StatCard
          title="HIỆN VẬT"
          value={1254}
          growth={24}
          customSvg={<VaseIcon />}
        />
        <StatCard
          title="TRIỂN LÃM"
          value={18}
          growth={2}
          icon={Landmark}
        />
        <StatCard
          title="SỰ KIỆN"
          value={7}
          growth={1}
          icon={CalendarDays}
        />
        <StatCard
          title="VÉ ĐÃ BÁN"
          value={3246}
          growth={320}
          icon={Ticket}
        />
      </div>

      {/* 3. Main Content: Left (Artifacts & Exhibitions) + Right (Chart & Quote) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* LEFT COLUMN: 8 Columns */}
        <div className="lg:col-span-8 space-y-6">
          {/* 3.1 HIỆN VẬT MỚI THÊM */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4 text-[#8C5E28]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#2B170B]">
                  HIỆN VẬT MỚI THÊM
                </h3>
              </div>
              <Link
                to="/artifacts"
                className="text-xs font-semibold text-[#8C7A6B] hover:text-[#C9974C] transition-colors flex items-center gap-1"
              >
                <span>Xem tất cả</span>
                <span>&rarr;</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
              {displayArtifacts.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    // Find actual artifact from full database if available, else use item
                    const realArtifact = artifacts.find(
                      (a) =>
                        a.name.toLowerCase().includes(item.name.toLowerCase()) ||
                        item.name.toLowerCase().includes(a.name.toLowerCase())
                    );
                    setSelectedArtifact(realArtifact || item);
                  }}
                  className="bg-white rounded-xl overflow-hidden border border-[#ECE4D4] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Image with Tag */}
                    <div className="aspect-[4/3] relative bg-[#F7F2E7] overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span className="absolute top-2.5 left-2.5 bg-black/75 backdrop-blur-xs text-white text-[10px] font-medium px-2 py-0.5 rounded">
                        {item.period}
                      </span>
                    </div>

                    {/* Information */}
                    <div className="p-3.5">
                      <h4 className="font-bold text-xs sm:text-[13px] text-[#2B170B] group-hover:text-[#C9974C] transition-colors truncate">
                        {item.name}
                      </h4>
                      <p className="text-[11px] font-semibold text-[#B88128] mt-0.5 mb-1.5">
                        Niên đại: {item.date}
                      </p>
                      <p className="text-[11px] text-[#6B5A4E] line-clamp-2 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  {/* Location footer */}
                  <div className="px-3.5 pb-3 pt-2 border-t border-[#F4EFE6] flex items-center gap-1 text-[11px] text-[#8C7A6B]">
                    <MapPin className="w-3 h-3 text-[#B88128] shrink-0" />
                    <span className="truncate">Vị trí: {item.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 3.2 TRIỂN LÃM ĐANG DIỄN RA */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-[#8C5E28]" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-[#2B170B]">
                  TRIỂN LÃM ĐANG DIỄN RA
                </h3>
              </div>
              <Link
                to="/exhibitions"
                className="text-xs font-semibold text-[#8C7A6B] hover:text-[#C9974C] transition-colors flex items-center gap-1"
              >
                <span>Xem tất cả</span>
                <span>&rarr;</span>
              </Link>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {displayExhibitions.map((item) => (
                <div
                  key={item.id}
                  onClick={() => navigate('/exhibitions')}
                  className="bg-white rounded-xl overflow-hidden border border-[#ECE4D4] shadow-xs hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 cursor-pointer flex flex-col justify-between group"
                >
                  <div>
                    {/* Exhibition Image */}
                    <div className="aspect-[16/10] relative bg-[#F7F2E7] overflow-hidden">
                      <img
                        src={item.image}
                        alt={item.name}
                        className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      />
                      <span
                        className={`absolute top-2.5 left-2.5 ${item.statusColor} text-white text-[10px] font-bold px-2.5 py-0.5 rounded shadow-xs`}
                      >
                        {item.status}
                      </span>
                    </div>

                    {/* Exhibition Details */}
                    <div className="p-3.5">
                      <h4 className="font-bold text-xs sm:text-[13px] text-[#2B170B] group-hover:text-[#C9974C] transition-colors line-clamp-1">
                        {item.name}
                      </h4>
                      <div className="flex items-center gap-1.5 text-[11px] text-[#8C7A6B] mt-2">
                        <Calendar className="w-3 h-3 text-[#B88128] shrink-0" />
                        <span>{item.date}</span>
                      </div>
                    </div>
                  </div>

                  {/* Location */}
                  <div className="px-3.5 pb-3 pt-2 border-t border-[#F4EFE6] flex items-center gap-1 text-[11px] text-[#8C7A6B]">
                    <MapPin className="w-3 h-3 text-[#B88128] shrink-0" />
                    <span className="truncate">{item.location}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: 4 Columns (Visit Chart & Quote Card) */}
        <div className="lg:col-span-4 space-y-4">
          {/* Visit Chart */}
          <VisitChart />

          {/* Historic Quote Card */}
          <div className="bg-white rounded-2xl p-5 sm:p-6 border border-[#ECE4D4] shadow-xs relative overflow-hidden min-h-[140px] flex flex-col justify-center">
            {/* Museum architectural illustration watermark */}
            <img
              src="/images/museum-building.jpg"
              alt="Museum Colonnade"
              className="absolute right-0 bottom-0 w-44 object-contain opacity-15 pointer-events-none -mr-4 -mb-3 grayscale"
            />

            <div className="relative z-10">
              <p className="font-serif italic text-xs sm:text-[13px] text-[#3E2312] leading-relaxed max-w-[85%]">
                “Bảo tàng là nơi quá khứ<br />
                được kể lại bằng những chứng nhân<br />
                của thời gian.”
              </p>
              <div className="w-10 h-0.5 bg-[#C9974C] mt-3 rounded-full" />
            </div>
          </div>
        </div>
      </div>

      <ArtifactDetailModal
        artifact={selectedArtifact}
        isOpen={!!selectedArtifact}
        onClose={() => setSelectedArtifact(null)}
      />
    </div>
  );
};
