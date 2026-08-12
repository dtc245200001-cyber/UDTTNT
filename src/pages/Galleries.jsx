import React from 'react';
import { Image, MapPin, Layers } from 'lucide-react';

export const Galleries = () => {
  const galleries = [
    { id: 'GAL01', name: 'Phòng trưng bày A', theme: 'Văn hóa Tiền sử & Đông Sơn', itemsCount: 320, area: '450m²', floor: 'Tầng 1', image: '/images/museum-hero.jpg' },
    { id: 'GAL02', name: 'Phòng trưng bày B', theme: 'Triều đại Lý - Trần - Lê', itemsCount: 480, area: '600m²', floor: 'Tầng 1', image: '/images/bia-tien-si.jpg' },
    { id: 'GAL03', name: 'Phòng trưng bày C', theme: 'Triều Nguyễn & Gốm sứ cổ', itemsCount: 250, area: '380m²', floor: 'Tầng 2', image: '/images/binh-gom.jpg' },
    { id: 'GAL04', name: 'Phòng trưng bày D', theme: 'Di sản Văn hóa Phi vật thể', itemsCount: 180, area: '300m²', floor: 'Tầng 2', image: '/images/tuong-phat.jpg' },
  ];

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <div className="text-xs font-semibold text-gray-400 mb-1">
          Tổng quan / <span className="text-museum-brown font-bold">Phòng trưng bày</span>
        </div>
        <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
          DANH SÁCH PHÒNG TRƯNG BÀY
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {galleries.map((g) => (
          <div key={g.id} className="bg-white rounded-2xl overflow-hidden shadow-xs hover:shadow-md border border-gray-100 flex flex-col sm:flex-row">
            <div className="sm:w-2/5 aspect-[4/3] sm:aspect-auto relative bg-museum-cream">
              <img src={g.image} alt={g.name} className="w-full h-full object-cover" />
            </div>
            <div className="sm:w-3/5 p-5 flex flex-col justify-between space-y-3">
              <div>
                <span className="text-xs font-bold text-museum-gold uppercase">{g.id} • {g.floor}</span>
                <h3 className="font-bold text-lg text-museum-brown mt-0.5">{g.name}</h3>
                <p className="text-xs text-gray-500 font-medium mt-1">{g.theme}</p>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-3 border-t border-gray-100 text-gray-600">
                <div className="flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-museum-gold" />
                  <span>{g.itemsCount} hiện vật</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-museum-brown" />
                  <span>{g.area}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
