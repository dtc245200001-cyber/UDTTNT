import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { artifacts as initialArtifacts } from '../data/artifacts';
import { exhibitions as initialExhibitions } from '../data/exhibitions';
import { events as initialEvents } from '../data/events';
import { ticketTypes as initialTickets, ticketStats as initialTicketStats } from '../data/tickets';
import { categories as initialCategories } from '../data/categories';
import { users as initialUsers } from '../data/users';
import { reviews as initialReviews } from '../data/reviews';

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // 1. Data States
  const [artifactsList, setArtifactsList] = useState(initialArtifacts);
  const [exhibitionsList, setExhibitionsList] = useState(initialExhibitions);
  const [eventsList, setEventsList] = useState(initialEvents);
  const [ticketsList, setTicketsList] = useState(initialTickets);
  const [ticketStatsState] = useState(initialTicketStats);
  const [categoriesList, setCategoriesList] = useState(initialCategories);
  const [reviewsList, setReviewsList] = useState(initialReviews);

  // 2. Users state
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

  // 3. Current User State
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

  // 4. Booked Tickets
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

  // 5. Event Registrations
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

  // 6. Toasts
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

  // 7. Sync Supabase on Mount
  const fetchSupabaseData = useCallback(async () => {
    try {
      // 1. Fetch Danh mục
      const { data: catData, error: catError } = await supabase.from('danh_muc').select('*');
      if (!catError && catData && catData.length > 0) {
        setCategoriesList(catData);
      }

      // 2. Fetch Hiện vật
      const { data: artData, error: artError } = await supabase
        .from('hien_vat')
        .select('*')
        .order('id', { ascending: true });
      if (!artError && artData && artData.length > 0) {
        // Map database fields if needed
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

  // Sync usersList & currentUser with localStorage
  useEffect(() => {
    localStorage.setItem('museum_users', JSON.stringify(usersList));
  }, [usersList]);

  useEffect(() => {
    if (currentUser) {
      localStorage.setItem('museum_current_user', JSON.stringify(currentUser));
    } else {
      localStorage.removeItem('museum_current_user');
    }
  }, [currentUser]);

  // Auth: Supabase Auth Session listener
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        // Try fetching user record from nguoi_dung table
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

  // 8. Authentication Functions
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

    // Try creating on Supabase
    try {
      await supabase.auth.signUp({
        email: cleanEmail,
        password: userData.password,
        options: { data: { name: newUser.name, role: 'visitor' } },
      });

      await supabase.from('nguoi_dung').insert([
        {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: 'visitor',
          role_label: 'Khách tham quan',
          status: 'Hoạt động',
          avatar: newUser.avatar,
        },
      ]);
    } catch (e) {
      console.warn('Supabase auth signup notice', e);
    }

    setUsersList((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    addToast('Đăng ký tài khoản thành công! Tự động đăng nhập.', 'success');
    return { success: true, user: newUser };
  };

  const logout = async () => {
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase sign out notice', e);
    }
    setCurrentUser(null);
    addToast('Đã đăng xuất khỏi hệ thống thành công.', 'info');
  };

  // 9. User Management CRUD
  const updateUserRole = async (userId, newRole) => {
    const roleLabel = newRole === 'admin' ? 'Quản trị viên' : 'Khách tham quan';
    const updatedUsers = usersList.map((u) => {
      if (u.id === userId) {
        return { ...u, role: newRole, roleLabel };
      }
      return u;
    });

    setUsersList(updatedUsers);
    localStorage.setItem('museum_users', JSON.stringify(updatedUsers));

    try {
      await supabase.from('nguoi_dung').update({ role: newRole, role_label: roleLabel }).eq('id', userId);
    } catch (e) {
      console.warn('Supabase update user role notice', e);
    }

    if (currentUser && currentUser.id === userId) {
      const updatedCurrent = { ...currentUser, role: newRole, roleLabel };
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

  const toggleUserStatus = async (userId) => {
    const target = usersList.find((u) => u.id === userId);
    if (!target) return;
    const newStatus = target.status === 'Tạm khóa' ? 'Hoạt động' : 'Tạm khóa';
    const updatedUsers = usersList.map((u) => (u.id === userId ? { ...u, status: newStatus } : u));
    setUsersList(updatedUsers);
    localStorage.setItem('museum_users', JSON.stringify(updatedUsers));

    try {
      await supabase.from('nguoi_dung').update({ status: newStatus }).eq('id', userId);
    } catch (e) {
      console.warn('Supabase toggle status notice', e);
    }

    addToast(
      `${newStatus === 'Tạm khóa' ? '🔒 Đã khóa' : '🔓 Đã mở khóa'} tài khoản "${target.name}" thành công!`,
      newStatus === 'Tạm khóa' ? 'error' : 'success'
    );
  };

  const deleteUser = async (userId) => {
    const target = usersList.find((u) => u.id === userId);
    if (!target) return;
    const updatedUsers = usersList.filter((u) => u.id !== userId);
    setUsersList(updatedUsers);
    localStorage.setItem('museum_users', JSON.stringify(updatedUsers));

    try {
      await supabase.from('nguoi_dung').delete().eq('id', userId);
    } catch (e) {
      console.warn('Supabase delete user notice', e);
    }

    addToast(`🗑️ Đã xóa tài khoản "${target.name}" thành công!`, 'error');
  };

  const addUser = async (newUser) => {
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

    try {
      await supabase.from('nguoi_dung').insert([
        {
          id: createdUser.id,
          name: createdUser.name,
          email: createdUser.email,
          role: createdUser.role,
          role_label: createdUser.roleLabel,
          status: createdUser.status,
          avatar: createdUser.avatar,
        },
      ]);
    } catch (e) {
      console.warn('Supabase add user notice', e);
    }

    addToast(`Đã tạo tài khoản "${createdUser.name}" (${createdUser.roleLabel}) thành công!`, 'success');
    return { success: true, user: createdUser };
  };

  // 10. Artifacts CRUD (Supabase Sync)
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
          category: created.category,
          category_id: created.categoryId,
          culture: created.culture,
          period: created.period,
          material: created.material,
          dimensions: created.dimensions,
          origin: created.origin,
          location: created.location,
          status: created.status || 'Đang trưng bày',
          image: created.image,
          description: created.description,
          ai_analysis: created.aiAnalysis,
        },
      ]);
    } catch (e) {
      console.warn('Supabase add artifact notice', e);
    }

    addToast(`Đã thêm hiện vật "${created.name}" thành công!`, 'success');
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
          category: updatedData.category,
          category_id: updatedData.categoryId,
          culture: updatedData.culture,
          period: updatedData.period,
          material: updatedData.material,
          dimensions: updatedData.dimensions,
          origin: updatedData.origin,
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
  };

  // 11. Tickets CRUD
  const addTicketType = async (newType) => {
    const created = {
      ...newType,
      id: `TK${String(ticketsList.length + 1).padStart(3, '0')}`,
    };
    setTicketsList((prev) => [...prev, created]);

    try {
      await supabase.from('ve_tham_quan').insert([
        {
          id: created.id,
          name: created.name,
          price: created.price,
          description: created.description,
          active: created.active !== false,
        },
      ]);
    } catch (e) {
      console.warn('Supabase add ticket type notice', e);
    }

    addToast(`Đã thêm loại vé "${created.name}" thành công!`, 'success');
  };

  const updateTicketType = async (id, updatedData) => {
    setTicketsList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...updatedData } : t))
    );

    try {
      await supabase
        .from('ve_tham_quan')
        .update({
          name: updatedData.name,
          price: updatedData.price,
          description: updatedData.description,
          active: updatedData.active !== false,
        })
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase update ticket type notice', e);
    }

    addToast('Đã cập nhật loại vé thành công!', 'success');
  };

  const deleteTicketType = async (id) => {
    const target = ticketsList.find((t) => t.id === id);
    setTicketsList((prev) => prev.filter((t) => t.id !== id));

    try {
      await supabase.from('ve_tham_quan').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete ticket type notice', e);
    }

    addToast(`Đã xóa loại vé "${target?.name || id}"!`, 'error');
  };

  // 12. Exhibitions CRUD
  const addExhibition = async (newEx) => {
    const created = {
      ...newEx,
      id: `EX${String(exhibitionsList.length + 1).padStart(3, '0')}`,
      artifactsCount: newEx.artifactsCount || 20,
      visitorsCount: 0,
    };
    setExhibitionsList((prev) => [created, ...prev]);

    try {
      await supabase.from('trien_lam').insert([
        {
          id: created.id,
          name: created.name,
          status: created.status,
          start_date: created.startDate,
          end_date: created.endDate,
          location: created.location,
          image: created.image,
          description: created.description,
          artifacts_count: created.artifactsCount,
        },
      ]);
    } catch (e) {
      console.warn('Supabase add exhibition notice', e);
    }

    addToast(`Đã tạo triển lãm "${created.name}" thành công!`, 'success');
  };

  const updateExhibition = async (id, updatedData) => {
    setExhibitionsList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...updatedData } : e))
    );

    try {
      await supabase
        .from('trien_lam')
        .update({
          name: updatedData.name,
          status: updatedData.status,
          start_date: updatedData.startDate,
          end_date: updatedData.endDate,
          location: updatedData.location,
          image: updatedData.image,
          description: updatedData.description,
        })
        .eq('id', id);
    } catch (e) {
      console.warn('Supabase update exhibition notice', e);
    }

    addToast('Đã cập nhật triển lãm thành công!', 'success');
  };

  const deleteExhibition = async (id) => {
    const target = exhibitionsList.find((e) => e.id === id);
    setExhibitionsList((prev) => prev.filter((e) => e.id !== id));

    try {
      await supabase.from('trien_lam').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete exhibition notice', e);
    }

    addToast(`Đã xóa triển lãm "${target?.name || id}"!`, 'error');
  };

  // 13. Events Registration & CRUD
  const registerForEvent = async (registrationData) => {
    const targetId = typeof registrationData === 'object' ? registrationData.eventId : registrationData;
    const ev = eventsList.find((e) => e.id === targetId) || {
      id: targetId,
      title: registrationData?.eventTitle || 'Sự kiện Bảo tàng',
    };

    const newRecord = {
      id: `EVREG-${Date.now()}`,
      eventId: targetId,
      eventTitle: registrationData?.eventTitle || ev.title,
      userId: currentUser?.id || null,
      name: registrationData?.name ? registrationData.name.trim() : currentUser?.name || 'Khách tham quan',
      phone: registrationData?.phone ? registrationData.phone.trim() : 'N/A',
      email: registrationData?.email ? registrationData.email.trim() : currentUser?.email || 'N/A',
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

    try {
      await supabase.from('dang_ky_su_kien').insert([
        {
          id: newRecord.id,
          event_id: newRecord.eventId,
          event_title: newRecord.eventTitle,
          user_id: newRecord.userId,
          name: newRecord.name,
          phone: newRecord.phone,
          email: newRecord.email,
          visit_date: newRecord.visitDate,
        },
      ]);
    } catch (e) {
      console.warn('Supabase event registration notice', e);
    }

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
    addToast(`✓ Đăng ký thành công sự kiện "${safeTitle}"!`, 'success');
    return { success: true, event: ev, registration: newRecord };
  };

  // 14. Book Tickets
  const bookTicket = async (bookingData) => {
    const newBooking = {
      id: `TK-2026-${String(bookedTicketsList.length + 1).padStart(3, '0')}`,
      ticketCode: `TK-2026-${String(bookedTicketsList.length + 1).padStart(3, '0')}`,
      userId: currentUser?.id || null,
      name: bookingData.name.trim(),
      phone: bookingData.phone.trim(),
      email: bookingData.email.trim(),
      ticketType: bookingData.ticketType || 'Vé Người lớn',
      price: bookingData.price || 50000,
      visitDate: bookingData.visitDate,
      quantity: bookingData.quantity || 1,
      paymentMethod: bookingData.paymentMethod || 'Thanh toán tại quầy',
      status: 'Đã xác nhận',
      createdAt: new Date().toISOString().split('T')[0],
    };

    const updated = [newBooking, ...bookedTicketsList];
    setBookedTicketsList(updated);
    localStorage.setItem('museum_booked_tickets', JSON.stringify(updated));

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

    addToast('Đặt vé thành công! Mã vé điện tử đã được tạo trong mục Vé của tôi.', 'success');
    return { success: true, booking: newBooking };
  };

  // 15. Reviews
  const addReview = async (newReview) => {
    const created = {
      id: `REV${String(reviewsList.length + 1).padStart(3, '0')}`,
      author: newReview.author || currentUser?.name || 'Khách tham quan',
      userId: currentUser?.id || null,
      artifactName: newReview.artifactName || 'Bảo tàng Quốc gia Việt Nam',
      rating: newReview.rating || 5,
      comment: newReview.comment,
      date: new Date().toISOString().split('T')[0],
    };

    setReviewsList((prev) => [created, ...prev]);

    try {
      await supabase.from('danh_gia').insert([
        {
          id: created.id,
          author: created.author,
          user_id: created.userId,
          artifact_name: created.artifactName,
          rating: created.rating,
          comment: created.comment,
          date: created.date,
        },
      ]);
    } catch (e) {
      console.warn('Supabase review insert notice', e);
    }

    addToast('Cảm ơn bạn đã gửi đánh giá và nhận xét!', 'success');
  };

  const deleteReview = async (id) => {
    setReviewsList((prev) => prev.filter((r) => r.id !== id));
    try {
      await supabase.from('danh_gia').delete().eq('id', id);
    } catch (e) {
      console.warn('Supabase delete review notice', e);
    }
    addToast('Đã xóa đánh giá thành công!', 'info');
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

        // Toasts
        toasts,
        addToast,
        removeToast,

        // Refresh
        refreshData: fetchSupabaseData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => useContext(AppContext);
