import React, { useState, useMemo, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { useNavigate } from 'react-router-dom';
import {
  QrCode,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldAlert,
  User,
  Phone,
  Mail,
  Calendar,
  DollarSign,
  Ticket,
  Building2,
  History,
  RotateCcw,
  Sparkles,
  ArrowRight,
  Plus,
  Copy,
  Check,
  Receipt,
  ScanLine,
  Filter,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { parseQRPayload } from '@/services/qrSecurityService';

export const StaffCheckin = () => {
  const { currentUser, isAuthenticated, bookedTickets, confirmStaffCounterCheckin, bookTicket, addToast } = useApp();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [scannedResult, setScannedResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [pendingTab, setPendingTab] = useState('all'); // 'all' | 'counter' | 'online'
  const [copiedCode, setCopiedCode] = useState(false);
  const [logSearchQuery, setLogSearchQuery] = useState('');

  const [recentLogs, setRecentLogs] = useState(() => {
    try {
      const saved = localStorage.getItem('staff_counter_recent_logs');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return [];
  });

  // Tự động lưu recentLogs vào localStorage
  useEffect(() => {
    try {
      localStorage.setItem('staff_counter_recent_logs', JSON.stringify(recentLogs));
    } catch (e) {
      console.error(e);
    }
  }, [recentLogs]);

  const isStaffOrAdmin = currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin');

  // Danh sách các đơn vé chưa check-in (cần soát vé hoặc chờ thu tiền tại quầy)
  const pendingOrders = useMemo(() => {
    return (bookedTickets || []).filter((b) => {
      const isChecked =
        b.checkin_status === 'checked_in' ||
        b.checkinStatus === 'checked_in' ||
        String(b.status).includes('check-in');
      if (isChecked) return false;
      if (b.status === 'Đã hủy') return false;
      return true;
    });
  }, [bookedTickets]);

  const counterPendingOrders = useMemo(() => {
    return pendingOrders.filter(
      (b) =>
        b.paymentMethod === 'counter' ||
        b.payment_method === 'counter' ||
        b.paymentMethod === 'Tại quầy' ||
        b.status === 'Chờ thanh toán tại quầy'
    );
  }, [pendingOrders]);

  const onlinePendingOrders = useMemo(() => {
    return pendingOrders.filter(
      (b) =>
        !(
          b.paymentMethod === 'counter' ||
          b.payment_method === 'counter' ||
          b.paymentMethod === 'Tại quầy' ||
          b.status === 'Chờ thanh toán tại quầy'
        )
    );
  }, [pendingOrders]);

  const filteredPendingOrders = useMemo(() => {
    if (pendingTab === 'counter') return counterPendingOrders;
    if (pendingTab === 'online') return onlinePendingOrders;
    return pendingOrders;
  }, [pendingTab, counterPendingOrders, onlinePendingOrders, pendingOrders]);

  // Kết hợp recentLogs (thao tác trực tiếp) và các vé đã có trạng thái check-in trong hệ thống
  const combinedLogs = useMemo(() => {
    const map = new Map();

    // 1. Thao tác vừa check-in trong ca
    (recentLogs || []).forEach((item) => {
      if (item && item.orderCode) map.set(item.orderCode, item);
    });

    // 2. Tự động lấy các vé đã check-in trong hệ thống
    (bookedTickets || []).forEach((b) => {
      const isChecked =
        b.checkin_status === 'checked_in' ||
        b.checkinStatus === 'checked_in' ||
        String(b.status).includes('check-in') ||
        String(b.status).includes('Đã thanh toán – Đã check-in');

      const code = b.orderCode || b.order_code || b.ticketCode || b.id;
      if (isChecked && code && !map.has(code)) {
        map.set(code, {
          id: b.id || `LOG-${code}`,
          orderCode: code,
          name: b.name || 'Khách tham quan',
          phone: b.phone || '',
          ticketType: b.ticketType || 'Vé tham quan',
          quantity: b.quantity || 1,
          totalPrice: b.totalPrice || b.price || 0,
          paymentMethod: b.paymentMethod || b.payment_method || 'counter',
          time: b.checkinAt ? new Date(b.checkinAt).toLocaleTimeString('vi-VN') : (b.createdAt || 'Trong ca'),
          staffName: b.checkedInBy || b.checked_in_by || currentUser?.name || 'Nhân viên quầy vé',
        });
      }
    });

    return Array.from(map.values());
  }, [recentLogs, bookedTickets, currentUser]);

  // Thống kê ca trực (KPIs)
  const shiftStats = useMemo(() => {
    const totalCollected = combinedLogs.reduce((acc, log) => acc + (Number(log.totalPrice) || 0), 0);
    const totalVisitors = combinedLogs.reduce((acc, log) => acc + (Number(log.quantity) || 1), 0);
    return {
      totalOrders: combinedLogs.length,
      totalCollected,
      totalVisitors,
    };
  }, [combinedLogs]);

  // Lọc tìm kiếm trong bảng lịch sử
  const searchedLogs = useMemo(() => {
    if (!logSearchQuery.trim()) return combinedLogs;
    const q = logSearchQuery.toLowerCase().trim();
    return combinedLogs.filter(
      (log) =>
        String(log.orderCode).toLowerCase().includes(q) ||
        String(log.name).toLowerCase().includes(q) ||
        String(log.staffName).toLowerCase().includes(q) ||
        String(log.ticketType).toLowerCase().includes(q)
    );
  }, [combinedLogs, logSearchQuery]);

  // Handle Lookup Order when QR is scanned or typed
  const handleLookup = (inputCode) => {
    const raw = (inputCode || searchInput).trim();
    if (!raw) {
      addToast('Vui lòng nhập mã đơn hàng hoặc quét mã QR!', 'error');
      return;
    }

    setScanError(null);
    const parsed = parseQRPayload(raw);
    const code = parsed?.orderCode || raw;

    const matched = bookedTickets.find(
      (b) =>
        (b.orderCode && b.orderCode.toLowerCase() === code.toLowerCase()) ||
        (b.order_code && b.order_code.toLowerCase() === code.toLowerCase()) ||
        (b.ticketCode && b.ticketCode.toLowerCase() === code.toLowerCase()) ||
        (b.id && b.id.toLowerCase() === code.toLowerCase())
    );

    if (!matched) {
      setScannedResult(null);
      setScanError(`Không tìm thấy đơn hàng / vé có mã "${code}" trong hệ thống.`);
      return;
    }

    setScannedResult(matched);
  };

  // Staff confirms counter payment & check-in
  const handleConfirmCheckin = async () => {
    if (!scannedResult) return;

    setIsProcessing(true);
    const res = await confirmStaffCounterCheckin(
      scannedResult.orderCode || scannedResult.ticketCode || scannedResult.id,
      currentUser
    );
    setIsProcessing(false);

    if (res.success) {
      setScannedResult(res.order);
      const newLog = {
        id: `LOG-${Date.now()}`,
        orderCode: res.order.orderCode || res.order.ticketCode || res.order.id,
        name: res.order.name,
        phone: res.order.phone || '',
        ticketType: res.order.ticketType,
        quantity: res.order.quantity,
        totalPrice: res.order.totalPrice,
        paymentMethod: res.order.paymentMethod || res.order.payment_method || 'counter',
        time: new Date().toLocaleTimeString('vi-VN'),
        staffName: currentUser?.name || 'Nhân viên quầy vé',
      };
      setRecentLogs((prev) => [newLog, ...prev.filter((l) => l.orderCode !== newLog.orderCode)]);
      addToast(`Check-in thành công cho đơn ${newLog.orderCode}!`, 'success');
    } else {
      setScanError(res.error);
    }
  };

  // Tạo nhanh đơn vé tại quầy mẫu để kiểm tra tính năng soát vé
  const handleCreateDemoCounterOrder = async () => {
    const demoCustomers = [
      { name: 'Nguyễn Thị Mai', ticketType: 'Vé Người lớn', price: 50000, quantity: 2 },
      { name: 'Trần Văn Hùng', ticketType: 'Vé Học sinh - Sinh viên', price: 20000, quantity: 3 },
      { name: 'Lê Hoàng Nam', ticketType: 'Vé Gia đình (Ưu đãi)', price: 120000, quantity: 1 },
      { name: 'Phạm Quỳnh Anh', ticketType: 'Vé Người lớn', price: 50000, quantity: 1 },
    ];
    const item = demoCustomers[Math.floor(Math.random() * demoCustomers.length)];
    const res = await bookTicket({
      name: item.name,
      phone: '0987123456',
      email: 'khachhang@gmail.com',
      ticketType: item.ticketType,
      price: item.price,
      quantity: item.quantity,
      visitDate: new Date().toISOString().split('T')[0],
      paymentMethod: 'counter',
      paymentOption: 'COUNTER',
    });
    if (res && res.order) {
      addToast(`Đã tạo đơn quầy mẫu: ${res.order.orderCode}`, 'success');
      setSearchInput(res.order.orderCode);
      handleLookup(res.order.orderCode);
    }
  };

  // Làm mới nhật ký ca trực
  const handleClearShiftLogs = () => {
    if (window.confirm('Bạn có chắc chắn muốn làm mới nhật ký ca trực hiện tại?')) {
      setRecentLogs([]);
      try {
        localStorage.removeItem('staff_counter_recent_logs');
      } catch (e) {
        console.error(e);
      }
      addToast('Đã làm mới danh sách ca trực hiện tại.', 'info');
    }
  };

  const handleResetSearch = () => {
    setSearchInput('');
    setScannedResult(null);
    setScanError(null);
  };

  const handleCopyCode = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    addToast('Đã sao chép mã đơn vào bộ nhớ tạm!', 'success');
    setTimeout(() => setCopiedCode(false), 2000);
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <div className="bg-amber-50 border-2 border-amber-200 rounded-3xl p-8 space-y-4 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-amber-600 mx-auto" />
          <h2 className="text-xl font-extrabold text-museum-brown">Yêu Cầu Đăng Nhập Tài Khoản Nhân Viên</h2>
          <p className="text-xs text-gray-600">
            Khu vực soát vé và thu tiền quầy dành riêng cho nhân viên và ban quản lý bảo tàng.
          </p>
          <button
            onClick={() => navigate('/login?redirect=/staff/checkin')}
            className="w-full py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
          >
            Đăng nhập ngay &rarr;
          </button>
        </div>
      </div>
    );
  }

  if (!isStaffOrAdmin) {
    return (
      <div className="container mx-auto px-4 py-16 text-center max-w-md">
        <div className="bg-red-50 border-2 border-red-200 rounded-3xl p-8 space-y-4 shadow-sm">
          <ShieldAlert className="w-12 h-12 text-red-600 mx-auto" />
          <h2 className="text-xl font-extrabold text-red-800">Không Có Quyền Truy Cập (403)</h2>
          <p className="text-xs text-gray-600">
            Tài khoản hiện tại <strong>({currentUser?.email})</strong> có vai trò <strong>"{currentUser?.role}"</strong>. Chỉ nhân viên (`staff`) hoặc quản trị viên (`admin`) mới được phép truy cập trang soát vé.
          </p>
          <button
            onClick={() => navigate('/')}
            className="w-full py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
          >
            Quay lại trang chủ &rarr;
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6 font-sans">
      {/* 1. Header Banner & Shift KPIs */}
      <div className="bg-gradient-to-r from-[#2C180E] via-[#3E2314] to-[#251309] text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-amber-900/40 relative overflow-hidden">
        {/* Background Decorative Pattern */}
        <div className="absolute right-0 top-0 bottom-0 w-80 opacity-5 pointer-events-none flex items-center justify-center">
          <QrCode className="w-96 h-96 text-white" />
        </div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          {/* Left Title Info */}
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 bg-[#B8860B]/20 text-[#E6C678] px-3.5 py-1 rounded-full text-xs font-bold border border-[#B8860B]/40 shadow-xs">
              <Building2 className="w-3.5 h-3.5" />
              <span>TRẠM SOÁT VÉ VÀ THU TIỀN TẠI QUẦY • BẢO TÀNG LỊCH SỬ</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[#F7E7C4] leading-tight">
              Cổng Đối Soát Vé & Xác Nhận Thu Tiền
            </h1>
            <p className="text-xs sm:text-[13px] text-stone-300 max-w-2xl leading-relaxed">
              Hệ thống quét mã QR tự động xác thực chữ ký số, hỗ trợ thu tiền vé tại quầy (tiền mặt/POS) và kích hoạt lượt vào cổng tức thì cho du khách.
            </p>
          </div>

          {/* Right Staff Info Card & Shift Status */}
          <div className="flex items-center gap-4 bg-white/10 backdrop-blur-md px-4 py-3.5 rounded-2xl border border-white/15 shrink-0 self-start lg:self-center shadow-xs">
            <div className="w-11 h-11 rounded-full bg-[#B8860B]/30 border border-[#E6C678]/40 flex items-center justify-center text-[#F7E7C4] shrink-0 font-bold text-sm">
              {currentUser?.name ? currentUser.name.charAt(0).toUpperCase() : 'NV'}
            </div>
            <div>
              <div className="text-[10px] text-stone-300 font-semibold uppercase tracking-wider">
                Nhân viên ca trực
              </div>
              <div className="text-sm font-extrabold text-[#F7E7C4] leading-tight mt-0.5">
                {currentUser?.name || 'Nhân viên quầy vé'}
              </div>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-[10px] bg-emerald-500/25 text-emerald-300 px-2 py-0.5 rounded-md font-bold uppercase border border-emerald-400/30">
                  {currentUser?.role || 'staff'}
                </span>
                <span className="text-[11px] text-stone-400 font-mono">
                  {new Date().toLocaleDateString('vi-VN')}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Shift Stat Pills (KPIs Bar) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 pt-6 mt-6 border-t border-white/10 relative z-10">
          <div className="bg-white/5 hover:bg-white/10 transition-colors p-3.5 rounded-2xl border border-white/10 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0 border border-amber-400/30">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-stone-300 font-medium">Doanh thu thu trong ca</div>
              <div className="text-lg font-black text-[#F7E7C4]">
                {formatCurrency(shiftStats.totalCollected)}
              </div>
            </div>
          </div>

          <div className="bg-white/5 hover:bg-white/10 transition-colors p-3.5 rounded-2xl border border-white/10 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-emerald-400/20 text-emerald-300 flex items-center justify-center shrink-0 border border-emerald-400/30">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-stone-300 font-medium">Khách đã vào cổng</div>
              <div className="text-lg font-black text-[#F7E7C4]">
                {shiftStats.totalVisitors} lượt khách <span className="text-xs font-normal text-stone-400">({shiftStats.totalOrders} đơn)</span>
              </div>
            </div>
          </div>

          <div className="bg-white/5 hover:bg-white/10 transition-colors p-3.5 rounded-2xl border border-white/10 flex items-center gap-3.5">
            <div className="w-10 h-10 rounded-xl bg-sky-400/20 text-sky-300 flex items-center justify-center shrink-0 border border-sky-400/30">
              <Ticket className="w-5 h-5" />
            </div>
            <div>
              <div className="text-[11px] text-stone-300 font-medium">Đơn chờ soát tại quầy</div>
              <div className="text-lg font-black text-[#F7E7C4]">
                {pendingOrders.length} đơn chờ xử lý
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Main Workstation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left Column: Search & Queue (5 Cols) */}
        <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
          <div className="bg-white rounded-3xl p-5 sm:p-6 border border-stone-200/90 shadow-xs space-y-5 flex-1 flex flex-col justify-between">
            {/* Box 1: Scanner & Input Form */}
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b pb-3 border-stone-100">
                <h2 className="text-sm font-extrabold text-[#3E2712] flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100/80 text-[#B8860B] flex items-center justify-center">
                    <ScanLine className="w-4 h-4" />
                  </div>
                  <span>1. Quét Mã QR Hoặc Nhập Mã Vé</span>
                </h2>
                <span className="text-[10px] text-stone-400 font-semibold bg-stone-100 px-2 py-0.5 rounded-md">
                  Tự động nhận dạng
                </span>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleLookup();
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-bold text-stone-600 mb-1.5">
                    Mã đơn hàng / Mã vé QR (Payload JSON):
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={searchInput}
                      onChange={(e) => setSearchInput(e.target.value)}
                      placeholder="VD: MTQ-20261028-XXX hoặc TK-2026-001..."
                      className="w-full pl-10 pr-10 py-3 bg-[#FAF8F5] border border-stone-200 focus:border-[#B8860B] rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20 font-mono text-xs font-bold text-[#3E2712] placeholder-stone-400 shadow-2xs transition-all"
                    />
                    <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3.5" />
                    {searchInput && (
                      <button
                        type="button"
                        onClick={() => setSearchInput('')}
                        className="w-5 h-5 rounded-full bg-stone-200 text-stone-500 hover:bg-stone-300 absolute right-3 top-3.5 flex items-center justify-center text-xs cursor-pointer"
                        title="Xóa trắng"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="flex-1 py-3 bg-[#3E2712] hover:bg-[#2A1A0C] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all cursor-pointer flex items-center justify-center gap-2 hover:shadow-md active:scale-[0.99]"
                  >
                    <Search className="w-4 h-4 text-[#E6C678]" />
                    <span>Tra cứu vé (Phím Enter)</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleResetSearch}
                    className="px-3 py-3 bg-stone-100 hover:bg-stone-200 text-stone-600 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    title="Đặt lại trạng thái tra cứu"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </form>
            </div>

            {/* Box 2: Pending Orders List with Filter Tabs */}
            <div className="pt-4 border-t border-stone-100 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#3E2712] flex items-center gap-1.5">
                  <Ticket className="w-4 h-4 text-[#B8860B]" />
                  <span>2. Đơn vé chờ xử lý tại quầy</span>
                </span>
                <button
                  type="button"
                  onClick={handleCreateDemoCounterOrder}
                  className="text-[11px] font-bold text-[#8B6508] bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-lg border border-amber-200 transition-colors flex items-center gap-1 cursor-pointer shadow-2xs hover:scale-105 active:scale-95"
                  title="Tạo nhanh 1 đơn vé quầy mẫu để kiểm tra tính năng soát vé"
                >
                  <Plus className="w-3 h-3" />
                  <span>Thêm đơn test</span>
                </button>
              </div>

              {/* Tabs Filter */}
              <div className="flex items-center gap-1 bg-[#F5EFE6] p-1 rounded-xl text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPendingTab('all')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    pendingTab === 'all'
                      ? 'bg-white text-[#3E2712] shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Tất cả ({pendingOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPendingTab('counter')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    pendingTab === 'counter'
                      ? 'bg-white text-amber-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Chờ thu tiền ({counterPendingOrders.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPendingTab('online')}
                  className={`flex-1 py-1.5 px-2 rounded-lg text-center transition-all cursor-pointer ${
                    pendingTab === 'online'
                      ? 'bg-white text-blue-900 shadow-xs'
                      : 'text-stone-500 hover:text-stone-800'
                  }`}
                >
                  Vé online ({onlinePendingOrders.length})
                </button>
              </div>

              {/* Order Cards List */}
              <div className="space-y-2 max-h-[340px] overflow-y-auto pr-1">
                {filteredPendingOrders.length === 0 ? (
                  <div className="p-6 bg-[#FAF8F5] rounded-2xl text-center space-y-2 border border-dashed border-stone-200">
                    <p className="text-xs text-stone-500 italic">
                      Không có đơn vé nào trong mục này.
                    </p>
                    <button
                      type="button"
                      onClick={handleCreateDemoCounterOrder}
                      className="px-3.5 py-1.5 bg-[#B8860B] hover:bg-[#8B6508] text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer inline-flex items-center gap-1.5"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tạo 1 đơn quầy mẫu để thử nghiệm</span>
                    </button>
                  </div>
                ) : (
                  filteredPendingOrders.map((b) => {
                    const isCounter =
                      b.paymentMethod === 'counter' ||
                      b.payment_method === 'counter' ||
                      b.paymentMethod === 'Tại quầy' ||
                      b.status === 'Chờ thanh toán tại quầy';
                    const code = b.orderCode || b.order_code || b.ticketCode || b.id;
                    const isSelected =
                      scannedResult &&
                      (scannedResult.orderCode === code ||
                        scannedResult.ticketCode === code ||
                        scannedResult.id === code);

                    return (
                      <div
                        key={b.id || code}
                        role="button"
                        tabIndex={0}
                        onClick={() => {
                          setSearchInput(code);
                          handleLookup(code);
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSearchInput(code);
                            handleLookup(code);
                          }
                        }}
                        className={`w-full p-3 rounded-2xl border text-left transition-all cursor-pointer flex items-center justify-between text-xs group ${
                          isSelected
                            ? 'bg-amber-50/90 border-[#B8860B] ring-2 ring-[#B8860B]/30 shadow-xs'
                            : 'bg-white hover:bg-[#FAF8F5] border-stone-200/80 hover:border-amber-300'
                        }`}
                      >
                        <div className="space-y-0.5 min-w-0 pr-2">
                          <div className="flex items-center gap-2">
                            <strong className="font-mono font-bold text-[#3E2712] truncate block">
                              {code}
                            </strong>
                            {isSelected && (
                              <span className="text-[9px] bg-[#B8860B] text-white font-bold px-1.5 py-0.2 rounded shrink-0">
                                Đang chọn
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] text-stone-500 block truncate">
                            {b.name} • <strong>{b.quantity} vé</strong> • <span className="font-semibold text-[#8B6508]">{formatCurrency(b.totalPrice)}</span>
                          </span>
                        </div>
                        <span
                          className={`text-[10px] font-bold px-2.5 py-1 rounded-full shrink-0 border ${
                            isCounter
                              ? 'bg-amber-100 text-amber-900 border-amber-200'
                              : 'bg-sky-50 text-sky-800 border-sky-200'
                          }`}
                        >
                          {isCounter ? '⏳ Chờ thu tiền' : '🎫 Đã thanh toán'}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Ticket Detail Inspection & Action (7 Cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          {scanError && (
            <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-6 text-red-800 space-y-3 shadow-sm animate-shake mb-4">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">CẢNH BÁO KHI SOÁT VÉ</h3>
                  <p className="text-xs text-red-700 mt-0.5">{scanError}</p>
                </div>
              </div>
            </div>
          )}

          {!scannedResult && !scanError && (
            <div className="bg-white rounded-3xl p-8 sm:p-12 border border-stone-200/90 shadow-xs flex-1 flex flex-col items-center justify-center text-center space-y-5 min-h-[500px]">
              {/* Animated Scanner Mockup */}
              <div className="relative w-36 h-36 rounded-3xl bg-[#FAF8F5] border-2 border-dashed border-[#B8860B]/40 flex items-center justify-center p-4 shadow-inner">
                <QrCode className="w-20 h-20 text-[#B8860B]/70" />
                {/* Scanner Target Corners */}
                <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-[#B8860B]" />
                <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-[#B8860B]" />
                <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-[#B8860B]" />
                <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-[#B8860B]" />
                {/* Laser line animation */}
                <div className="absolute left-3 right-3 top-1/2 -translate-y-1/2 h-0.5 bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] animate-pulse" />
              </div>

              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-base font-extrabold text-[#3E2712]">
                  Sẵn Sàng Quét Mã QR & Soát Vé
                </h3>
                <p className="text-xs text-stone-500 leading-relaxed">
                  Nhập mã đơn, quét mã QR từ vé của du khách hoặc <strong>bấm vào một đơn vé chờ bên trái</strong> để kiểm tra chi tiết.
                </p>
              </div>

              {/* Quick Feature Badges */}
              <div className="flex flex-wrap items-center justify-center gap-2 pt-2 text-[11px] font-semibold text-stone-600">
                <span className="px-3 py-1 bg-stone-100 rounded-full flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Xác thực chữ ký số QR
                </span>
                <span className="px-3 py-1 bg-stone-100 rounded-full flex items-center gap-1.5">
                  <Receipt className="w-3.5 h-3.5 text-[#B8860B]" />
                  Ghi sổ thu tiền tự động
                </span>
                <span className="px-3 py-1 bg-stone-100 rounded-full flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600" />
                  Cập nhật ca trực theo thời gian thực
                </span>
              </div>
            </div>
          )}

          {scannedResult && (
            <div className="bg-white rounded-3xl border border-stone-200/90 shadow-sm flex-1 flex flex-col justify-between overflow-hidden min-h-[500px]">
              {/* Boarding Pass Style Header */}
              <div className="bg-[#FAF6EF] p-5 sm:p-6 border-b border-[#E8DDCC] relative">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] font-bold text-[#8A7D6B] uppercase tracking-wider block">
                      Vé điện tử bảo tàng lịch sử
                    </span>
                    <div className="flex items-center gap-2 mt-0.5">
                      <h3 className="text-xl sm:text-2xl font-black text-[#3E2712] font-mono tracking-wide">
                        {scannedResult.orderCode || scannedResult.order_code || scannedResult.ticketCode}
                      </h3>
                      <button
                        type="button"
                        onClick={() => handleCopyCode(scannedResult.orderCode || scannedResult.ticketCode)}
                        className="p-1 hover:bg-stone-200/60 rounded-md text-stone-500 hover:text-[#3E2712] transition-colors cursor-pointer"
                        title="Sao chép mã vé"
                      >
                        {copiedCode ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5">
                    <span
                      className={`px-3.5 py-1 rounded-full text-xs font-black uppercase tracking-wider border shadow-2xs ${
                        scannedResult.checkin_status === 'checked_in' || scannedResult.checkinStatus === 'checked_in'
                          ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                          : scannedResult.paymentStatus === 'paid' || scannedResult.payment_status === 'paid'
                          ? 'bg-blue-100 text-blue-900 border-blue-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      {scannedResult.checkin_status === 'checked_in' || scannedResult.checkinStatus === 'checked_in'
                        ? '✓ ĐÃ CHECK-IN'
                        : scannedResult.paymentStatus === 'paid' || scannedResult.payment_status === 'paid'
                        ? '✓ ĐÃ THANH TOÁN (ONLINE)'
                        : '⏳ CHỜ THU TIỀN (TẠI QUẦY)'}
                    </span>
                    <span className="text-[11px] text-stone-500 font-medium">
                      Ngày đặt: {scannedResult.createdAt || 'Hôm nay'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Perforated Divider with Notch Circles */}
              <div className="relative h-4 bg-white flex items-center justify-between px-3">
                <div className="w-4 h-4 rounded-full bg-[#FAF6EF] -ml-5 border-r border-[#E8DDCC]" />
                <div className="flex-1 border-b-2 border-dashed border-stone-200 mx-2" />
                <div className="w-4 h-4 rounded-full bg-[#FAF6EF] -mr-5 border-l border-[#E8DDCC]" />
              </div>

              {/* Body Content */}
              <div className="p-5 sm:p-6 space-y-5 flex-1 flex flex-col justify-between">
                {/* 4-Box Key Metrics */}
                <div className="grid grid-cols-2 gap-3.5">
                  <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-stone-200/80">
                    <span className="text-[11px] text-stone-500 font-medium block mb-0.5">
                      Loại vé tham quan
                    </span>
                    <strong className="text-[#3E2712] text-sm font-bold block truncate">
                      {scannedResult.ticketType}
                    </strong>
                  </div>

                  <div className="bg-[#FAF8F5] p-3.5 rounded-2xl border border-stone-200/80">
                    <span className="text-[11px] text-stone-500 font-medium block mb-0.5">
                      Số lượng người tham quan
                    </span>
                    <strong className="text-[#3E2712] text-sm font-bold block">
                      {scannedResult.quantity} khách
                    </strong>
                  </div>

                  <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200/80">
                    <span className="text-[11px] text-amber-800 font-medium block mb-0.5">
                      Tổng tiền vé
                    </span>
                    <strong className="text-[#8B6508] text-base sm:text-lg font-black block">
                      {formatCurrency(scannedResult.totalPrice)}
                    </strong>
                  </div>

                  <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200/80">
                    <span className="text-[11px] text-emerald-800 font-medium block mb-0.5">
                      Ngày tham quan dự kiến
                    </span>
                    <strong className="text-emerald-900 text-xs sm:text-sm font-bold block truncate">
                      📅 {scannedResult.visitDate || scannedResult.visit_date || 'Hôm nay'}
                    </strong>
                  </div>
                </div>

                {/* Customer Contact Details */}
                <div className="bg-stone-50/80 p-4 rounded-2xl border border-stone-200/70 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-[#3E2712] text-xs uppercase tracking-wider flex items-center gap-1.5">
                      <User className="w-3.5 h-3.5 text-[#B8860B]" />
                      <span>Thông tin du khách đăng ký</span>
                    </h4>
                    <span className="text-[10px] text-stone-400">ID: {scannedResult.id}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-stone-700">
                    <div>
                      <span className="text-stone-400 block text-[10px]">Họ tên du khách:</span>
                      <strong className="text-[#3E2712]">{scannedResult.name}</strong>
                    </div>
                    <div>
                      <span className="text-stone-400 block text-[10px]">Số điện thoại:</span>
                      <strong>{scannedResult.phone || 'Chưa cung cấp'}</strong>
                    </div>
                    <div className="truncate">
                      <span className="text-stone-400 block text-[10px]">Email xác nhận:</span>
                      <strong className="truncate block">{scannedResult.email || 'Tại quầy'}</strong>
                    </div>
                  </div>
                </div>

                {/* Bottom Action Section */}
                {scannedResult.checkin_status === 'checked_in' || scannedResult.checkinStatus === 'checked_in' ? (
                  <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl space-y-1">
                    <div className="flex items-center gap-2.5">
                      <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                      <div>
                        <strong className="font-extrabold text-sm block">
                          ĐƠN VÉ NÀY ĐÃ CHECK-IN VÀO CỔNG THÀNH CÔNG!
                        </strong>
                        <span className="text-xs text-emerald-800">
                          Xác nhận bởi nhân viên <strong>{scannedResult.checked_in_by || scannedResult.checkedInBy || 'Hệ thống'}</strong> vào lúc {scannedResult.checkin_at || scannedResult.checkinAt || 'hôm nay'}.
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 pt-2">
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={handleConfirmCheckin}
                      className="w-full py-4 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 text-white font-black text-sm rounded-2xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide hover:shadow-lg active:scale-[0.99]"
                    >
                      {isProcessing ? (
                        <>
                          <Clock className="w-5 h-5 animate-spin text-white" />
                          <span>Đang đối soát & ghi nhận ca trực...</span>
                        </>
                      ) : scannedResult.paymentStatus === 'paid' || scannedResult.payment_status === 'paid' ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                          <span>Xác Nhận Quét Mã QR & Cho Khách Vào Cổng</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                          <span>Xác Nhận Đã Thu Tiền ({formatCurrency(scannedResult.totalPrice)}) & Check-in</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-stone-500 text-center">
                      {scannedResult.paymentStatus === 'paid' || scannedResult.payment_status === 'paid'
                        ? '* Đơn này đã thanh toán trực tuyến. Bấm nút trên để xác nhận du khách hợp lệ vào cổng.'
                        : '* Bấm nút trên sau khi đã nhận tiền mặt hoặc quẹt thẻ POS từ khách hàng tại quầy vé.'}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Audit Log Table */}
      <div className="bg-white rounded-3xl p-6 sm:p-7 border border-stone-200/90 shadow-xs space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-stone-100">
          <div>
            <h3 className="font-extrabold text-[#3E2712] text-base flex items-center gap-2">
              <History className="w-5 h-5 text-[#B8860B]" />
              <span>LỊCH SỬ THU TIỀN VÀ SOÁT VÉ TẠI QUẦY TRONG CA</span>
            </h3>
            <p className="text-xs text-stone-500 mt-0.5">
              Ghi nhận đầy đủ các giao dịch thu tiền mặt/POS và lượt quét vé vào cổng của ca trực hiện tại.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <input
                type="text"
                value={logSearchQuery}
                onChange={(e) => setLogSearchQuery(e.target.value)}
                placeholder="Tìm mã đơn, tên khách..."
                className="pl-8 pr-3 py-1.5 bg-[#FAF8F5] border border-stone-200 rounded-xl text-xs text-[#3E2712] focus:outline-none focus:ring-1 focus:ring-[#B8860B] w-48"
              />
              <Search className="w-3.5 h-3.5 text-stone-400 absolute left-2.5 top-2" />
            </div>

            <span className="text-xs font-bold text-stone-600 bg-stone-100 px-3 py-1.5 rounded-xl">
              Tổng cộng: <strong className="text-[#8B6508]">{combinedLogs.length}</strong> đơn
            </span>

            {recentLogs.length > 0 && (
              <button
                type="button"
                onClick={handleClearShiftLogs}
                className="text-xs text-stone-400 hover:text-red-600 font-semibold underline transition-colors cursor-pointer"
                title="Bấm để xóa sạch dữ liệu nhật ký khi bàn giao ca trực mới"
              >
                Làm mới ca
              </button>
            )}
          </div>
        </div>

        {searchedLogs.length === 0 ? (
          <div className="py-12 text-center text-xs text-stone-400 space-y-2">
            <Receipt className="w-10 h-10 text-stone-300 mx-auto" />
            <p className="font-semibold text-stone-500">
              Chưa có lượt thu tiền / check-in nào trong ca trực hiện tại.
            </p>
            <p className="text-[11px] text-stone-400 max-w-sm mx-auto">
              👉 Hãy nhấn vào một đơn vé ở danh sách bên trái hoặc nhập mã vé, sau đó nhấn <strong>"Xác nhận & Check-in"</strong>.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#FAF8F5] text-[#3E2712] font-bold border-b border-stone-200">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Mã đơn vé</th>
                  <th className="py-3 px-4">Du khách</th>
                  <th className="py-3 px-4">Loại vé / SL</th>
                  <th className="py-3 px-4">Số tiền thu</th>
                  <th className="py-3 px-4">Hình thức</th>
                  <th className="py-3 px-4">Nhân viên</th>
                  <th className="py-3 px-4 text-center">Trạng thái</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {searchedLogs.map((log) => (
                  <tr key={log.id || log.orderCode} className="hover:bg-amber-50/40 transition-colors">
                    <td className="py-3 px-4 font-mono text-stone-500">{log.time}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#3E2712]">{log.orderCode}</td>
                    <td className="py-3 px-4">
                      <strong className="text-stone-800 block">{log.name}</strong>
                      {log.phone && <span className="text-[10px] text-stone-400">{log.phone}</span>}
                    </td>
                    <td className="py-3 px-4 text-stone-600 font-medium">
                      {log.ticketType} <span className="font-bold text-[#3E2712]">({log.quantity} vé)</span>
                    </td>
                    <td className="py-3 px-4 font-black text-[#8B6508]">
                      {formatCurrency(log.totalPrice)}
                    </td>
                    <td className="py-3 px-4">
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-stone-100 text-stone-700">
                        {String(log.paymentMethod).includes('counter') || String(log.paymentMethod).includes('Tại quầy')
                          ? 'Tại quầy (POS/Tiền mặt)'
                          : 'Online (Chuyển khoản)'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-600 font-medium">{log.staffName}</td>
                    <td className="py-3 px-4 text-center">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        Đã check-in
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
