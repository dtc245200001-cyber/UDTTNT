import React, { useState, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Modal } from '@/components/ui/Modal';

export const EventRegistrationModal = ({ event, isOpen, onClose }) => {
  const { currentUser, registerForEvent } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    visitDate: '',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isOpen && event) {
      setFormData({
        name: currentUser?.name || '',
        phone: currentUser?.phone || '',
        email: currentUser?.email || '',
        visitDate: event?.date || new Date().toISOString().split('T')[0],
      });
      setErrors({});
    }
  }, [isOpen, event, currentUser]);

  const validate = () => {
    const errs = {};

    if (!formData.name.trim()) {
      errs.name = 'Vui lòng nhập họ và tên.';
    }

    if (!formData.phone.trim()) {
      errs.phone = 'Vui lòng nhập số điện thoại.';
    } else if (!/^[0-9+\s-]{8,15}$/.test(formData.phone.trim())) {
      errs.phone = 'Vui lòng nhập số điện thoại hợp lệ.';
    }

    if (!formData.email.trim()) {
      errs.email = 'Vui lòng nhập email.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email.trim())) {
      errs.email = 'Vui lòng nhập email hợp lệ.';
    }

    if (!formData.visitDate) {
      errs.visitDate = 'Vui lòng chọn ngày tham quan.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    registerForEvent({
      eventId: event.id,
      eventTitle: event.title,
      name: formData.name,
      phone: formData.phone,
      email: formData.email,
      visitDate: formData.visitDate,
    });

    onClose();
  };

  if (!event) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="ĐĂNG KÝ THAM DỰ" maxWidth="max-w-md">
      <form onSubmit={handleSubmit} className="space-y-4 text-xs font-sans" noValidate>
        {/* Dynamic Event Title */}
        <div className="p-3.5 bg-museum-cream rounded-xl border border-museum-gold/30 space-y-1">
          <span className="text-[11px] font-bold text-museum-gold uppercase tracking-wider block">
            Tên sự kiện:
          </span>
          <h4 className="font-extrabold text-sm sm:text-base text-museum-brown leading-snug">
            {event.title}
          </h4>
        </div>

        {/* 1. Họ và tên */}
        <div>
          <label className="block font-bold text-museum-brown mb-1">
            Họ và tên <span className="text-danger">*</span>
          </label>
          <input
            type="text"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            placeholder="Nhập họ và tên"
            className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
              errors.name ? 'border-danger bg-red-50' : 'border-gray-200'
            }`}
          />
          {errors.name && <p className="text-xs text-danger mt-1 font-medium">{errors.name}</p>}
        </div>

        {/* 2. Số điện thoại */}
        <div>
          <label className="block font-bold text-museum-brown mb-1">
            Số điện thoại <span className="text-danger">*</span>
          </label>
          <input
            type="tel"
            value={formData.phone}
            onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
            placeholder="Nhập số điện thoại"
            className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
              errors.phone ? 'border-danger bg-red-50' : 'border-gray-200'
            }`}
          />
          {errors.phone && <p className="text-xs text-danger mt-1 font-medium">{errors.phone}</p>}
        </div>

        {/* 3. Email */}
        <div>
          <label className="block font-bold text-museum-brown mb-1">
            Email <span className="text-danger">*</span>
          </label>
          <input
            type="email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            placeholder="example@gmail.com"
            className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
              errors.email ? 'border-danger bg-red-50' : 'border-gray-200'
            }`}
          />
          {errors.email && <p className="text-xs text-danger mt-1 font-medium">{errors.email}</p>}
        </div>

        {/* 4. Ngày tham quan */}
        <div>
          <label className="block font-bold text-museum-brown mb-1">
            Ngày tham quan <span className="text-danger">*</span>
          </label>
          <input
            type="date"
            value={formData.visitDate}
            onChange={(e) => setFormData({ ...formData, visitDate: e.target.value })}
            className={`w-full p-2.5 bg-gray-50 border rounded-xl focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
              errors.visitDate ? 'border-danger bg-red-50' : 'border-gray-200'
            }`}
          />
          {errors.visitDate && <p className="text-xs text-danger mt-1 font-medium">{errors.visitDate}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 bg-museum-brown text-white font-bold rounded-xl hover:bg-museum-brown-dk transition-colors cursor-pointer shadow-md text-xs sm:text-sm"
        >
          Xác nhận đăng ký
        </button>
      </form>
    </Modal>
  );
};
