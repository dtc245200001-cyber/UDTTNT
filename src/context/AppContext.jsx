import React, { createContext, useContext, useState, useEffect } from 'react';
import { artifacts as initialArtifacts } from '../data/artifacts';
import { exhibitions as initialExhibitions } from '../data/exhibitions';
import { events as initialEvents } from '../data/events';
import { ticketTypes as initialTickets, ticketStats as initialTicketStats } from '../data/tickets';
import { categories as initialCategories } from '../data/categories';
import { users as initialUsers } from '../data/users';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  const [artifactsList, setArtifactsList] = useState(initialArtifacts);
  const [exhibitionsList, setExhibitionsList] = useState(initialExhibitions);
  const [eventsList, setEventsList] = useState(initialEvents);
  const [ticketsList, setTicketsList] = useState(initialTickets);
  const [ticketStatsState] = useState(initialTicketStats);
  const [categoriesList] = useState(initialCategories);

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
    }, 3000);
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
    return { success: true, user: newUser };
  };

  const logout = () => {
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
    return created;
  };

  const updateArtifact = (id, updatedData) => {
    setArtifactsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...updatedData } : item))
    );
    addToast('Đã cập nhật thông tin hiện vật thành công!', 'success');
  };

  const deleteArtifact = (id) => {
    const item = artifactsList.find((a) => a.id === id);
    setArtifactsList((prev) => prev.filter((a) => a.id !== id));
    addToast(`Đã xóa hiện vật "${item?.name || id}" thành công!`, 'error');
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
        email: 'nguyenvana@gmail.com',
        ticketType: 'Vé Người lớn',
        price: 50000,
        visitDate: '2026-08-20',
        quantity: 1,
        paymentMethod: 'Thanh toán tại quầy',
        status: 'Đã xác nhận',
        createdAt: '2026-08-15',
      },
    ];
  });

  const bookTicket = (bookingData) => {
    const newBooking = {
      id: `TK-2026-${String(bookedTicketsList.length + 1).padStart(3, '0')}`,
      ticketCode: `TK-2026-${String(bookedTicketsList.length + 1).padStart(3, '0')}`,
      name: bookingData.name.trim(),
      phone: bookingData.phone.trim(),
      email: bookingData.email.trim(),
      ticketType: bookingData.ticketType || 'Vé Người lớn',
      price: bookingData.price || 50000,
      visitDate: bookingData.visitDate,
      quantity: bookingData.quantity || 1,
      paymentMethod: 'Thanh toán tại quầy',
      status: 'Đã xác nhận',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [newBooking, ...bookedTicketsList];
    setBookedTicketsList(updated);
    localStorage.setItem('museum_booked_tickets', JSON.stringify(updated));

    addToast('Đặt vé thành công! Vui lòng kiểm tra email của bạn.', 'success');
    return { success: true, booking: newBooking };
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
