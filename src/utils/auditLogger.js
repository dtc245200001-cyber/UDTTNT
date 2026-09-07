/**
 * Audit Logger Service - Quản lý Nhật ký An ninh & Truy vết Thao tác Bảo tàng
 * Ghi trực tiếp vào bảng `audit_logs` trên Supabase PostgreSQL (Bất biến, RLS bảo vệ).
 */
import { supabase } from '@/lib/supabase';

/**
 * Lấy danh sách audit logs từ Supabase PostgreSQL (Dành cho Quản trị viên)
 */
export const getAuditLogs = async () => {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);

    if (!error && data && data.length > 0) {
      return data.map((item) => ({
        id: item.id,
        user: item.user_email || 'Hệ thống',
        userName: item.user_name || 'Quản trị viên',
        action: item.action,
        description: item.description,
        timestamp: new Date(item.created_at).toLocaleString('vi-VN'),
      }));
    }
  } catch (err) {
    console.warn('[Audit Log] Lỗi khi truy vấn audit_logs từ Supabase:', err);
  }

  // Dữ liệu mẫu khởi đầu khi chưa có logs trong DB
  return [
    {
      id: 'LOG-INIT-001',
      user: 'admin@baotang.gov.vn',
      userName: 'Quản trị viên Hệ thống',
      action: 'SYSTEM_BOOT',
      description: 'Hệ thống An ninh Bảo tàng Quốc gia khởi động và kích hoạt RLS',
      timestamp: new Date().toLocaleString('vi-VN'),
    },
  ];
};

/**
 * Ghi bản ghi log mới vào cơ sở dữ liệu Supabase PostgreSQL
 */
export const logAction = async (user, action, description) => {
  const newLogEntry = {
    user_id: user?.id && !user.id.startsWith('USR') ? null : user?.id,
    auth_user_id: user?.auth_user_id || null,
    user_email: user?.email || 'Khách vãng lai',
    user_name: user?.name || 'Khách',
    action: action,
    description: description,
  };

  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .insert([newLogEntry])
      .select()
      .single();

    if (!error && data) {
      return {
        id: data.id,
        user: data.user_email,
        userName: data.user_name,
        action: data.action,
        description: data.description,
        timestamp: new Date(data.created_at).toLocaleString('vi-VN'),
      };
    }
  } catch (err) {
    console.warn('[Audit Log] Không thể ghi log lên Supabase:', err);
  }

  // Fallback object để cập nhật UI ngay lập tức
  return {
    id: `LOG-LOCAL-${Date.now()}`,
    user: user?.email || 'Hệ thống',
    userName: user?.name || 'Khách',
    action,
    description,
    timestamp: new Date().toLocaleString('vi-VN'),
  };
};
