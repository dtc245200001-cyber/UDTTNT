import React, { useState, useEffect, useRef } from 'react';
import { PanoramaCubeViewer } from './PanoramaCubeViewer';
import { TIEN_SU_TOUR_SCENES } from '@/data/toursData';

/**
 * Dữ liệu 4 tour tham quan 3D ảo của Bảo tàng Lịch sử Quốc gia
 */
export const TOURS_3D_DATA = [
  {
    id: 'vietnamthoitiensu',
    title: 'Việt Nam thời Tiền Sử',
    description: 'Khám phá dấu tích người vượn và các nền văn hóa đồ đá sơ khai tại Việt Nam.',
    link: 'https://vnmh.egal.vn/tours/vietnamthoitiensu/',
    image: '/images/binh-gom.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1544967082-d9d25d867d66?auto=format&fit=crop&w=800&q=80',
    tag: 'Thời kỳ Tiền sử',
    viewCount: '360° Panorama',
    scenes: TIEN_SU_TOUR_SCENES,
    cubeFaces: TIEN_SU_TOUR_SCENES[0].cubeFaces,
  },
  {
    id: 'dongson',
    title: 'Văn hóa Đông Sơn',
    description: 'Chiêm ngưỡng kỹ thuật đúc đồng đỉnh cao và biểu tượng Trống đồng Đông Sơn huyền thoại.',
    link: 'https://vnmh.egal.vn/tours/dongson/',
    image: '/images/trong-dong.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1569242840510-a2bc9cae2030?auto=format&fit=crop&w=800&q=80',
    tag: 'Thời kỳ Kim khí',
    viewCount: '360° Panorama',
  },
  {
    id: 'ngodinhtienlelytran',
    title: 'Triều Ngô - Đinh - Tiền Lê - Lý, Trần',
    description: 'Hành trình qua các triều đại phong kiến huy hoàng và nền văn minh Đại Việt rực rỡ.',
    link: 'https://vnmh.egal.vn/tours/ngodinhtienlelytran/',
    image: '/images/bia-tien-si.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1583089892943-e02e5b017b6a?auto=format&fit=crop&w=800&q=80',
    tag: 'Kỷ nguyên Độc lập',
    viewCount: '360° Panorama',
  },
  {
    id: 'Oceo-Phunam',
    title: 'Óc Eo - Phù Nam',
    description: 'Dấu ấn vương quốc cổ Phù Nam và trung tâm thương mại đường biển sầm uất phương Nam.',
    link: 'https://vnmh.egal.vn/tours/Oceo-Phunam/',
    image: '/images/tuong-phat.jpg',
    fallbackImage: 'https://images.unsplash.com/photo-1608889175123-8ee362201f81?auto=format&fit=crop&w=800&q=80',
    tag: 'Văn hóa Phương Nam',
    viewCount: '360° Panorama',
  },
];

/**
 * Component Section: Khám phá Bảo tàng 3D
 * - Tông màu: Nâu đất (#5B3A1F / #3E2712), Vàng đồng (#B8860B / #D9A441), Be/Ivory (#F5EFE0 / #FBF8F1)
 * - Responsive: 1 cột (mobile) -> 2 cột (tablet) -> 4 cột (desktop)
 * - Animation: Fade-in khi cuộn vào tầm nhìn (Intersection Observer) + hover nâng thẻ và đổ bóng mượt mà
 */
export const VirtualTour3DSection = () => {
  const sectionRef = useRef(null);
  const [isVisible, setIsVisible] = useState(false);
  const [active3DModalTour, setActive3DModalTour] = useState(null);

  // Hiệu ứng fade-in khi cuộn tới section (sử dụng IntersectionObserver thuần túy, không cần thư viện ngoài)
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.unobserve(entry.target); // Kích hoạt 1 lần khi cuộn tới
        }
      },
      {
        threshold: 0.15, // Kích hoạt khi 15% section lọt vào khung nhìn
      }
    );

    if (sectionRef.current) {
      observer.observe(sectionRef.current);
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current);
      }
    };
  }, []);

  return (
    <section
      ref={sectionRef}
      className="py-16 px-4 sm:px-6 lg:px-8 bg-[#FBF8F1] transition-all duration-1000 ease-out relative overflow-hidden"
    >
      {/* Họa tiết trang trí nền nhẹ nhàng theo phong cách cổ điển */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-[#B8860B]/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#5B3A1F]/5 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Phần Header Tiêu đề & Mô tả */}
        <div
          className={`text-center max-w-3xl mx-auto mb-12 sm:mb-16 transition-all duration-1000 transform ${
            isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
          }`}
        >
          {/* Badge nhỏ phong cách cổ kính */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#F5EFE0] border border-[#B8860B]/30 text-[#8C6010] text-xs font-semibold uppercase tracking-widest mb-4 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-[#B8860B] animate-pulse"></span>
            Không gian thực tế ảo 360°
          </div>

          {/* Tiêu đề chính */}
          <h2 className="text-3xl sm:text-4xl font-bold text-[#3E2712] tracking-normal mb-4 font-sans card-title">
            Khám phá Bảo tàng 3D
          </h2>

          {/* Dải phân cách mạ vàng đồng cổ điển */}
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="h-[1px] w-12 bg-gradient-to-r from-transparent to-[#B8860B]"></span>
            <span className="w-2 h-2 rotate-45 border border-[#B8860B] bg-[#F5EFE0]"></span>
            <span className="h-[1px] w-12 bg-gradient-to-l from-transparent to-[#B8860B]"></span>
          </div>

          {/* Mô tả ngắn */}
          <p className="text-base sm:text-lg text-[#5B3A1F]/80 leading-relaxed font-sans card-description">
            Trải nghiệm tham quan ảo 360° các không gian trưng bày của Bảo tàng Lịch sử Quốc gia.
          </p>
        </div>

        {/* Lưới 4 Thẻ Tour 3D (Responsive: 1 cột mobile, 2 cột tablet, 4 cột desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8">
          {TOURS_3D_DATA.map((tour, index) => (
            <div
              key={tour.id}
              className={`group bg-white rounded-2xl overflow-hidden border border-[#5B3A1F]/10 shadow-md hover:shadow-2xl transition-all duration-500 ease-out transform hover:-translate-y-2 flex flex-col ${
                isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-12'
              }`}
              style={{
                transitionDelay: `${index * 150}ms`,
              }}
            >
              {/* Khung ảnh đại diện với hiệu ứng zoom nhẹ khi hover */}
              <div
                className="relative aspect-[4/3] w-full overflow-hidden bg-[#F5EFE0] cursor-pointer"
                onClick={() => {
                  if (tour.cubeFaces) {
                    setActive3DModalTour(tour);
                  } else {
                    window.open(tour.link, '_blank', 'noopener,noreferrer');
                  }
                }}
              >
                <img
                  src={tour.image}
                  alt={tour.title}
                  onError={(e) => {
                    e.currentTarget.src = tour.fallbackImage;
                  }}
                  className="w-full h-full object-cover object-center transform group-hover:scale-110 transition-transform duration-700 ease-out"
                  loading="lazy"
                />

                {/* Lớp phủ gradient tạo chiều sâu và bảo đảm độ tương phản */}
                <div className="absolute inset-0 bg-gradient-to-t from-[#3E2712]/75 via-transparent to-black/20 group-hover:from-[#3E2712]/85 transition-colors duration-300" />

                {/* Huy hiệu 360° ở góc trên */}
                <div className="absolute top-3 right-3 bg-[#3E2712]/80 backdrop-blur-md text-[#D9A441] border border-[#B8860B]/40 text-xs font-semibold px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                    <path d="M2 12h20" />
                  </svg>
                  <span>{tour.cubeFaces ? 'Cube 360°' : '360° VR'}</span>
                </div>

                {/* Nhãn phân loại thời kỳ */}
                <div className="absolute bottom-3 left-3 text-xs font-medium text-[#FBF8F1] bg-[#5B3A1F]/90 px-2.5 py-0.5 rounded backdrop-blur-sm border border-[#B8860B]/30">
                  {tour.tag}
                </div>
              </div>

              {/* Nội dung thông tin thẻ */}
              <div className="p-5 flex-1 flex flex-col justify-between bg-gradient-to-b from-white to-[#FBF8F1]">
                <div>
                  <h3 className="card-title text-lg font-bold text-[#3E2712] group-hover:text-[#B8860B] transition-colors duration-300 line-clamp-2 min-h-[3.5rem] mb-2 leading-snug font-sans tracking-normal">
                    {tour.title}
                  </h3>
                  <p className="card-description text-xs sm:text-sm text-[#5B3A1F]/70 line-clamp-2 mb-5 font-sans leading-relaxed tracking-normal">
                    {tour.description}
                  </p>
                </div>

                {/* Nút hành động */}
                <div className="space-y-2">
                  {tour.cubeFaces ? (
                    <button
                      type="button"
                      onClick={() => setActive3DModalTour(tour)}
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#B8860B] hover:bg-[#D9A441] text-white text-sm font-semibold tracking-normal shadow-md hover:shadow-lg transition-all duration-300 group/btn cursor-pointer"
                    >
                      <span>Trải nghiệm 360° tại web</span>
                      <svg
                        className="w-4 h-4 transform group-hover/btn:rotate-45 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <circle cx="12" cy="12" r="10" />
                        <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                        <path d="M2 12h20" />
                      </svg>
                    </button>
                  ) : (
                    <a
                      href={tour.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#5B3A1F] hover:bg-[#B8860B] active:bg-[#3E2712] text-[#FBF8F1] hover:text-white text-sm font-medium tracking-normal shadow transition-all duration-300 group/btn focus:outline-none focus:ring-2 focus:ring-[#B8860B] focus:ring-offset-2"
                      title={`Mở tour 3D: ${tour.title}`}
                    >
                      <span>Xem tour 3D</span>
                      <svg
                        className="w-4 h-4 transform group-hover/btn:translate-x-1 transition-transform duration-300"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                        />
                      </svg>
                    </a>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal hiển thị Không gian 360° trực tiếp với PanoramaCubeViewer */}
      {active3DModalTour && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-5xl bg-[#2B2825] rounded-3xl overflow-hidden border border-[#B8860B]/40 shadow-2xl flex flex-col">
            {/* Nút đóng modal */}
            <button
              onClick={() => setActive3DModalTour(null)}
              className="absolute top-4 right-4 z-40 w-9 h-9 rounded-full bg-black/60 hover:bg-[#B8860B] text-white flex items-center justify-center border border-white/20 transition-all cursor-pointer shadow-lg active:scale-95"
              title="Đóng cửa sổ"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>

            {/* Component Panorama Cube Viewer dựng từ 6 ảnh tĩnh hỗ trợ Multi-scene & Hotspots */}
            <PanoramaCubeViewer
              scenes={active3DModalTour.scenes}
              cubeFaces={active3DModalTour.cubeFaces}
              title={active3DModalTour.title}
              className="h-[540px] sm:h-[680px]"
            />
          </div>
        </div>
      )}
    </section>
  );
};

export default VirtualTour3DSection;
