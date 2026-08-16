import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { Mail, Lock, LogIn } from 'lucide-react';

export const Login = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const { login, registerForEvent } = useApp();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    setEmail('');
    setPassword('');
  }, []);

  const validate = () => {
    const newErrors = {};
    if (!email.trim()) {
      newErrors.email = 'Vui lòng nhập địa chỉ email.';
    }
    if (!password) {
      newErrors.password = 'Vui lòng nhập mật khẩu.';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const result = login(email, password);
    if (result.success) {
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

      if (redirectTarget) {
        navigate(redirectTarget);
      } else if (result.user.role === 'admin') {
        navigate('/dashboard');
      } else {
        navigate('/');
      }
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn font-sans">
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-museum-brown tracking-tight">
          Đăng Nhập Hệ Thống
        </h2>
        <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">
          Nhập thông tin tài khoản của bạn để tiếp tục
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
        <input type="text" name="fake_email_prevent_autofill" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />
        <input type="password" name="fake_password_prevent_autofill" style={{ display: 'none' }} tabIndex={-1} aria-hidden="true" />

        {/* Email Field */}
        <div>
          <label className="block text-xs font-bold text-museum-brown mb-1.5">
            Địa chỉ Email <span className="text-danger">*</span>
          </label>
          <div className="relative">
            <Mail className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="user_email_login_no_autofill"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="VD: admin@baotang.gov.vn"
              autoComplete="new-password"
              className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
                errors.email ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
          </div>
          {errors.email && <p className="text-xs text-danger mt-1">{errors.email}</p>}
        </div>

        {/* Password Field */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="block text-xs font-bold text-museum-brown">
              Mật khẩu <span className="text-danger">*</span>
            </label>
            <a
              href="#forgot"
              onClick={(e) => {
                e.preventDefault();
                alert('Vui lòng liên hệ Quản trị viên hệ thống để khôi phục mật khẩu!');
              }}
              className="text-xs font-semibold text-museum-gold hover:text-museum-brown transition-colors"
            >
              Quên mật khẩu?
            </a>
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 text-gray-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="password"
              name="user_password_login_no_autofill"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="new-password"
              className={`w-full pl-10 pr-4 py-2.5 bg-gray-50 text-xs sm:text-sm rounded-xl border focus:outline-none focus:ring-2 focus:ring-museum-gold transition-colors ${
                errors.password ? 'border-danger bg-red-50' : 'border-gray-200'
              }`}
            />
          </div>
          {errors.password && <p className="text-xs text-danger mt-1">{errors.password}</p>}
        </div>

        {/* Remember me Checkbox */}
        <div className="flex items-center justify-between text-xs pt-1">
          <label className="flex items-center gap-2 font-medium text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 text-museum-gold focus:ring-museum-gold accent-museum-gold"
            />
            <span>Ghi nhớ đăng nhập</span>
          </label>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          className="w-full py-3 px-4 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-colors cursor-pointer"
        >
          <LogIn className="w-4 h-4" />
          <span>Đăng nhập</span>
        </button>
      </form>

      {/* Switch to Register */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
        Bạn chưa có tài khoản?{' '}
        <Link to="/register" className="font-bold text-museum-gold hover:text-museum-brown transition-colors">
          Đăng ký Khách tham quan ngay &rarr;
        </Link>
      </div>
    </div>
  );
};
