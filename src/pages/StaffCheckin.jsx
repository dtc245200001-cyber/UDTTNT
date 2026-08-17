import React, { useState } from 'react';
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
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { parseQRPayload } from '@/services/qrSecurityService';

export const StaffCheckin = () => {
  const { currentUser, isAuthenticated, bookedTickets, confirmStaffCounterCheckin, addToast } = useApp();
  const navigate = useNavigate();

  const [searchInput, setSearchInput] = useState('');
  const [scannedResult, setScannedResult] = useState(null);
  const [scanError, setScanError] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recentLogs, setRecentLogs] = useState([]);

  const isStaffOrAdmin = currentUser && (currentUser.role === 'staff' || currentUser.role === 'admin');

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
      setRecentLogs((prev) => [
        {
          id: `LOG-${Date.now()}`,
          orderCode: res.order.orderCode || res.order.ticketCode,
          name: res.order.name,
          ticketType: res.order.ticketType,
          quantity: res.order.quantity,
          totalPrice: res.order.totalPrice,
          time: new Date().toLocaleTimeString('vi-VN'),
          staffName: currentUser?.name || 'Nhân viên quầy vé',
        },
        ...prev,
      ]);
    } else {
      setScanError(res.error);
    }
  };

  const handleResetSearch = () => {
    setSearchInput('');
    setScannedResult(null);
    setScanError(null);
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
    <div className="container mx-auto px-4 py-8 max-w-5xl space-y-8 font-sans">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-museum-brown via-museum-brown-dk to-amber-950 text-white rounded-3xl p-6 shadow-xl border border-museum-gold/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 bg-museum-gold/20 text-museum-gold px-3 py-1 rounded-full text-xs font-bold border border-museum-gold/30">
            <Building2 className="w-4 h-4" />
            <span>KHU VỰC SOÁT VÉ & THU TIỀN TẠI QUẦY (STAFF ONLY)</span>
          </div>
          <h1 className="text-2xl font-black tracking-wide text-museum-gold">
            CỔNG XÁC NHẬN VÉ QR & THU TIỀN TẠI QUẦY
          </h1>
          <p className="text-xs text-museum-cream/80 max-w-xl">
            Quét mã QR hoặc nhập mã đơn đặt vé để kiểm tra tính hợp lệ, xác nhận thu tiền mặt/POS và tự động kích hoạt check-in lượt tham quan.
          </p>
        </div>

        <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-2xl border border-white/20 text-xs text-right shrink-0">
          <span className="text-gray-300 block text-[10px]">Nhân viên ca trực:</span>
          <strong className="text-museum-gold text-sm font-bold block">{currentUser?.name}</strong>
          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-md font-bold uppercase inline-block mt-1">
            Role: {currentUser?.role}
          </span>
        </div>
      </div>

      {/* Main Grid: Left Scan Box & Right Order Details */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Left Column: Search & Quick Action */}
        <div className="md:col-span-5 space-y-5">
          <div className="bg-white rounded-3xl p-5 border border-museum-gold/30 shadow-md space-y-4">
            <h2 className="text-sm font-extrabold text-museum-brown flex items-center gap-2 border-b pb-3 border-gray-100">
              <QrCode className="w-5 h-5 text-museum-gold" />
              <span>QUÉT MÃ QR HOẶC NHẬP MÃ ĐƠN</span>
            </h2>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleLookup();
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Mã đơn hàng / Mã QR (Payload JSON)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchInput}
                    onChange={(e) => setSearchInput(e.target.value)}
                    placeholder="VD: MTQ-20260817-A1B2C3 hoặc dán payload QR..."
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-2xl focus:outline-none focus:ring-2 focus:ring-museum-gold font-mono text-xs font-bold text-museum-brown"
                  />
                  <Search className="w-4 h-4 text-gray-400 absolute left-3.5 top-3.5" />
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 py-3 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <Search className="w-4 h-4 text-museum-gold" />
                  <span>Tra cứu & Kiểm tra vé</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetSearch}
                  className="px-3 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  title="Làm mới tìm kiếm"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </form>

            {/* Quick Filter / Recent Demo Orders */}
            <div className="pt-3 border-t border-gray-100 space-y-2">
              <span className="text-[11px] font-bold text-gray-500 block uppercase">
                ⚡ Đơn vé đặt tại quầy chờ xử lý trong hệ thống:
              </span>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {bookedTickets.filter(b => b.paymentMethod === 'counter' || b.payment_method === 'counter' || b.status === 'Chờ thanh toán tại quầy').length === 0 ? (
                  <p className="text-xs text-gray-400 italic">Không có đơn quầy nào chờ xử lý.</p>
                ) : (
                  bookedTickets
                    .filter(b => b.paymentMethod === 'counter' || b.payment_method === 'counter' || b.status === 'Chờ thanh toán tại quầy')
                    .slice(0, 5)
                    .map((b) => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => {
                          setSearchInput(b.orderCode || b.order_code || b.ticketCode);
                          handleLookup(b.orderCode || b.order_code || b.ticketCode);
                        }}
                        className="w-full p-2.5 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between text-xs group"
                      >
                        <div>
                          <strong className="font-mono font-bold text-museum-brown block">
                            {b.orderCode || b.order_code || b.ticketCode}
                          </strong>
                          <span className="text-[10px] text-gray-600">
                            {b.name} ({b.quantity} vé - {formatCurrency(b.totalPrice)})
                          </span>
                        </div>
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                          b.checkin_status === 'checked_in' || b.checkinStatus === 'checked_in'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-200 text-amber-900'
                        }`}>
                          {b.checkin_status === 'checked_in' || b.checkinStatus === 'checked_in' ? 'Đã check-in' : 'Chờ thu tiền'}
                        </span>
                      </button>
                    ))
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Order Details & Staff Action Box */}
        <div className="md:col-span-7">
          {scanError && (
            <div className="bg-red-50 border-2 border-red-300 rounded-3xl p-6 text-red-800 space-y-3 shadow-md animate-shake">
              <div className="flex items-center gap-3">
                <AlertTriangle className="w-8 h-8 text-red-600 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-base">CẢNH BÁO KHI SOÁT VÉ</h3>
                  <p className="text-xs text-red-700 mt-0.5">{scanError}</p>
                </div>
              </div>
            </div>
          )}

          {!scannedResult && !scanError && (
            <div className="bg-white rounded-3xl p-10 border-2 border-dashed border-gray-200 text-center space-y-3">
              <QrCode className="w-16 h-16 text-gray-300 mx-auto animate-pulse" />
              <h3 className="text-base font-bold text-gray-500">Sẵn Sàng Quét Mã QR Soát Vé</h3>
              <p className="text-xs text-gray-400 max-w-sm mx-auto">
                Nhập mã đơn hàng hoặc quét mã QR từ điện thoại du khách để kiểm tra thông tin đơn vé.
              </p>
            </div>
          )}

          {scannedResult && (
            <div className="bg-white rounded-3xl p-6 border-2 border-museum-gold/40 shadow-xl space-y-5">
              {/* Order Status Header */}
              <div className="flex items-center justify-between border-b pb-4 border-gray-100">
                <div>
                  <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider block">
                    Mã đơn hàng
                  </span>
                  <h3 className="text-xl font-black text-museum-brown font-mono tracking-wide">
                    {scannedResult.orderCode || scannedResult.order_code || scannedResult.ticketCode}
                  </h3>
                </div>

                <div className="flex flex-col items-end gap-1">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                      scannedResult.checkin_status === 'checked_in' || scannedResult.checkinStatus === 'checked_in'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                        : scannedResult.paymentStatus === 'paid' || scannedResult.payment_status === 'paid'
                        ? 'bg-blue-100 text-blue-800 border border-blue-300'
                        : 'bg-amber-100 text-amber-800 border border-amber-300'
                    }`}
                  >
                    {scannedResult.checkin_status === 'checked_in' || scannedResult.checkinStatus === 'checked_in'
                      ? '✓ ĐÃ CHECK-IN'
                      : scannedResult.paymentStatus === 'paid' || scannedResult.payment_status === 'paid'
                      ? '✓ ĐÃ THANH TOÁN'
                      : '⏳ CHƯA THANH TOÁN (TẠI QUẦY)'}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium">
                    Ngày đặt: {scannedResult.createdAt}
                  </span>
                </div>
              </div>

              {/* Order Details Grid */}
              <div className="grid grid-cols-2 gap-4 bg-museum-ivory p-4 rounded-2xl border border-museum-gold/30 text-xs">
                <div>
                  <span className="text-gray-500 font-bold block mb-0.5">Loại vé tham quan</span>
                  <strong className="text-museum-brown text-sm font-extrabold block">
                    {scannedResult.ticketType}
                  </strong>
                </div>

                <div>
                  <span className="text-gray-500 font-bold block mb-0.5">Số lượng vé</span>
                  <strong className="text-gray-900 text-sm font-bold block">
                    {scannedResult.quantity} vé
                  </strong>
                </div>

                <div>
                  <span className="text-gray-500 font-bold block mb-0.5">Tổng tiền cần thu tại quầy</span>
                  <strong className="text-museum-gold text-base font-black block">
                    {formatCurrency(scannedResult.totalPrice)}
                  </strong>
                </div>

                <div>
                  <span className="text-gray-500 font-bold block mb-0.5">Ngày tham quan dự kiến</span>
                  <strong className="text-emerald-700 text-xs font-bold block">
                    📅 {scannedResult.visitDate || scannedResult.visit_date}
                  </strong>
                </div>
              </div>

              {/* Visitor Contact Info */}
              <div className="bg-gray-50 p-4 rounded-2xl border border-gray-200 text-xs space-y-2">
                <h4 className="font-extrabold text-museum-brown text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <User className="w-4 h-4 text-museum-gold" />
                  <span>Thông tin khách hàng nhận vé</span>
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 font-medium text-gray-700">
                  <div>
                    <span className="text-gray-400 block text-[10px]">Họ tên:</span>
                    <strong>{scannedResult.name}</strong>
                  </div>
                  <div>
                    <span className="text-gray-400 block text-[10px]">Số điện thoại:</span>
                    <strong>{scannedResult.phone}</strong>
                  </div>
                  <div className="truncate">
                    <span className="text-gray-400 block text-[10px]">Email:</span>
                    <strong>{scannedResult.email}</strong>
                  </div>
                </div>
              </div>

              {/* Action Area for Staff */}
              {scannedResult.checkin_status === 'checked_in' || scannedResult.checkinStatus === 'checked_in' ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-300 text-emerald-900 rounded-2xl space-y-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0" />
                    <div>
                      <strong className="font-extrabold text-sm block">ĐƠN VÉ NÀY ĐÃ CHECK-IN THÀNH CÔNG!</strong>
                      <span className="text-xs text-emerald-800">
                        Xác nhận bởi nhân viên <strong>{scannedResult.checked_in_by || scannedResult.checkedInBy || 'Hệ thống'}</strong> vào lúc {scannedResult.checkin_at || scannedResult.checkinAt || 'hôm nay'}.
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 pt-2">
                  <button
                    type="button"
                    disabled={isProcessing}
                    onClick={handleConfirmCheckin}
                    className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-sm rounded-2xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 uppercase tracking-wide hover:shadow-xl"
                  >
                    {isProcessing ? (
                      <>
                        <Clock className="w-5 h-5 animate-spin text-white" />
                        <span>Đang xử lý thu tiền & check-in...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="w-5 h-5 text-emerald-200" />
                        <span>Xác Nhận Đã Thu Tiền ({formatCurrency(scannedResult.totalPrice)}) & Check-in</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-gray-500 text-center">
                    * Nhấn nút trên sau khi đã nhận tiền mặt hoặc quẹt thẻ POS từ khách hàng tại quầy.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Audit Log Table: History of Today's Counter Check-ins */}
      <div className="bg-white rounded-3xl p-6 border border-museum-gold/30 shadow-md space-y-4">
        <div className="flex items-center justify-between border-b pb-3 border-gray-100">
          <h3 className="font-extrabold text-museum-brown text-sm flex items-center gap-2">
            <History className="w-5 h-5 text-museum-gold" />
            <span>LỊCH SỬ THU TIỀN VÀ SOÁT VÉ TẠI QUẦY TRONG CA</span>
          </h3>
          <span className="text-xs font-bold text-gray-500">
            Tổng cộng: <strong className="text-museum-gold">{recentLogs.length}</strong> đơn vừa check-in
          </span>
        </div>

        {recentLogs.length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">
            Chưa có lượt thu tiền / check-in nào trong ca trực hiện tại.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-museum-ivory text-museum-brown font-bold border-b border-museum-gold/20">
                  <th className="py-3 px-4">Thời gian</th>
                  <th className="py-3 px-4">Mã đơn</th>
                  <th className="py-3 px-4">Khách hàng</th>
                  <th className="py-3 px-4">Loại vé / SL</th>
                  <th className="py-3 px-4">Số tiền thu</th>
                  <th className="py-3 px-4">Nhân viên</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {recentLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="py-3 px-4 font-mono text-gray-500">{log.time}</td>
                    <td className="py-3 px-4 font-mono font-bold text-museum-brown">{log.orderCode}</td>
                    <td className="py-3 px-4 font-bold text-gray-800">{log.name}</td>
                    <td className="py-3 px-4 text-gray-600">{log.ticketType} ({log.quantity} vé)</td>
                    <td className="py-3 px-4 font-black text-museum-gold">{formatCurrency(log.totalPrice)}</td>
                    <td className="py-3 px-4 text-gray-500 font-medium">{log.staffName}</td>
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
