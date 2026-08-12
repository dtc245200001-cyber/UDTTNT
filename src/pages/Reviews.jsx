import React from 'react';
import { reviews } from '@/data/reviews';
import { Star } from 'lucide-react';

export const Reviews = () => {
  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <div className="text-xs font-semibold text-gray-400 mb-1">
          Tổng quan / <span className="text-museum-brown font-bold">Đánh giá</span>
        </div>
        <h2 className="text-2xl font-extrabold text-museum-brown tracking-tight">
          ĐÁNH GIÁ TỪ DU KHÁCH
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {reviews.map((rev) => (
          <div key={rev.id} className="bg-white rounded-2xl p-5 shadow-xs border border-gray-100 flex flex-col justify-between space-y-3">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-sm text-museum-brown">{rev.author}</span>
                <div className="flex items-center text-amber-500">
                  {Array.from({ length: rev.rating }).map((_, i) => (
                    <Star key={i} className="w-4 h-4 fill-amber-400" />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-600 leading-relaxed italic">"{rev.comment}"</p>
            </div>
            <div className="pt-3 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400">
              <span>Hiện vật: <strong className="text-museum-gold">{rev.artifactName}</strong></span>
              <span>{rev.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
