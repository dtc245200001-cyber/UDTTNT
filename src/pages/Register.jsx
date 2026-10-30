import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import { User, Mail, Lock, UserPlus, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

export const Register = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirect = searchParams.get('redirect');
  const { register } = useApp();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

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
    if (isSubmitting || successMessage) return;
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const result = await register({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      if (result && result.success) {
        setSuccessMessage('Đăng ký tài khoản thành công! Đang tự động chuyển sang trang Đăng nhập...');
        // Cho người dùng thấy rõ thông báo thành công trong 1.2s trước khi chuyển hướng
        setTimeout(() => {
          navigate(redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login', {
            state: {
              registeredEmail: formData.email.trim().toLowerCase(),
              message: 'Tài khoản của bạn đã sẵn sàng! Vui lòng nhập mật khẩu để đăng nhập.',
            },
          });
        }, 1200);
      } else {
        setIsSubmitting(false);
        setErrors((prev) => ({
          ...prev,
          general: result?.message || 'Đăng ký tài khoản không thành công. Vui lòng thử lại!',
        }));
      }
    } catch (err) {
      setIsSubmitting(false);
      setErrors((prev) => ({
        ...prev,
        general: err.message || 'Lỗi kết nối máy chủ, vui lòng thử lại sau ít phút.',
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

        {/* Thông báo thành công nổi bật */}
        {successMessage && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-start gap-3 animate-fadeIn shadow-xs">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
            <div>
              <div className="text-xs sm:text-sm font-bold text-emerald-800">Đăng ký thành công!</div>
              <div className="text-xs text-emerald-700 mt-0.5">{successMessage}</div>
            </div>
          </div>
        )}

        {/* Thông báo lỗi nổi bật */}
        {errors.general && (
          <div className="p-3.5 bg-red-50 text-red-700 text-xs sm:text-sm font-semibold rounded-xl border border-red-200 flex items-center gap-2 animate-fadeIn shadow-xs">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span>{errors.general}</span>
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
          disabled={isSubmitting || Boolean(successMessage)}
          className={`w-full py-3 px-4 font-bold text-sm rounded-xl shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer ${
            successMessage
              ? 'bg-emerald-600 text-white cursor-default'
              : isSubmitting
              ? 'bg-stone-400 text-white cursor-not-allowed'
              : 'bg-museum-brown hover:bg-museum-brown-dk text-white active:scale-[0.99]'
          }`}
        >
          {successMessage ? (
            <>
              <CheckCircle2 className="w-4 h-4 animate-bounce" />
              <span>Đăng ký thành công! Đang chuyển hướng...</span>
            </>
          ) : isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Đang khởi tạo tài khoản...</span>
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4" />
              <span>Đăng ký tài khoản</span>
            </>
          )}
        </button>
      </form>

      {/* Switch to Login */}
      <div className="text-center text-xs text-gray-500 pt-2 border-t border-gray-100">
        Bạn đã có tài khoản?{' '}
        <Link
          to={redirect ? `/login?redirect=${encodeURIComponent(redirect)}` : '/login'}
          className="font-bold text-museum-gold hover:text-museum-brown transition-colors"
        >
          Đăng nhập tại đây &rarr;
        </Link>
      </div>
    </div>
  );
};
