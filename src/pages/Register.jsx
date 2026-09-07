import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { User, Mail, Lock, UserPlus } from 'lucide-react';

export const Register = () => {
  const navigate = useNavigate();
  const { register } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});

  // Ensure state is completely empty on mount to override browser autofill
  useEffect(() => {
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    });
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!formData.name.trim()) {
      newErrors.name = 'Vui lòng nhập họ và tên.';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email.';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email không đúng định dạng.';
    }
    if (!formData.password) {
      newErrors.password = 'Vui lòng nhập mật khẩu.';
    } else if (formData.password.length < 8) {
      newErrors.password = 'Mật khẩu phải từ 8 ký tự trở lên.';
    } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(formData.password)) {
      newErrors.password = 'Mật khẩu phải gồm chữ hoa, chữ thường và số.';
    }
    if (formData.confirmPassword !== formData.password) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu không trùng khớp.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = await register({
      name: formData.name,
      email: formData.email,
      password: formData.password,
    });

    if (result && result.success) {
      const pendingTicket = localStorage.getItem('pending_ticket_booking');
      if (pendingTicket) {
        localStorage.removeItem('pending_ticket_booking');
        navigate('/#tickets');
        return;
      }

      const pendingReg = localStorage.getItem('pending_event_registration');
      if (pendingReg) {
        try {
          const { eventId } = JSON.parse(pendingReg);
          localStorage.removeItem('pending_event_registration');
          registerForEvent(eventId);
          navigate('/events');
          return;
        } catch (err) {
          console.error('Failed to parse pending event registration', err);
        }
      }

      const isAdminUser =
        result.user?.role === 'admin' ||
        result.user?.roleLabel?.toLowerCase()?.includes('quản trị') ||
        formData.email.trim().toLowerCase() === 'admin@gmail.com';

      if (isAdminUser) {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    } else {
      setErrors((prev) => ({
        ...prev,
        general: result?.message || 'Đăng ký tài khoản không thành công. Vui lòng thử lại!',
      }));
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-museum-brown tracking-tight">
          Đăng Ký Tài Khoản
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
          Tạo tài khoản Khách tham quan để trải nghiệm dịch vụ bảo tàng
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        {/* Dummy inputs to block Chrome password manager autofill */}
        <input type="text" name="prevent_autofill_username" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
        <input type="password" name="prevent_autofill_password" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />

        {errors.general && (
          <div className="p-3 bg-red-50 text-danger text-xs font-semibold rounded-xl border border-red-200 animate-fadeIn">
            {errors.general}
          </div>
        )}

        {/* Họ tên */}
        <div>
          <label className="block text-xs font-bold text-museum-brown mb-1.5">
            Họ và tên <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <User className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="reg_fullname_field"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="VD: Nguyễn Văn A"
              autoComplete="off"
              className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
                errors.name ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
          </div>
          {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
        </div>

        {/* Email */}
        <div>
          <label className="block text-xs font-bold text-museum-brown mb-1.5">
            Địa chỉ Email <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="reg_email_field_no_autofill"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder="email@example.com"
              autoComplete="new-password"
              className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
                errors.email ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
          </div>
          {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
        </div>

        {/* Mật khẩu */}
        <div>
          <label className="block text-xs font-bold text-museum-brown mb-1.5">
            Mật khẩu <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              name="reg_password_field_no_autofill"
              value={formData.password}
              onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              placeholder="Tối thiểu 8 ký tự, gồm chữ hoa, chữ thường và số"
              autoComplete="new-password"
              className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
                errors.password ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
          </div>
          {errors.password && <p className="text-xs text-danger mt-1">{errors.password}</p>}
        </div>

        {/* Xác nhận mật khẩu */}
        <div>
          <label className="block text-xs font-bold text-museum-brown mb-1.5">
            Xác nhận mật khẩu <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              name="reg_confirm_password_field"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              placeholder="Nhập lại mật khẩu"
              autoComplete="new-password"
              className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
                errors.confirmPassword ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
          </div>
          {errors.confirmPassword && <p className="text-xs text-danger mt-1">{errors.confirmPassword}</p>}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors pt-3"
        >
          <UserPlus className="w-4 h-4" />
          <span>Đăng ký tài khoản</span>
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
        Bạn đã có tài khoản?{' '}
        <Link to="/login" className="font-bold text-museum-gold hover:text-museum-brown transition-colors">
          Đăng nhập tại đây &rarr;
        </Link>
      </div>
    </div>
  );
};
