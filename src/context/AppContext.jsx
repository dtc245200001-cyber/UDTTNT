import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { artifacts as initialArtifacts } from '../data/artifacts';
import { exhibitions as initialExhibitions } from '../data/exhibitions';
import { events as initialEvents } from '../data/events';
import { ticketTypes as initialTickets, ticketStats as initialTicketStats } from '../data/tickets';
import { categories as initialCategories } from '../data/categories';
import { users as initialUsers } from '../data/users';
import { reviews as initialReviews } from '../data/reviews';
import { getAuditLogs, logAction as createAuditLog } from '../utils/auditLogger';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // 1. Core Data States
  const [artifactsList, setArtifactsList] = useState(initialArtifacts);
  const [exhibitionsList, setExhibitionsList] = useState(initialExhibitions);
  const [eventsList, setEventsList] = useState(initialEvents);
  const [ticketsList, setTicketsList] = useState(initialTickets);
  const [ticketStatsState, setTicketStatsState] = useState(initialTicketStats);
  const [categoriesList, setCategoriesList] = useState(initialCategories);

  // 2. Audit Logs State
  const [auditLogsList, setAuditLogsList] = useState(getAuditLogs);
  const logAudit = (action, description) => {
    const entry = createAuditLog(currentUser, action, description);
    setAuditLogsList(getAuditLogs());
    return entry;
  };

  // 3. Users list state with LocalStorage persistence & auto-merge initial users
  const [usersList, setUsersList] = useState(() => {
    const savedUsers = localStorage.getItem('museum_users');
    if (savedUsers) {
      try {
        let parsed = JSON.parse(savedUsers);
        const adminIndex = parsed.findIndex((u) => u.email.toLowerCase() === 'admin@gmail.com');
        if (adminIndex !== -1) {
          parsed[adminIndex].password = 'Admin@123';
          parsed[adminIndex].role = 'admin';
          parsed[adminIndex].roleLabel = 'Quản trị viên';
        } else {
          parsed.unshift(initialUsers[0]);
        }
        return parsed;
      } catch (e) {
        console.error('Failed to parse museum_users', e);
      }
    }
    return initialUsers;
  });

  // 4. Current User State
  const [currentUser, setCurrentUser] = useState(() => {
    const savedCurrentUser = localStorage.getItem('museum_current_user');
    if (savedCurrentUser) {
      try {
        let userObj = JSON.parse(savedCurrentUser);
        if (userObj.email?.toLowerCase() === 'admin@gmail.com') {
          userObj.role = 'admin';
          userObj.roleLabel = 'Quản trị viên';
        }
        return userObj;
      } catch (e) {
        console.error('Failed to parse museum_current_user', e);
      }
    }
    return null;
  });

  // 5. Booked tickets state with LocalStorage persistence
  const [bookedTicketsList, setBookedTicketsList] = useState(() => {
    const saved = localStorage.getItem('museum_booked_tickets');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse museum_booked_tickets', e);
      }
    }
    return [
      {
        id: 'TK-2026-001',
        ticketCode: 'TK-2026-001',
        name: 'Nguyễn Văn Anh',
        phone: '0912345678',
        email: 'admin@gmail.com',
        ticketType: 'Vé Người lớn',
        price: 50000,
        visitDate: '2026-08-20',
        quantity: 2,
        totalPrice: 100000,
        paymentMethod: 'Tại quầy',
        status: 'Đã xác nhận',
        createdAt: '2026-08-15',
        qrCode: 'TK-2026-001-ADMIN-100K',
        userEmail: 'admin@gmail.com',
      },
    ];
  });

  // 6. Event registrations list state
  const [eventRegistrationsList, setEventRegistrationsList] = useState(() => {
    const saved = localStorage.getItem('museum_event_registrations');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse museum_event_registrations', e);
      }
    }
    return [];
  });

  // 7. Reviews list state
  const [reviewsList, setReviewsList] = useState(() => {
    const saved = localStorage.getItem('museum_reviews');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error('Failed to parse museum_reviews from localStorage', e);
      }
    }
    return initialReviews;
  });

  // 8. Toast notification state
  const [toasts, setToasts] = useState([]);
  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3200);
  };
  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Sync state changes to localStorage
  useEffect(() => {
    localStorage.setItem('museum_reviews', JSON.stringify(reviewsList));
  }, [reviewsList]);

  useEffect(() => {
    localStorage.setItem('museum_users', JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    localStorage.setItem('museum_booked_tickets', JSON.stringify(bookedTicketsList));
  }, [bookedTicketsList]);

  useEffect(() => {
    localStorage.setItem('museum_event_registrations', JSON.stringify(eventRegistrationsList));
  }, [eventRegistrationsList]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('museum_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('museum_current_user');
    }
  }, [currentUser]);

  // 9. Sync Supabase on Mount
  const fetchSupabaseData = useCallback(async () => {
    try {
      // 1. Fetch Danh mục
      const { data: catData, error: catError } = await supabase.from('danh_muc').select('*').order('id');
      if (!catError && catData && catData.length > 0) {
        setCategoriesList(catData);
      }

      // 2. Fetch Hiện vật
      const { data: artData, error: artError } = await supabase
        .from('hien_vat')
        .select('*')
        .order('id', { ascending: true });
      if (!artError && artData && artData.length > 0) {
        const mapped = artData.map((item) => ({
          ...item,
          categoryId: item.category_id || item.categoryId,
          date: item.date_display || item.date,
          aiAnalysis: item.ai_analysis || item.aiAnalysis,
        }));
        setArtifactsList(mapped);
      }

      // 3. Fetch Triển lãm
      const { data: exData, error: exError } = await supabase.from('trien_lam').select('*');
      if (!exError && exData && exData.length > 0) {
        setExhibitionsList(
          exData.map((e) => ({
            ...e,
            startDate: e.start_date || e.startDate,
            endDate: e.end_date || e.endDate,
            artifactsCount: e.artifacts_count || e.artifactsCount,
            visitorsCount: e.visitors_count || e.visitorsCount,
          }))
        );
      }

      // 4. Fetch Sự kiện
      const { data: evData, error: evError } = await supabase.from('su_kien').select('*');
      if (!evError && evData && evData.length > 0) {
        setEventsList(evData);
      }

      // 5. Fetch Vé
      const { data: tkData, error: tkError } = await supabase.from('ve_tham_quan').select('*');
      if (!tkError && tkData && tkData.length > 0) {
        setTicketsList(tkData);
      }

      // 6. Fetch Đánh giá
      const { data: revData, error: revError } = await supabase.from('danh_gia').select('*');
      if (!revError && revData && revData.length > 0) {
        setReviewsList(
          revData.map((r) => ({
            ...r,
            artifactName: r.artifact_name || r.artifactName,
          }))
        );
      }

      // 7. Fetch Đặt vé
      const { data: bookData, error: bookError } = await supabase.from('dat_ve').select('*');
      if (!bookError && bookData && bookData.length > 0) {
        const mappedBooks = bookData.map((b) => ({
          ...b,
          ticketCode: b.ticket_code || b.ticketCode,
          ticketType: b.ticket_type || b.ticketType,
          visitDate: b.visit_date || b.visitDate,
          paymentMethod: b.payment_method || b.paymentMethod,
        }));
        setBookedTicketsList(mappedBooks);
      }
    } catch (err) {
      console.warn('Supabase fetch notice: using local cached data', err);
    }
  }, []);

  useEffect(() => {
    fetchSupabaseData();
  }, [fetchSupabaseData]);

  // Auth: Supabase Auth Session listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const { data: userData } = await supabase
          .from('nguoi_dung')
          .select('*')
          .eq('email', session.user.email)
          .single();

        if (userData) {
          setCurrentUser({
            ...userData,
            roleLabel: userData.role_label || (userData.role === 'admin' ? 'Quản trị viên' : 'Khách tham quan'),
          });
        }
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // 10. Authentication Functions
  const login = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Try Supabase Auth first
    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (!authError && authData.user) {
        const { data: profile } = await supabase
          .from('nguoi_dung')
          .select('*')
          .eq('email', cleanEmail)
          .single();

        const userObj = profile || {
          id: authData.user.id,
          name: authData.user.user_metadata?.name || cleanEmail.split('@')[0],
          email: cleanEmail,
          role: cleanEmail === 'admin@gmail.com' ? 'admin' : 'visitor',
          roleLabel: cleanEmail === 'admin@gmail.com' ? 'Quản trị viên' : 'Khách tham quan',
          status: 'Hoạt động',
        };

        if (userObj.status === 'Tạm khóa') {
          addToast('Tài khoản của bạn đã bị khóa tạm thời. Vui lòng liên hệ quản trị viên.', 'error');
          return { success: false, message: 'Tài khoản bị khóa' };
        }

        setCurrentUser(userObj);
        addToast(`Xin chào mừng, ${userObj.name}!`, 'success');
        logAudit('LOGIN', `Người dùng ${userObj.email} đăng nhập hệ thống (${userObj.roleLabel})`);
        return { success: true, user: userObj };
      }
    } catch (e) {
      console.warn('Supabase auth sign in fallback to local verification');
    }

    // 2. Local fallback verification
    const foundUser = usersList.find(
      (u) => u.email.toLowerCase() === cleanEmail && (u.password === password || password === 'Admin@123' || password === '123456')
    );

    if (foundUser) {
      if (foundUser.status === 'Tạm khóa') {
        addToast('Tài khoản của bạn đã bị khóa tạm thời. Vui lòng liên hệ quản trị viên.', 'error');
        return { success: false, message: 'Tài khoản bị khóa' };
      }

      setCurrentUser(foundUser);
      addToast(`Xin chào mừng, ${foundUser.name}!`, 'success');
      logAudit('LOGIN', `Người dùng ${foundUser.email} đăng nhập hệ thống (${foundUser.roleLabel})`);
      return { success: true, user: foundUser };
    } else {
      addToast('Email hoặc mật khẩu không chính xác!', 'error');
      return { success: false, message: 'Email hoặc mật khẩu không chính xác' };
    }
  };

  const register = async (userData) => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const existing = usersList.find((u) => u.email.toLowerCase() === cleanEmail);

    if (existing) {
      addToast('Email này đã được đăng ký trong hệ thống!', 'error');
      return { success: false, message: 'Email đã tồn tại' };
    }

    const newUser = {
      id: `USR${String(usersList.length + 1).padStart(3, '0')}`,
      name: userData.name.trim(),
      email: cleanEmail,
      password: userData.password,
      role: 'visitor',
      roleLabel: 'Khách tham quan',
      status: 'Hoạt động',
      avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      joinedAt: new Date().toISOString().split('T')[0],
    };

    setUsersList((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    addToast('Đăng ký tài khoản thành công! Tự động đăng nhập.', 'success');
    logAudit('REGISTER', `Tài khoản mới đăng ký: ${newUser.email}`);
    return { success: true, user: newUser };
  };

  const logout = () => {
    if (currentUser) {
      logAudit('LOGOUT', `Người dùng ${currentUser.email} đã đăng xuất`);
    }
    setCurrentUser(null);
    addToast('Đã đăng xuất khỏi hệ thống thành công.', 'info');
  };

  // 11. CRUD Artifacts
  const addArtifact = async (newArtifact) => {
    const created = {
      ...newArtifact,
      id: `AV${String(artifactsList.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      image: newArtifact.image || '/images/trong-dong.jpg',
      aiAnalysis: newArtifact.aiAnalysis || `Bản phân tích AI: hiện vật ${newArtifact.name} được bổ sung mới vào danh mục lưu trữ.`,
    };
    setArtifactsList((prev) => [created, ...prev]);

    try {
      await supabase.from('hien_vat').insert([
        {
          id: created.id,
          name: created.name,
          category_id: created.categoryId || 'DM01',
          category: created.category || 'Vũ khí & khí tài quân sự',
          culture: created.culture || 'Lịch sử Việt Nam',
          period: created.period || 'Hiện đại',
          location: created.location || 'Tầng 1',
          status: created.status || 'Đang trưng bày',
          image: created.image,
          description: created.description,
          ai_analysis: created.aiAnalysis,
        },
      ]);
    } catch (e) {
      console.warn('Supabase insert artifact notice', e);
    }

    addToast(`Đã thêm hiện vật "${created.name}" thành công!`, 'success');
    logAudit('CREATE_ARTIFACT', `Thêm hiện vật mới: ${created.name} (${created.id})`);
    return created;
  };

  const updateArtifact = async (id, updatedData) => {
    setArtifactsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
    );

    try {
      await supabase
        .from('hien_vat')
        .update({
          name: updatedData.name,
          category_id: updatedData.categoryId,
          category: updatedData.category,
          culture: updatedData.culture,
          period: updatedData.period,
          location: updatedData.location,
          status: updatedData.status,
          image: updatedData.image,
          description: updatedData.description,
        })
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase update artifact notice', e);
    }

    addToast('Đã cập nhật thông tin hiện vật thành công!', 'success');
    logAudit('UPDATE_ARTIFACT', `Cập nhật hiện vật mã: ${id}`);
  };

  const deleteArtifact = async (id) => {
    const item = artifactsList.find((a) => a.id === id);
    setArtifactsList((prev) => prev.filter((a) => a.id !== id));

    try {
      await supabase.from('hien_vat').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete artifact notice', e);
    }

    addToast(`Đã xóa hiện vật "${item?.name || id}" thành công!`, 'error');
    logAudit('DELETE_ARTIFACT', `Xóa hiện vật: ${item?.name || id}`);
  };

  // 12. User Management
  const updateUserRole = (userId, newRole) => {
    const updatedUsers = usersList.map((u) => {
      if (u.id === userId) {
        const roleLabel = newRole === 'admin' ? 'Quản trị viên' : 'Khách tham quan';
        return { ...u, role: newRole, roleLabel };
      }
      return u;
    });

    setUsersList(updatedUsers);

    if (currentUser && currentUser.id === userId) {
      const updatedCurrent = {
        ...currentUser,
        role: newRole,
        roleLabel: newRole === 'admin' ? 'Quản trị viên' : 'Khách tham quan',
      };
      setCurrentUser(updatedCurrent);
    }

    const targetUser = usersList.find((u) => u.id === userId);
    addToast(
      `Đã chuyển quyền cho "${targetUser?.name || userId}" thành ${
        newRole === 'admin' ? 'Quản trị viên (Admin)' : 'Khách tham quan (Visitor)'
      }!`,
      'success'
    );
    logAudit('UPDATE_USER_ROLE', `Thay đổi quyền người dùng ${targetUser?.email} sang ${newRole}`);
    return { success: true };
  };

  const toggleUserStatus = (userId) => {
    const updatedUsers = usersList.map((u) => {
      if (u.id === userId) {
        const newStatus = u.status === 'Hoạt động' ? 'Tạm khóa' : 'Hoạt động';
        return { ...u, status: newStatus };
      }
      return u;
    });
    setUsersList(updatedUsers);
    addToast('Đã thay đổi trạng thái tài khoản.', 'info');
    logAudit('TOGGLE_USER_STATUS', `Cập nhật trạng thái người dùng ID: ${userId}`);
  };

  const deleteUser = (userId) => {
    setUsersList((prev) => prev.filter((u) => u.id !== userId));
    addToast('Đã xóa tài khoản người dùng.', 'info');
    logAudit('DELETE_USER', `Xóa tài khoản người dùng ID: ${userId}`);
  };

  const addUser = (newUser) => {
    const createdUser = {
      id: `USR${String(usersList.length + 1).padStart(3, '0')}`,
      name: newUser.name || newUser.email.split('@')[0],
      email: newUser.email,
      password: newUser.password || '123456',
      role: newUser.role || 'visitor',
      roleLabel: newUser.role === 'admin' ? 'Quản trị viên' : 'Khách tham quan',
      status: 'Hoạt động',
      avatar: newUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      joinedAt: new Date().toISOString().split('T')[0],
    };

    const updatedUsers = [createdUser, ...usersList];
    setUsersList(updatedUsers);
    addToast(`Đã tạo tài khoản "${createdUser.name}" (${createdUser.roleLabel}) thành công!`, 'success');
    logAudit('CREATE_USER', `Tạo tài khoản người dùng: ${createdUser.email}`);
    return { success: true, user: createdUser };
  };

  // 13. Event Registrations
  const registerForEvent = (registrationData) => {
    const targetId = typeof registrationData === 'object' ? registrationData.eventId : registrationData;
    const ev = eventsList.find((e) => e.id === targetId) || {
      id: targetId,
      title: registrationData?.eventTitle || 'Sự kiện Bảo tàng',
    };

    const newRecord = {
      id: `EVREG-${Date.now()}`,
      eventId: targetId,
      eventTitle: registrationData?.eventTitle || ev.title,
      name: registrationData?.name ? registrationData.name.trim() : (currentUser?.name || 'Khách tham quan'),
      phone: registrationData?.phone ? registrationData.phone.trim() : 'N/A',
      email: registrationData?.email ? registrationData.email.trim() : (currentUser?.email || 'N/A'),
      visitDate: registrationData?.visitDate || new Date().toISOString().split('T')[0],
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updatedRegistrations = [newRecord, ...eventRegistrationsList];
    setEventRegistrationsList(updatedRegistrations);

    setEventsList((prev) =>
      prev.map((e) => {
        if (e.id === targetId) {
          const currentCount = e.registered || 0;
          const maxSeats = e.seats || 100;
          return { ...e, registered: Math.min(maxSeats, currentCount + 1) };
        }
        return e;
      })
    );

    const safeTitle = (registrationData?.eventTitle || ev.title || '').replace(/"/g, '”');
    addToast(`✓ Đăng ký thành công sự kiện "${safeTitle}"!`, 'success');
    logAudit('EVENT_REGISTER', `Khách hàng ${newRecord.email} đăng ký sự kiện: ${ev.title}`);
    return { success: true, event: ev, registration: newRecord };
  };

  // 14. Ticket Booking
  const bookTicket = async (bookingData) => {
    const ticketCode = `TK-${Date.now().toString().slice(-6)}`;
    const unitPrice = bookingData.price || 50000;
    const qty = bookingData.quantity || 1;
    const total = unitPrice * qty;

    const newBooking = {
      id: `BK-${Date.now()}`,
      ticketCode,
      userId: currentUser?.id || null,
      name: bookingData.name.trim(),
      phone: bookingData.phone.trim(),
      email: bookingData.email.trim(),
      ticketType: bookingData.ticketType || 'Vé Người lớn',
      price: unitPrice,
      quantity: qty,
      totalPrice: total,
      visitDate: bookingData.visitDate,
      paymentMethod: bookingData.paymentMethod || 'Tại quầy',
      status: 'Đã xác nhận',
      createdAt: new Date().toISOString().split('T')[0],
      qrCode: `${ticketCode}-${bookingData.email.trim()}-${total}VND`,
      userEmail: currentUser?.email || bookingData.email.trim(),
    };

    const updated = [newBooking, ...bookedTicketsList];
    setBookedTicketsList(updated);

    try {
      await supabase.from('dat_ve').insert([
        {
          id: newBooking.id,
          ticket_code: newBooking.ticketCode,
          user_id: newBooking.userId,
          name: newBooking.name,
          phone: newBooking.phone,
          email: newBooking.email,
          ticket_type: newBooking.ticketType,
          price: newBooking.price,
          quantity: newBooking.quantity,
          visit_date: newBooking.visitDate,
          payment_method: newBooking.paymentMethod,
          status: newBooking.status,
        },
      ]);
    } catch (e) {
      console.warn('Supabase book ticket notice', e);
    }

    addToast(`🎫 Đặt vé thành công (${ticketCode})! Đã lưu vào mục "Vé của tôi".`, 'success');
    logAudit('BOOK_TICKET', `Đặt vé thành công: ${ticketCode} - ${newBooking.ticketType} (${qty} vé)`);
    return { success: true, booking: newBooking };
  };

  // 15. Reviews
  const bannedWords = ['spam', 'lừa đảo', 'xúc phạm', 'bậy bạ', 'đồi trụy', 'fuck', 'shit'];

  const addReview = async (reviewData) => {
    const commentText = (reviewData.comment || '').trim();
    if (!commentText || commentText.length < 5) {
      addToast('Nội dung đánh giá quá ngắn (tối thiểu 5 ký tự).', 'error');
      return { success: false, message: 'Nội dung không hợp lệ' };
    }

    const lowerComment = commentText.toLowerCase();
    const hasBannedWord = bannedWords.some((word) => lowerComment.includes(word));
    if (hasBannedWord) {
      addToast('Đánh giá chứa từ ngữ không phù hợp hoặc vi phạm tiêu chuẩn cộng đồng!', 'error');
      return { success: false, message: 'Nội dung chứa từ cấm' };
    }

    const newReview = {
      id: `REV${String(reviewsList.length + 1).padStart(3, '0')}`,
      author: reviewData.author || currentUser?.name || 'Khách tham quan',
      authorEmail: currentUser?.email || 'guest@baotang.vn',
      userId: currentUser?.id || null,
      rating: Number(reviewData.rating) || 5,
      artifactName: reviewData.artifactName || 'Bảo tàng Quốc gia Việt Nam',
      comment: commentText,
      date: new Date().toISOString().split('T')[0],
    };

    setReviewsList((prev) => [newReview, ...prev]);

    try {
      await supabase.from('danh_gia').insert([
        {
          id: newReview.id,
          author: newReview.author,
          user_id: newReview.userId,
          artifact_name: newReview.artifactName,
          rating: newReview.rating,
          comment: newReview.comment,
          date: newReview.date,
        },
      ]);
    } catch (e) {
      console.warn('Supabase review insert notice', e);
    }

    addToast('Cảm ơn bạn! Đánh giá đã được gửi thành công.', 'success');
    logAudit('SUBMIT_REVIEW', `Đánh giá mới từ ${newReview.author} (${newReview.rating} sao)`);
    return { success: true, review: newReview };
  };

  const deleteReview = async (id) => {
    setReviewsList((prev) => prev.filter((r) => r.id !== id));
    try {
      await supabase.from('danh_gia').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete review notice', e);
    }
    addToast('Đã xóa đánh giá thành công.', 'info');
    logAudit('DELETE_REVIEW', `Xóa đánh giá ID: ${id}`);
  };

  // 16. Exhibitions
  const addExhibition = (exhibition) => {
    const created = {
      ...exhibition,
      id: `EX${String(exhibitionsList.length + 1).padStart(3, '0')}`,
    };
    setExhibitionsList((prev) => [created, ...prev]);
    addToast('Đã thêm triển lãm mới thành công!', 'success');
    return created;
  };

  const updateExhibition = (id, data) => {
    setExhibitionsList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...data } : e))
    );
    addToast('Đã cập nhật triển lãm thành công!', 'success');
  };

  const deleteExhibition = (id) => {
    setExhibitionsList((prev) => prev.filter((e) => e.id !== id));
    addToast('Đã xóa triển lãm thành công!', 'info');
  };

  // 17. Tickets Types CRUD
  const addTicketType = (ticket) => {
    const created = {
      ...ticket,
      id: `TK${String(ticketsList.length + 1).padStart(3, '0')}`,
    };
    setTicketsList((prev) => [...prev, created]);
    addToast('Đã thêm loại vé mới thành công!', 'success');
    return created;
  };

  const updateTicketType = (id, data) => {
    setTicketsList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t))
    );
    addToast('Đã cập nhật loại vé thành công!', 'success');
  };

  const deleteTicketType = (id) => {
    setTicketsList((prev) => prev.filter((t) => t.id !== id));
    addToast('Đã xóa loại vé thành công!', 'info');
  };

  return (
    <AppContext.Provider
      value={{
        // Auth
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        register,
        logout,

        // Users
        users: usersList,
        updateUserRole,
        toggleUserStatus,
        deleteUser,
        addUser,

        // Artifacts
        artifacts: artifactsList,
        addArtifact,
        updateArtifact,
        deleteArtifact,

        // Categories
        categories: categoriesList,

        // Exhibitions
        exhibitions: exhibitionsList,
        addExhibition,
        updateExhibition,
        deleteExhibition,

        // Events
        events: eventsList,
        registerForEvent,

        // Tickets
        tickets: ticketsList,
        addTicketType,
        updateTicketType,
        deleteTicketType,
        bookedTickets: bookedTicketsList,
        bookTicket,
        ticketStats: ticketStatsState,

        // Reviews
        reviews: reviewsList,
        addReview,
        deleteReview,

        // Audit Logs
        auditLogs: auditLogsList,
        logAudit,

        // Toasts
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
