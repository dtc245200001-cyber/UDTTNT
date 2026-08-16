import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';
import { Star, MessageSquare, AlertCircle, CheckCircle2 } from 'lucide-react';

export const ReviewFormModal = ({ isOpen, onClose, artifactName = 'Bảo tàng Lịch sử Quốc gia' }) => {
  const navigate = useNavigate();
  const { currentUser, isAuthenticated, addReview, addToast } = useApp();

  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoverStar, setHoverStar] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedArtifact, setSelectedArtifact] = useState(artifactName);

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!isAuthenticated) {
      addToast('Vui lòng đăng nhập tài khoản khách để gửi đánh giá.', 'error');
      onClose();
      navigate('/login?redirect=/reviews');
      return;
    }

    if (!comment.trim() || comment.trim().length < 5) {
      setErrorMsg('Nội dung nhận xét quá ngắn (tối thiểu 5 ký tự).');
      return;
    }

    const res = addReview({
      rating,
      comment: comment.trim(),
      artifactName: selectedArtifact,
    });

    if (res.success) {
      setComment('');
      setRating(5);
      onClose();
    } else {
      setErrorMsg(res.message);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="✍️ GỬI ĐÁNH GIÁ & PHẢN HỒI"
      maxWidth="max-w-md"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans">
        {!isAuthenticated && (
          <div className="p-3 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Bạn cần đăng nhập trước khi gửi nhận xét công khai.</span>
          </div>
        )}

        {/* Artifact Target */}
        <div>
          <label className="block font-bold text-museum-brown mb-1">Hiện vật / Không gian nhận xét</label>
          <input
            type="text"
            value={selectedArtifact}
            onChange={(e) => setSelectedArtifact(e.target.value)}
            placeholder="Tên hiện vật hoặc bảo tàng..."
            className="w-full p-2.5 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold font-medium"
          />
        </div>

        {/* Rating Stars */}
        <div>
          <label className="block font-bold text-museum-brown mb-1.5">Mức độ hài lòng (Số sao)</label>
          <div className="flex items-center gap-2 bg-museum-ivory p-3 rounded-xl border border-museum-gold/30 w-fit">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverStar(star)}
                onMouseLeave={() => setHoverStar(0)}
                className="p-1 transition-transform transform hover:scale-125 cursor-pointer"
              >
                <Star
                  className={`w-6 h-6 ${
                    (hoverStar || rating) >= star
                      ? 'fill-amber-400 text-amber-400'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
            <span className="font-extrabold text-sm text-museum-brown ml-2">
              {rating}/5 Sao
            </span>
          </div>
        </div>

        {/* Comment textarea */}
        <div>
          <label className="block font-bold text-museum-brown mb-1">
            Nội dung nhận xét <span className="text-danger">*</span>
          </label>
          <textarea
            rows={4}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Chia sẻ trải nghiệm hoặc cảm nhận của bạn về hiện vật, không gian triển lãm (không chứa từ cấm/spam)..."
            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold leading-relaxed"
          />
        </div>

        {errorMsg && (
          <div className="p-3 bg-red-50 border border-red-200 text-danger rounded-xl flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-xl transition-colors cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-6 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold rounded-xl shadow-md transition-colors cursor-pointer"
          >
            Gửi đánh giá công khai
          </button>
        </div>
      </form>
    </Modal>
  );
};
