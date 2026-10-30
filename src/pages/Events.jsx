import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useApp } from '@/context/AppContext';
import {
  CalendarDays,
  MapPin,
  Users,
  Plus,
  CheckCircle2,
  Clock,
  Sparkles,
  Search,
  ArrowRight,
  Pencil,
  Trash2,
  AlertCircle,
} from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { ConfirmModal } from '@/components/ui/ConfirmModal';
import { EventRegistrationModal } from '@/components/events/EventRegistrationModal';
import { ImageUploadField } from '@/components/common/ImageUploadField';
import { formatDate } from '@/utils/formatters';
import { Breadcrumb } from '@/components/common/Breadcrumb';

const EMPTY_EVENT_FORM = {
  title: '',
  date: new Date().toISOString().split('T')[0],
  time: '09:00 - 11:30',
  location: 'Hội trường 1 - Bảo tàng Việt Nam',
  speaker: '',
  status: 'Sắp diễn ra',
  seats: 100,
  description: '',
  image: '',
};

export const Events = () => {
  const navigate = useNavigate();
  const {
    events = [],
    addEvent,
    updateEvent,
    deleteEvent,
    cancelEventRegistration,
    eventRegistrations = [],
    isAuthenticated,
    currentUser,
  } = useApp();

  const isAdmin = currentUser?.role === 'admin';

  // Visitor States
  const [pendingAuthEvent, setPendingAuthEvent] = useState(null);
  const [activeRegisterEvent, setActiveRegisterEvent] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAllEvents, setShowAllEvents] = useState(false);

  // Admin Modals State
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [formData, setFormData] = useState(EMPTY_EVENT_FORM);
  const [formErrors, setFormErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Admin Delete State
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Admin Attendee Modal State
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState(null);
  const [attendeeSearchQuery, setAttendeeSearchQuery] = useState('');

  const currentEventAttendees = useMemo(() => {
    if (!selectedEventForAttendees) return [];
    return (eventRegistrations || []).filter((r) => r.eventId === selectedEventForAttendees.id);
  }, [eventRegistrations, selectedEventForAttendees]);

  const filteredAttendees = useMemo(() => {
    if (!attendeeSearchQuery.trim()) return currentEventAttendees;
    const q = attendeeSearchQuery.trim().toLowerCase();
    return currentEventAttendees.filter(
      (a) =>
        (a.name && a.name.toLowerCase().includes(q)) ||
        (a.phone && a.phone.includes(q)) ||
        (a.email && a.email.toLowerCase().includes(q))
    );
  }, [currentEventAttendees, attendeeSearchQuery]);

  // Restore pending event registration after login
  useEffect(() => {
    if (isAuthenticated) {
      const pendingReg = localStorage.getItem('pending_event_registration');
      if (pendingReg) {
        try {
          const { eventId } = JSON.parse(pendingReg);
          localStorage.removeItem('pending_event_registration');
          const targetEv = events.find((e) => e.id === eventId);
          if (targetEv) setActiveRegisterEvent(targetEv);
        } catch (err) {
          console.error('Failed to parse pending event registration', err);
        }
      }
    }
  }, [isAuthenticated, events]);

  const handleEventRegistration = (ev) => {
    setActiveRegisterEvent(ev);
  };

  const getEventImage = (id) => {
    if (id === 'EV001') return '/images/events/dong-son-drum.jpg';
    if (id === 'EV002') return '/images/events/chu-dau-ceramic.jpg';
    if (id === 'EV003') return '/images/events/thang-long-night.jpg';
    return '/images/events/hero-events.jpg'; 
  };

  const statusStyle = (s) => {
    if (s === 'Đang diễn ra') return { dot: 'bg-emerald-500 animate-pulse', text: 'text-emerald-700' };
    if (s === 'Sắp diễn ra') return { dot: 'bg-amber-400', text: 'text-amber-700' };
    return { dot: 'bg-gray-400', text: 'text-gray-600' };
  };

  const filteredEvents = events.filter(e => {
    if (!searchQuery.trim()) return true;
    
    const searchLower = searchQuery.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const searchableText = `${e.title} ${e.description} ${e.speaker || ''} ${e.location} ${formatDate(e.date)}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    return searchableText.includes(searchLower);
  });

  const displayedEvents = (!searchQuery.trim() && events.length > 3 && !showAllEvents) 
    ? [...filteredEvents].sort((a,b) => new Date(a.date) - new Date(b.date)).slice(0, 3) 
    : filteredEvents;

  // Admin Event Form Handlers
  const handleOpenCreate = () => {
    setEditingEvent(null);
    setFormData({
      ...EMPTY_EVENT_FORM,
      date: new Date().toISOString().split('T')[0],
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const handleOpenEdit = (ev, e) => {
    if (e) e.stopPropagation();
    setEditingEvent(ev);
    setFormData({
      title: ev.title || '',
      date: ev.date || new Date().toISOString().split('T')[0],
      time: ev.time || '09:00 - 11:30',
      location: ev.location || 'Hội trường 1 - Bảo tàng Việt Nam',
      speaker: ev.speaker || '',
      status: ev.status || 'Sắp diễn ra',
      seats: ev.seats !== undefined ? ev.seats : 100,
      description: ev.description || '',
      image: ev.image || '',
    });
    setFormErrors({});
    setIsFormOpen(true);
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title.trim()) {
      errors.title = 'Vui lòng nhập tiêu đề sự kiện.';
    }
    if (!formData.image || !formData.image.trim()) {
      errors.image = 'Vui lòng chọn hình ảnh sự kiện từ máy tính (bắt buộc).';
    }

    const seatsNum = Number(formData.seats);
    if (isNaN(seatsNum) || seatsNum < 0) {
      errors.seats = 'Số chỗ ngồi phải là số nguyên không âm.';
    } else if (editingEvent && seatsNum < Number(editingEvent.registered || 0)) {
      errors.seats = `Số chỗ không thể nhỏ hơn số người đã đăng ký (${editingEvent.registered} người).`;
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm() || isSubmitting) return;

    setIsSubmitting(true);
    try {
      if (editingEvent) {
        const ok = await updateEvent(editingEvent.id, formData);
        if (ok) {
          setIsFormOpen(false);
          setEditingEvent(null);
        }
      } else {
        const created = await addEvent(formData);
        if (created) {
          setIsFormOpen(false);
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  // Delete Handler (Async-safe: returns ok for ConfirmModal)
  const handleConfirmDelete = async () => {
    if (!deleteTarget || isDeleting) return false;
    setIsDeleting(true);
    try {
      const ok = await deleteEvent(deleteTarget.id);
      if (ok) {
        setDeleteTarget(null);
      }
      return ok;
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#faf6ef] font-sans pb-16 relative">
      {/* Decorative lotus left & right */}
      <div className="pointer-events-none absolute bottom-0 left-0 w-64 h-96 bg-[url('/images/lotus-left.svg')] bg-no-repeat bg-bottom bg-contain opacity-10" />
      <div className="pointer-events-none absolute bottom-0 right-0 w-64 h-96 bg-[url('/images/lotus-right.svg')] bg-no-repeat bg-bottom bg-contain opacity-10" />

      {/* ── Hero Banner: Chiều cao chuẩn linh hoạt, nền màu nâu di sản ── */}
      <div className="relative overflow-hidden min-h-[260px] md:h-[280px] bg-[#3a2213] flex flex-col justify-center py-6 select-none">
        
        {/* Full pre-designed background image with gradient overlay */}
        <div className="absolute inset-0" style={{
          background: `linear-gradient(90deg, #3a2213 0%, #3a2213 35%, rgba(58,34,19,0.85) 50%, rgba(58,34,19,0) 80%), url('/images/events/hero-events.jpg') right center / cover no-repeat`
        }} />

        {/* Lotus overlay in banner */}
        <div className="absolute inset-0 pointer-events-none opacity-20 bg-[url('/images/lotus-left.svg')] bg-no-repeat" style={{ backgroundPosition: '-50px bottom', backgroundSize: '400px' }} />

        {/* Content Container */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 h-full flex flex-col justify-center">
          <div className="max-w-2xl relative z-10">
            {/* Breadcrumb: TRANG CHỦ / SỰ KIỆN */}
            <div className="relative z-10">
              <Breadcrumb
                items={[
                  { label: 'TRANG CHỦ', path: '/' },
                  { label: 'SỰ KIỆN' },
                ]}
                variant="dark"
              />
            </div>

            {/* Title: Serif bold, large, white */}
            <h1 
              className="typo-page-title text-white tracking-wide leading-tight uppercase relative z-10"
              style={{ textShadow: '0 2px 12px rgba(0,0,0,.45)' }}
            >
              SỰ KIỆN & TỌA ĐÀM VĂN HÓA
            </h1>

            {/* Description */}
            <p className="typo-body text-[#FAF8F5]/85 mt-2 mb-4 line-clamp-2 max-w-xl relative z-10">
              Các sự kiện văn hóa, tọa đàm và triển lãm đặc biệt của Bảo tàng.
            </p>

            {/* Embedded Search Box (Standardized h-11) */}
            <div className="relative w-full max-w-xl">
              <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-stone-400" />
              </div>
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm kiếm sự kiện, chủ đề, thời gian..." 
                className="w-full h-11 pl-11 pr-20 bg-white rounded-full border border-stone-200/80 shadow-md text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#8B5A1E]/30 text-gray-800 placeholder:text-stone-400"
              />
              <div className="absolute inset-y-0 right-1.5 flex items-center gap-1">
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery('')}
                    className="w-6 h-6 flex items-center justify-center text-stone-400 hover:text-stone-700 text-xs font-bold cursor-pointer transition-colors"
                    title="Xóa tìm kiếm"
                  >
                    ✕
                  </button>
                )}
                <button
                  type="button"
                  className="w-8 h-8 btn-primary rounded-full flex items-center justify-center transition-colors shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A1E]/40"
                  title="Tìm kiếm"
                >
                  <Search className="h-3.5 w-3.5 text-white" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 mt-10 space-y-6 relative z-10">
        
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-[28px] bg-[#c8952e] rounded-full" />
            <h2 className="text-2xl font-bold text-[#3a2213] uppercase">
              SỰ KIỆN NỔI BẬT
            </h2>
          </div>
          <div className="flex items-center gap-2.5 self-start sm:self-auto">
            {isAdmin && (
              <button
                type="button"
                onClick={handleOpenCreate}
                className="inline-flex items-center gap-1.5 px-4 h-9 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-full shadow-md transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Thêm sự kiện</span>
              </button>
            )}
            <button 
              onClick={() => setShowAllEvents(!showAllEvents)}
              className="group inline-flex items-center gap-1.5 px-4 h-9 typo-btn text-xs sm:text-[13px] rounded-full bg-white border border-stone-200/80 shadow-2xs text-[#3a2213] hover:text-[#8B5A1E] hover:bg-stone-50 transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8B5A1E]/40"
            >
              <span>{showAllEvents ? 'Thu gọn' : 'Xem tất cả'}</span>
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
            </button>
          </div>
        </div>

        {/* Events Grid */}
        {displayedEvents.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-3xl border border-stone-100 shadow-sm">
            <Search className="w-12 h-12 text-stone-300 mx-auto mb-3" />
            <p className="text-stone-400 font-medium">Không tìm thấy sự kiện phù hợp.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {displayedEvents.map((ev) => {
              const isUserRegistered =
                (eventRegistrations || []).some(
                  (r) =>
                    r.eventId === ev.id &&
                    ((currentUser?.email && r.email?.toLowerCase() === currentUser?.email?.toLowerCase()) ||
                      (currentUser?.phone && r.phone === currentUser?.phone))
                ) || currentUser?.registeredEvents?.includes(ev.id);
              const ss = statusStyle(ev.status);
              const pct = ev.seats ? Math.round((ev.registered / ev.seats) * 100) : 0;
              const imageUrl = getEventImage(ev.id) || ev.image;

              return (
                <div key={ev.id} className="group bg-white rounded-2xl overflow-hidden border border-stone-200/80 shadow-xs hover:shadow-lg hover:-translate-y-1 transition-all duration-300 flex flex-col">
                  
                  {/* Image Container */}
                  <div className="relative aspect-[16/9] w-full overflow-hidden bg-museum-cream">
                    {imageUrl ? (
                      <img src={imageUrl} alt={ev.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-[#8B5A1E] to-[#B8860B] flex items-center justify-center">
                        <CalendarDays className="w-10 h-10 text-white/30" />
                      </div>
                    )}
                    
                    {/* Status Badge */}
                    <div className="absolute top-3 left-3 z-10">
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/95 backdrop-blur-xs rounded-full text-xs font-bold text-museum-brown shadow-sm">
                        <span className={`w-2 h-2 rounded-full ${ss.dot}`} />
                        {ev.status}
                      </span>
                    </div>

                    {/* Admin Action Controls (Chỉ Admin) */}
                    {isAdmin && (
                      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 bg-white/95 backdrop-blur-xs p-1 rounded-xl shadow-sm">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedEventForAttendees(ev);
                          }}
                          className="p-1.5 text-[#B8860B] hover:text-museum-brown hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                          title="Xem danh sách khách đăng ký tham dự"
                        >
                          <Users className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => handleOpenEdit(ev, e)}
                          className="p-1.5 text-stone-600 hover:text-museum-brown hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
                          title="Chỉnh sửa sự kiện"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(ev);
                          }}
                          className="p-1.5 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa sự kiện"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="p-5 flex flex-col flex-1 justify-between gap-4">
                    {/* Title + Desc */}
                    <div>
                      <h3 className="typo-card-title text-[#3a2213] group-hover:text-[#8B5A1E] transition-colors min-h-[2.7em] mb-1.5">{ev.title}</h3>
                      <p className="typo-body text-xs text-stone-500 leading-relaxed line-clamp-2">{ev.description}</p>
                    </div>

                    {/* Info */}
                    <div className="space-y-2 text-xs text-stone-600 mt-auto">
                      <div className="flex items-center gap-2.5">
                        <CalendarDays className="w-3.5 h-3.5 text-[#c8952e] shrink-0" />
                        <span className="font-medium">{formatDate(ev.date)} {ev.time && `— ${ev.time}`}</span>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <MapPin className="w-3.5 h-3.5 text-[#c8952e] shrink-0" />
                        <span className="truncate">{ev.location}</span>
                      </div>
                      {ev.speaker && (
                        <div className="flex items-center gap-2.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#c8952e] shrink-0" />
                          <span className="font-bold text-[#3a2213] truncate">Diễn giả: {ev.speaker}</span>
                        </div>
                      )}
                    </div>

                    {/* Capacity */}
                    {ev.seats > 0 && (
                      <div className="space-y-1.5 pt-2 border-t border-stone-100">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-stone-500 font-medium">
                            <Users className="w-3.5 h-3.5 text-emerald-600" />Đăng ký
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#3a2213]">{ev.registered}/{ev.seats}</span>
                            {isAdmin && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedEventForAttendees(ev);
                                }}
                                className="text-[11px] text-[#B8860B] hover:underline font-semibold cursor-pointer"
                              >
                                (Xem DS)
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
                          <div className={`h-full rounded-full transition-all ${pct >= 100 ? 'bg-red-500' : 'bg-[#c8952e]'}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                        </div>
                      </div>
                    )}

                    {/* CTA Button */}
                    <button
                      onClick={() => handleEventRegistration(ev)}
                      disabled={isUserRegistered}
                      className={`w-full h-11 rounded-full typo-btn transition-all flex items-center justify-center gap-2 mt-1 ${
                        isUserRegistered
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 cursor-default'
                          : 'btn-primary shadow-xs hover:shadow-md cursor-pointer group/btn'
                      }`}
                    >
                      {isUserRegistered ? (
                        <><CheckCircle2 className="w-4 h-4 text-emerald-600" /><span>Đã đăng ký tham dự</span></>
                      ) : (
                        <>
                          <span>Đăng ký tham dự miễn phí</span>
                          <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Auth Modal ── */}
      <Modal isOpen={!!pendingAuthEvent} onClose={() => setPendingAuthEvent(null)} title="🔐 Yêu cầu đăng nhập" maxWidth="max-w-md">
        <div className="space-y-4 text-center py-2">
          <div className="w-12 h-12 rounded-2xl bg-museum-cream text-museum-brown flex items-center justify-center mx-auto text-xl shadow-xs">🔐</div>
          <p className="text-xs sm:text-sm text-gray-700 font-medium leading-relaxed">Vui lòng đăng nhập để đăng ký tham dự sự kiện.</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => {
                if (pendingAuthEvent) localStorage.setItem('pending_event_registration', JSON.stringify({ eventId: pendingAuthEvent.id, eventTitle: pendingAuthEvent.title }));
                setPendingAuthEvent(null);
                navigate('/login');
              }}
              className="px-5 py-2.5 bg-museum-brown hover:bg-museum-brown-dk text-white font-bold text-xs rounded-xl shadow-md transition-colors cursor-pointer"
            >
              Đăng nhập
            </button>
            <button onClick={() => setPendingAuthEvent(null)} className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer">Để sau</button>
          </div>
        </div>
      </Modal>

      {/* ── Event Registration Modal ── */}
      <EventRegistrationModal event={activeRegisterEvent} isOpen={!!activeRegisterEvent} onClose={() => setActiveRegisterEvent(null)} />

      {/* ── Admin Create / Edit Event Modal ── */}
      <Modal
        isOpen={isFormOpen}
        onClose={() => {
          if (!isSubmitting) setIsFormOpen(false);
        }}
        title={editingEvent ? 'Chỉnh sửa sự kiện' : 'Thêm sự kiện mới'}
        maxWidth="max-w-2xl"
      >
        <form onSubmit={handleSubmit} className="space-y-4 pt-1">
          {/* Tiêu đề sự kiện */}
          <div>
            <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
              Tiêu đề sự kiện <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => {
                setFormData({ ...formData, title: e.target.value });
                if (formErrors.title) setFormErrors({ ...formErrors, title: null });
              }}
              placeholder="Ví dụ: Tọa đàm chuyên sâu về Trống đồng Đông Sơn..."
              className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-[#3E2712] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all ${
                formErrors.title ? 'border-rose-400 ring-rose-200' : 'border-stone-200/80'
              }`}
            />
            {formErrors.title && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {formErrors.title}
              </p>
            )}
          </div>

          {/* Ngày diễn ra & Khung giờ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
                Ngày diễn ra <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
                Thời gian / Khung giờ
              </label>
              <input
                type="text"
                value={formData.time}
                onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                placeholder="Ví dụ: 09:00 - 11:30"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all"
              />
            </div>
          </div>

          {/* Địa điểm & Diễn giả */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
                Địa điểm tổ chức
              </label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                placeholder="Ví dụ: Hội trường 1 - Bảo tàng Việt Nam"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
                Diễn giả / Đơn vị tổ chức
              </label>
              <input
                type="text"
                value={formData.speaker}
                onChange={(e) => setFormData({ ...formData, speaker: e.target.value })}
                placeholder="Ví dụ: GS.TS Nguyễn Văn A"
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all"
              />
            </div>
          </div>

          {/* Trạng thái & Số chỗ */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
                Trạng thái sự kiện
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all cursor-pointer"
              >
                <option value="Sắp diễn ra">Sắp diễn ra</option>
                <option value="Đang diễn ra">Đang diễn ra</option>
                <option value="Đã kết thúc">Đã kết thúc</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
                Số chỗ ngồi (Seats)
              </label>
              <input
                type="number"
                min="0"
                value={formData.seats}
                onChange={(e) => {
                  setFormData({ ...formData, seats: e.target.value });
                  if (formErrors.seats) setFormErrors({ ...formErrors, seats: null });
                }}
                className={`w-full px-3.5 py-2.5 bg-white border rounded-xl text-sm text-[#3E2712] focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all ${
                  formErrors.seats ? 'border-rose-400 ring-rose-200' : 'border-stone-200/80'
                }`}
              />
              {formErrors.seats && (
                <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {formErrors.seats}
                </p>
              )}
            </div>
          </div>

          {/* Chọn ảnh sự kiện từ máy tính (BẮT BUỘC) */}
          <div>
            <ImageUploadField
              value={formData.image}
              onChange={(val) => {
                setFormData((prev) => ({ ...prev, image: val }));
                if (formErrors.image) setFormErrors((prev) => ({ ...prev, image: null }));
              }}
              error={formErrors.image}
              label="Hình ảnh sự kiện"
              required={true}
              description="Ảnh này sẽ hiển thị làm banner đại diện cho sự kiện trên toàn hệ thống."
            />
          </div>

          {/* Mô tả sự kiện */}
          <div>
            <label className="block text-xs font-bold text-[#5B3A1F] mb-1">
              Mô tả chi tiết sự kiện
            </label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Nhập nội dung giới thiệu về sự kiện, chương trình tọa đàm..."
              className="w-full px-3.5 py-2.5 bg-white border border-stone-200/80 rounded-xl text-sm text-[#3E2712] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#B8860B] transition-all resize-y"
            />
          </div>

          {/* Note khi edit: bảo lưu registered và id */}
          {editingEvent && (
            <div className="p-3 bg-[#FAF6EF] rounded-xl border border-stone-200/80 text-xs text-[#8A7D6B] flex items-center justify-between">
              <div>
                Mã sự kiện: <span className="font-mono font-bold text-[#3E2712]">{editingEvent.id}</span>
              </div>
              <div>
                Đã đăng ký:{' '}
                <span className="font-bold text-emerald-700">
                  {editingEvent.registered || 0} người
                </span>{' '}
                <span className="text-[#8A7D6B]">(được bảo lưu nguyên vẹn)</span>
              </div>
            </div>
          )}

          {/* Actions Footer */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-stone-200/60">
            <button
              type="button"
              onClick={() => setIsFormOpen(false)}
              disabled={isSubmitting}
              className="btn-secondary px-5 py-2.5 rounded-full text-xs cursor-pointer disabled:opacity-50"
            >
              Hủy bỏ
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary px-5 py-2.5 rounded-full text-xs shadow-xs cursor-pointer disabled:opacity-60 inline-flex items-center gap-1.5"
            >
              {isSubmitting
                ? 'Đang lưu...'
                : editingEvent
                ? 'Lưu thay đổi'
                : 'Lưu sự kiện'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ── Admin Delete ConfirmModal ── */}
      <ConfirmModal
        isOpen={!!deleteTarget}
        onClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
        onConfirm={handleConfirmDelete}
        itemName={deleteTarget?.title || ''}
        description={
          deleteTarget?.registered > 0
            ? `CẢNH BÁO NGUY HIỂM: Sự kiện này hiện có ${deleteTarget.registered} lượt đăng ký. Khi xóa sự kiện, toàn bộ dữ liệu đăng ký liên quan trong hệ thống sẽ bị xóa theo (Cascade). Hành động này không thể hoàn tác.`
            : 'Bạn có chắc chắn muốn xóa sự kiện này? Hành động này không thể hoàn tác.'
        }
      />

      {/* ── Modal Danh Sách Khách Đăng Ký Tham Dự (Admin) ── */}
      {selectedEventForAttendees && (
        <Modal
          isOpen={!!selectedEventForAttendees}
          onClose={() => {
            setSelectedEventForAttendees(null);
            setAttendeeSearchQuery('');
          }}
          title="👥 DANH SÁCH KHÁCH ĐĂNG KÝ THAM DỰ SỰ KIỆN"
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 font-sans text-xs">
            {/* Header info */}
            <div className="p-3.5 bg-museum-cream/60 rounded-xl border border-museum-gold/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <span className="text-[10px] font-bold text-museum-gold uppercase tracking-wider block">Sự kiện</span>
                <h4 className="font-extrabold text-sm sm:text-base text-museum-brown">{selectedEventForAttendees.title}</h4>
                <div className="flex flex-wrap items-center gap-3 text-stone-500 text-[11px] mt-1">
                  <span>📅 {formatDate(selectedEventForAttendees.date)}</span>
                  <span>⏰ {selectedEventForAttendees.time}</span>
                  <span>📍 {selectedEventForAttendees.location}</span>
                </div>
              </div>
              <div className="text-left sm:text-right sm:border-l sm:pl-4 border-stone-200">
                <span className="text-[11px] text-stone-500">Đã đăng ký</span>
                <div className="text-base font-extrabold text-[#3a2213]">
                  {selectedEventForAttendees.registered} / {selectedEventForAttendees.seats || 'Không giới hạn'}
                </div>
              </div>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Tìm kiếm theo họ tên, SĐT hoặc email người đăng ký..."
                value={attendeeSearchQuery}
                onChange={(e) => setAttendeeSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-museum-gold"
              />
            </div>

            {/* Attendees Table */}
            <div className="overflow-x-auto border border-stone-200 rounded-xl max-h-[360px] overflow-y-auto">
              {filteredAttendees.length === 0 ? (
                <div className="text-center py-8 text-stone-400">
                  <Users className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p>Chưa có lượt đăng ký nào cho sự kiện này.</p>
                </div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-stone-50 sticky top-0 border-b border-stone-200 text-stone-600 font-bold">
                    <tr>
                      <th className="p-2.5 text-center w-12">#</th>
                      <th className="p-2.5">Họ và tên</th>
                      <th className="p-2.5">Số điện thoại</th>
                      <th className="p-2.5">Email</th>
                      <th className="p-2.5">Ngày đăng ký</th>
                      <th className="p-2.5 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {filteredAttendees.map((att, idx) => (
                      <tr key={att.id || idx} className="hover:bg-amber-50/40 transition-colors">
                        <td className="p-2.5 text-center text-stone-400 font-mono">{idx + 1}</td>
                        <td className="p-2.5 font-bold text-museum-brown">{att.name}</td>
                        <td className="p-2.5 font-mono text-stone-600">{att.phone}</td>
                        <td className="p-2.5 text-stone-600">{att.email}</td>
                        <td className="p-2.5 text-stone-500 text-[11px]">{att.createdAt || att.visitDate}</td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => {
                              if (window.confirm(`Xác nhận hủy đăng ký của khách hàng "${att.name}"?`)) {
                                cancelEventRegistration(att.id);
                              }
                            }}
                            className="p-1 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded transition-colors cursor-pointer"
                            title="Hủy đăng ký này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            {/* Footer close */}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => {
                  setSelectedEventForAttendees(null);
                  setAttendeeSearchQuery('');
                }}
                className="px-5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 font-bold rounded-xl transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
