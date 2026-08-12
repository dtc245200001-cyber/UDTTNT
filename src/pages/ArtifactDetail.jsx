import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Pencil, Trash2, ArrowLeft, Bot, MapPin, Tag, Calendar, Shield } from 'lucide-react';
import { Badge } from '@/components/ui/Badge';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { ArtifactFormModal } from '@/components/artifacts/ArtifactFormModal';

export const ArtifactDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { artifacts, deleteArtifact } = useApp();

  const artifact = artifacts.find((a) => a.id === id);

  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [activeImage, setActiveImage] = useState(artifact?.image || '');

  if (!artifact) {
    return (
      <div className="text-center py-16">
        <h3 className="text-xl font-bold text-museum-brown mb-2">Không tìm thấy hiện vật!</h3>
        <p className="text-gray-500 text-sm mb-6">Hiện vật có thể đã bị xóa hoặc đường dẫn không đúng.</p>
        <button
          onClick={() => navigate('/artifacts')}
          className="px-5 py-2.5 bg-museum-brown text-white font-bold rounded-xl text-sm"
        >
          Quay lại danh sách hiện vật
        </button>
      </div>
    );
  }

  const handleDelete = () => {
    deleteArtifact(artifact.id);
    navigate('/artifacts');
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Breadcrumb & Navigation Back */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/artifacts')}
          className="inline-flex items-center gap-2 text-xs font-semibold text-museum-brown hover:text-museum-gold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại danh sách</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsEditOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-museum-gold text-museum-brown font-semibold text-xs rounded-xl hover:bg-museum-cream transition-colors shadow-xs"
          >
            <Pencil className="w-4 h-4" />
            <span>Sửa hiện vật</span>
          </button>
          <button
            onClick={() => setIsDeleteOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-rose-300 text-danger hover:bg-rose-50 font-semibold text-xs rounded-xl transition-colors shadow-xs"
          >
            <Trash2 className="w-4 h-4" />
            <span>Xóa hiện vật</span>
          </button>
        </div>
      </div>

      {/* 2-Column Detail Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image & Gallery */}
        <div className="lg:col-span-5 space-y-4">
          <div className="aspect-[4/3] rounded-2xl overflow-hidden bg-white shadow-md border border-museum-cream relative">
            <img
              src={activeImage || artifact.image}
              alt={artifact.name}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-4 left-4">
              <Badge variant="gold">{artifact.status}</Badge>
            </div>
          </div>

          {/* Thumbnail Gallery */}
          <div className="flex items-center gap-3">
            {[artifact.image, '/images/trong-dong.jpg', '/images/bia-tien-si.jpg'].map((img, idx) => (
              <button
                key={idx}
                onClick={() => setActiveImage(img)}
                className={`w-20 h-16 rounded-xl overflow-hidden border-2 transition-all ${
                  activeImage === img ? 'border-museum-gold scale-105 shadow-md' : 'border-gray-200 opacity-60 hover:opacity-100'
                }`}
              >
                <img src={img} alt="Thumbnail" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Attribute Details */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 shadow-xs border border-gray-100 space-y-6">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold text-museum-gold mb-1">
                <span>Mã số: {artifact.id}</span>
                <span>•</span>
                <span>{artifact.category}</span>
              </div>
              <h1 className="text-2xl lg:text-3xl font-extrabold text-museum-brown">
                {artifact.name}
              </h1>
            </div>

            {/* Information Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3.5 bg-museum-ivory rounded-xl border border-museum-cream/60">
                <span className="text-gray-400 font-medium block mb-1">Văn hóa / Thời kỳ</span>
                <span className="font-bold text-museum-brown text-sm">{artifact.culture}</span>
              </div>

              <div className="p-3.5 bg-museum-ivory rounded-xl border border-museum-cream/60">
                <span className="text-gray-400 font-medium block mb-1">Niên đại</span>
                <span className="font-bold text-museum-brown text-sm">{artifact.period}</span>
              </div>

              <div className="p-3.5 bg-museum-ivory rounded-xl border border-museum-cream/60">
                <span className="text-gray-400 font-medium block mb-1">Chất liệu</span>
                <span className="font-bold text-museum-brown text-sm">{artifact.material}</span>
              </div>

              <div className="p-3.5 bg-museum-ivory rounded-xl border border-museum-cream/60">
                <span className="text-gray-400 font-medium block mb-1">Kích thước</span>
                <span className="font-bold text-museum-brown text-sm">{artifact.dimensions}</span>
              </div>

              <div className="p-3.5 bg-museum-ivory rounded-xl border border-museum-cream/60">
                <span className="text-gray-400 font-medium block mb-1">Nguồn gốc xuất xứ</span>
                <span className="font-bold text-museum-brown text-sm">{artifact.origin}</span>
              </div>

              <div className="p-3.5 bg-museum-ivory rounded-xl border border-museum-cream/60">
                <span className="text-gray-400 font-medium block mb-1">Vị trí trưng bày</span>
                <span className="font-bold text-museum-brown text-sm flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-museum-gold" />
                  {artifact.location}
                </span>
              </div>
            </div>

            {/* Detailed Description */}
            <div>
              <h3 className="font-bold text-sm text-museum-brown uppercase mb-2 tracking-wider">
                MÔ TẢ CHI TIẾT
              </h3>
              <p className="text-sm text-gray-700 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">
                {artifact.description}
              </p>
            </div>
          </div>

          {/* Separate Block: AI Analysis */}
          <div className="bg-museum-cream/80 rounded-2xl p-6 border border-museum-gold/30 shadow-xs space-y-3">
            <div className="flex items-center gap-2.5 text-museum-brown">
              <div className="w-8 h-8 rounded-xl bg-museum-brown text-museum-gold flex items-center justify-center">
                <Bot className="w-5 h-5" />
              </div>
              <h3 className="font-extrabold text-sm uppercase tracking-wider">
                🤖 AI PHÂN TÍCH HIỆN VẬT
              </h3>
            </div>
            <p className="text-xs sm:text-sm text-museum-brown-dk font-medium leading-relaxed italic bg-white/60 p-4 rounded-xl border border-museum-gold-lt/30">
              "{artifact.aiAnalysis}"
            </p>
          </div>
        </div>
      </div>

      {/* Edit Modal */}
      <ArtifactFormModal
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        artifactToEdit={artifact}
      />

      {/* Delete Confirm Modal */}
      <ConfirmModal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={handleDelete}
        itemName={artifact.name}
      />
    </div>
  );
};
