/**
 * Audit Logger Helper for tracking critical operations in Museum Management System.
 * Stores logs in LocalStorage for persistent inspection.
 */

export const getAuditLogs = () => {
  const saved = localStorage.getItem('museum_audit_logs');
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch (e) {
      console.error('Failed to parse audit logs:', e);
    }
  }
  return [
    {
      id: 'LOG-001',
      user: 'admin@gmail.com',
      userName: 'Quản trị viên',
      action: 'LOGIN',
      description: 'Đăng nhập hệ thống quản trị thành công',
      timestamp: new Date(Date.now() - 3600000).toLocaleString('vi-VN'),
    },
    {
      id: 'LOG-002',
      user: 'admin@gmail.com',
      userName: 'Quản trị viên',
      action: 'CREATE_ARTIFACT',
      description: 'Thêm mới hiện vật: Trống đồng Cảnh Thịnh',
      timestamp: new Date(Date.now() - 1800000).toLocaleString('vi-VN'),
    },
  ];
};

export const logAction = (user, action, description) => {
  const currentLogs = getAuditLogs();
  const newLog = {
    id: `LOG-${String(currentLogs.length + 1).padStart(3, '0')}`,
    user: user?.email || 'Hệ thống',
    userName: user?.name || 'Khách',
    action,
    description,
    timestamp: new Date().toLocaleString('vi-VN'),
  };
  const updated = [newLog, ...currentLogs.slice(0, 99)]; // Keep latest 100
  localStorage.setItem('museum_audit_logs', JSON.stringify(updated));
  return newLog;
};
