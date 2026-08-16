import React, { createContext, useContext, useState, useEffect } from 'react';
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
  const [artifactsList, setArtifactsList] = useState(initialArtifacts);
  const [exhibitionsList, setExhibitionsList] = useState(initialExhibitions);
  const [eventsList, setEventsList] = useState(initialEvents);
  const [ticketsList, setTicketsList] = useState(initialTickets);
  const [ticketStatsState] = useState(initialTicketStats);
  const [categoriesList] = useState(initialCategories);

  // Audit Logs State
  const [auditLogsList, setAuditLogsList] = useState(getAuditLogs);

  const logAudit = (action, description) => {
    const entry = createAuditLog(currentUser, action, description);
    setAuditLogsList(getAuditLogs());
    return entry;
  };

  // User list state with LocalStorage persistence & auto-merge initial users
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
        console.error('Failed to parse museum_users from localStorage', e);
      }
    }
    return initialUsers;
  });

  // Current logged in user state with LocalStorage persistence
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
        console.error('Failed to parse museum_current_user from localStorage', e);
      }
    }
    return null;
  });

  // Reviews list state with LocalStorage persistence
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

  // Sync reviews to localStorage
  useEffect(() => {
    localStorage.setItem('museum_reviews', JSON.stringify(reviewsList));
  }, [reviewsList]);

  // Sync usersList changes to localStorage
  useEffect(() => {
    localStorage.setItem('museum_users', JSON.stringify(usersList));
  }, [usersList]);

  // Sync currentUser changes to localStorage
  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('museum_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('museum_current_user');
    }
  }, [currentUser]);

  // Toast notification state
  const [toasts, setToasts] = useState([]);

  const addToast = (message, type = 'success') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 3500);
  };

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  // Auth Functions
  const login = (email, password) => {
    const cleanEmail = email.trim().toLowerCase();
    const foundUser = usersList.find(
      (u) => u.email.toLowerCase() === cleanEmail && u.password === password
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

  const register = (userData) => {
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

  // Responsive mobile sidebar drawer state
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

  // Global search state
  const [globalSearch, setGlobalSearch] = useState('');

  // CRUD Artifacts
  const addArtifact = (newArtifact) => {
    const created = {
      ...newArtifact,
      id: `AV${String(artifactsList.length + 1).padStart(3, '0')}`,
      createdAt: new Date().toISOString().split('T')[0],
      image: newArtifact.image || '/images/trong-dong.jpg',
      aiAnalysis: newArtifact.aiAnalysis || `Bản phân tích AI: hiện vật ${newArtifact.name} được bổ sung mới vào danh mục lưu trữ.`,
    };
    setArtifactsList((prev) => [created, ...prev]);
    addToast(`Đã thêm hiện vật "${created.name}" thành công!`, 'success');
    logAudit('CREATE_ARTIFACT', `Thêm hiện vật mới: ${created.name} (${created.id})`);
    return created;
  };

  const updateArtifact = (id, updatedData) => {
    setArtifactsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
    );
    addToast('Đã cập nhật thông tin hiện vật thành công!', 'success');
    logAudit('UPDATE_ARTIFACT', `Cập nhật hiện vật mã: ${id}`);
  };

  const deleteArtifact = (id) => {
    const item = artifactsList.find((a) => a.id === id);
    setArtifactsList((prev) => prev.filter((a) => a.id !== id));
    addToast(`Đã xóa hiện vật "${item?.name || id}" thành công!`, 'error');
    logAudit('DELETE_ARTIFACT', `Xóa hiện vật: ${item?.name || id}`);
  };

  const updateUserRole = (userId, newRole) => {
    const updatedUsers = usersList.map((u) => {
      if (u.id === userId) {
        const roleLabel = newRole === 'admin' ? 'Quản trị viên' : 'Khách tham quan';
        return { ...u, role: newRole, roleLabel };
      }
      return u;
    });

    setUsersList(updatedUsers);
    localStorage.setItem('museum_users', JSON.stringify(updatedUsers));

    if (currentUser && currentUser.id === userId) {
      const updatedCurrent = {
        ...currentUser,
        role: newRole,
        roleLabel: newRole === 'admin' ? 'Quản trị viên' : 'Khách tham quan',
      };
      setCurrentUser(updatedCurrent);
      localStorage.setItem('museum_current_user', JSON.stringify(updatedCurrent));
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
    localStorage.setItem('museum_users', JSON.stringify(updatedUsers));
    addToast(`Đã tạo tài khoản "${createdUser.name}" (${createdUser.roleLabel}) thành công!`, 'success');
    logAudit('CREATE_USER', `Tạo tài khoản người dùng: ${createdUser.email}`);
    return { success: true, user: createdUser };
  };

  // Event registrations list state
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
    localStorage.setItem('museum_event_registrations', JSON.stringify(updatedRegistrations));

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

    if (currentUser) {
      const prevRegistered = currentUser.registeredEvents || [];
      if (!prevRegistered.includes(targetId)) {
        const updatedUser = {
          ...currentUser,
          registeredEvents: [...prevRegistered, targetId],
        };
        setCurrentUser(updatedUser);
      }
    }

    const safeTitle = (registrationData?.eventTitle || ev.title || '').replace(/"/g, '”');
    addToast(`✓ Đăng ký thành công sự kiện "${safeTitle}"! Vui lòng kiểm tra email của bạn.`, 'success');
    logAudit('EVENT_REGISTER', `Khách hàng ${newRecord.email} đăng ký sự kiện: ${ev.title}`);
    return { success: true, event: ev, registration: newRecord };
  };

  // Booked tickets state with LocalStorage persistence
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
        paymentMethod: 'VNPay',
        status: 'Đã thanh toán',
        createdAt: '2026-08-15',
        qrCode: 'TK-2026-001-ADMIN-100K',
        userEmail: 'admin@gmail.com',
      },
    ];
  });

  const bookTicket = (bookingData) => {
    const qty = Number(bookingData.quantity) || 1;
    const unitPrice = Number(bookingData.price) || 50000;
    const total = qty * unitPrice;
    const ticketCode = `TK-2026-${String(bookedTicketsList.length + 1).padStart(3, '0')}`;

    const newBooking = {
      id: ticketCode,
      ticketCode: ticketCode,
      name: bookingData.name.trim(),
      phone: bookingData.phone.trim(),
      email: bookingData.email.trim(),
      ticketType: bookingData.ticketType || 'Vé Người lớn',
      price: unitPrice,
      quantity: qty,
      totalPrice: total,
      visitDate: bookingData.visitDate,
      paymentMethod: bookingData.paymentMethod || 'VNPay',
      status: bookingData.status || 'Đã thanh toán',
      createdAt: new Date().toISOString().split('T')[0],
      qrCode: `${ticketCode}-${bookingData.email.trim()}-${total}VND`,
      userEmail: currentUser?.email || bookingData.email.trim(),
    };

    const updated = [newBooking, ...bookedTicketsList];
    setBookedTicketsList(updated);
    localStorage.setItem('museum_booked_tickets', JSON.stringify(updated));

    addToast(`🎫 Đặt vé thành công (${ticketCode})! Vé điện tử đã lưu vào mục "Vé của tôi".`, 'success');
    logAudit('BOOK_TICKET', `Đặt vé thành công: ${ticketCode} - ${newBooking.ticketType} (${qty} vé)`);
    return { success: true, booking: newBooking };
  };

  // Review Validation & Banned Words Check
  const bannedWords = ['spam', 'lừa đảo', 'xúc phạm', 'bậy bạ', 'đồi trụy', 'fuck', 'shit', 'clmm', 'dmm', 'buôn bán'];

  const addReview = (reviewData) => {
    if (!currentUser) {
      addToast('Bạn cần đăng nhập tài khoản để gửi đánh giá!', 'error');
      return { success: false, message: 'Yêu cầu đăng nhập' };
    }

    const commentText = (reviewData.comment || '').trim();
    if (!commentText || commentText.length < 5) {
      addToast('Nội dung đánh giá quá ngắn (tối thiểu 5 ký tự).', 'error');
      return { success: false, message: 'Nội dung không hợp lệ' };
    }

    // Check for spam & banned words
    const lowerComment = commentText.toLowerCase();
    const hasBannedWord = bannedWords.some((word) => lowerComment.includes(word));
    if (hasBannedWord) {
      addToast('Đánh giá chứa từ ngữ không phù hợp hoặc vi phạm tiêu chuẩn cộng đồng!', 'error');
      return { success: false, message: 'Nội dung chứa từ cấm' };
    }

    const newReview = {
      id: `REV${String(reviewsList.length + 1).padStart(3, '0')}`,
      author: currentUser.name || 'Khách tham quan',
      authorEmail: currentUser.email,
      rating: Number(reviewData.rating) || 5,
      artifactName: reviewData.artifactName || 'Bảo tàng Lịch sử Quốc gia',
      comment: commentText,
      date: new Date().toISOString().split('T')[0],
    };

    const updatedReviews = [newReview, ...reviewsList];
    setReviewsList(updatedReviews);
    localStorage.setItem('museum_reviews', JSON.stringify(updatedReviews));

    addToast('Cảm ơn bạn! Đánh giá đã được đăng công khai thành công.', 'success');
    logAudit('SUBMIT_REVIEW', `Đánh giá mới từ ${currentUser.email} (${newReview.rating} sao)`);
    return { success: true, review: newReview };
  };

  const deleteReview = (id) => {
    const updated = reviewsList.filter((r) => r.id !== id);
    setReviewsList(updated);
    addToast('Đã xóa đánh giá thành công.', 'info');
    logAudit('DELETE_REVIEW', `Xóa đánh giá ID: ${id}`);
  };

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        register,
        logout,
        users: usersList,
        updateUserRole,
        addUser,
        artifacts: artifactsList,
        exhibitions: exhibitionsList,
        events: eventsList,
        registerForEvent,
        tickets: ticketsList,
        bookedTickets: bookedTicketsList,
        bookTicket,
        ticketStats: ticketStatsState,
        categories: categoriesList,
        addArtifact,
        updateArtifact,
        deleteArtifact,
        reviews: reviewsList,
        addReview,
        deleteReview,
        auditLogs: auditLogsList,
        logAudit,
        isMobileSidebarOpen,
        setIsMobileSidebarOpen,
        globalSearch,
        setGlobalSearch,
        toasts,
        addToast,
        removeToast,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
