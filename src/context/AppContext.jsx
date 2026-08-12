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

  // User list state with LocalStorage persistence
  const [usersList, setUsersList] = useState(() => {
    const savedUsers = localStorage.getItem('museum_users');
    if (savedUsers) {
      try {
        return JSON.parse(savedUsers);
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
        return JSON.parse(savedCurrentUser);
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

    // SECURITY NOTE: Self-registration from public form is strictly locked to 'visitor' role.
    // Admin accounts must be created internally or seeded by existing administrators.
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

  return (
    <AppContext.Provider
      value={{
        currentUser,
        isAuthenticated: !!currentUser,
        login,
        register,
        logout,
        users: usersList,
        artifacts: artifactsList,
        exhibitions: exhibitionsList,
        events: eventsList,
        tickets: ticketsList,
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
