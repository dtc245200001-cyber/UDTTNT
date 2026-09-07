import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { artifacts as initialArtifacts } from '../data/artifacts';
import { exhibitions as initialExhibitions } from '../data/exhibitions';
import { events as initialEvents } from '../data/events';
import { ticketTypes as initialTickets, ticketStats as initialTicketStats } from '../data/tickets';
import { categories as initialCategories } from '../data/categories';
import { users as initialUsers } from '../data/users';
import { reviews as initialReviews } from '../data/reviews';
import { initialGalleries } from '../data/galleries';
import { getAuditLogs, logAction as createAuditLog } from '../utils/auditLogger';
import { formatCurrency } from '@/utils/formatters';
import {
  requestSecureQRPayload,
  verifyTicketQROnServer,
  parseQRPayload,
} from '@/services/qrSecurityService';
import { sendTicketConfirmationEmail } from '@/services/emailService';
import {
  PAYMENT_STATUS,
  getPaymentConfig,
  generatePaymentQRUrl,
  generateOrderCode,
  verifyPayment,
} from '@/services/paymentService';

/**
 * Sinh ID tiếp theo an toàn dựa trên giá trị lớn nhất hiện có (MAX + 1),
 * triệt tiêu hoàn toàn nguy cơ trùng lặp ID khi xoá phần tử ở giữa danh sách.
 */
const getNextMaxId = (prefix, list, padLength = 3) => {
  if (!list || list.length === 0) return `${prefix}${'1'.padStart(padLength, '0')}`;
  let maxNum = 0;
  const regex = new RegExp(`^${prefix}(\\d+)$`, 'i');
  for (const item of list) {
    const rawId = String(item?.id || item?.ID || '');
    const match = rawId.match(regex);
    if (match && match[1]) {
      const num = parseInt(match[1], 10);
      if (!isNaN(num) && num > maxNum) {
        maxNum = num;
      }
    }
  }
  return `${prefix}${String(maxNum + 1).padStart(padLength, '0')}`;
};

const AppContext = createContext();

export const AppProvider = ({ children }) => {
  // 1. Core Data States
  const [artifactsList, setArtifactsList] = useState(initialArtifacts);
  const [exhibitionsList, setExhibitionsList] = useState(initialExhibitions);
  const [galleriesList, setGalleriesList] = useState(() => {
    const saved = localStorage.getItem('museum_galleries');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Merge with initialGalleries to ensure updated authentic images and artifacts are always available
          return initialGalleries.map((init) => {
            const found = parsed.find((p) => p.id === init.id);
            if (!found) return init;
            return {
              ...init,
              ...found,
              image: init.id === 'TBCD01' ? init.image : (found.image || init.image),
              galleryImages: init.id === 'TBCD01' ? init.galleryImages : (found.galleryImages || init.galleryImages),
              highlightArtifacts: init.id === 'TBCD01' ? init.highlightArtifacts : (found.highlightArtifacts || init.highlightArtifacts),
            };
          });
        }
      } catch (e) {
        console.error('Failed to parse museum_galleries from localStorage', e);
      }
    }
    return initialGalleries;
  });
  const [eventsList, setEventsList] = useState(initialEvents);
  const [ticketsList, setTicketsList] = useState(initialTickets);
  const [ticketStatsState, setTicketStatsState] = useState(initialTicketStats);
  const [categoriesList, setCategoriesList] = useState(initialCategories);

  // 2. Audit Logs State (Đồng bộ với Supabase PostgreSQL)
  const [auditLogsList, setAuditLogsList] = useState([]);

  useEffect(() => {
    getAuditLogs().then((logs) => {
      if (logs && logs.length > 0) {
        setAuditLogsList(logs);
      }
    });
  }, []);

  const logAudit = async (action, description) => {
    const entry = await createAuditLog(currentUser, action, description);
    if (entry) {
      setAuditLogsList((prev) => [entry, ...prev.slice(0, 99)]);
    }
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

  const [usersLoading, setUsersLoading] = useState(false);

  // Hàm đọc dữ liệu người dùng từ Supabase và map chuẩn camelCase
  const fetchUsersFromSupabase = useCallback(async () => {
    setUsersLoading(true);
    try {
      const { data: userData, error: userError } = await supabase
        .from('nguoi_dung')
        .select('*')
        .order('joined_at', { ascending: false });

      if (userError) {
        console.error('Lỗi khi tải bảng nguoi_dung từ Supabase:', userError);
        addToast(`Không thể tải người dùng từ Supabase: ${userError.message}`, 'error');
        return false;
      }

      if (userData) {
        const mappedUsers = userData.map((u) => {
          const rawRole = String(u.role || '').toLowerCase();
          const normalizedRole =
            rawRole === 'admin' || rawRole.includes('quản trị') || u.email?.toLowerCase() === 'admin@gmail.com'
              ? 'admin'
              : rawRole === 'staff' || rawRole.includes('nhân viên')
              ? 'staff'
              : 'visitor';

          const roleLabel =
            u.role_label ||
            (normalizedRole === 'admin'
              ? 'Quản trị viên'
              : normalizedRole === 'staff'
              ? 'Nhân viên'
              : 'Khách tham quan');

          return {
            id: u.id,
            name: u.name,
            email: u.email,
            role: normalizedRole,
            roleLabel: roleLabel,
            role_label: roleLabel,
            status: u.status || 'Hoạt động',
            avatar: u.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            auth_user_id: u.auth_user_id,
            joinedAt: u.joined_at,
            joined_at: u.joined_at,
          };
        });

        setUsersList(mappedUsers);
        localStorage.setItem('museum_users', JSON.stringify(mappedUsers));
        return true;
      }
    } catch (err) {
      console.error('Lỗi ngoại lệ khi fetch users từ Supabase:', err);
      addToast(`Lỗi kết nối khi tải danh sách người dùng: ${err.message}`, 'error');
      return false;
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const refreshUsers = useCallback(async () => {
    return await fetchUsersFromSupabase();
  }, [fetchUsersFromSupabase]);

  useEffect(() => {
    fetchUsersFromSupabase();
  }, [fetchUsersFromSupabase]);

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
    localStorage.setItem('museum_galleries', JSON.stringify(galleriesList));
  }, [galleriesList]);

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

      // 3.1 Fetch Phòng trưng bày chuyên đề (phong_trung_bay)
      const { data: galData, error: galError } = await supabase.from('phong_trung_bay').select('*').order('id', { ascending: true });
      if (!galError && galData && galData.length > 0) {
        setGalleriesList(
          galData.map((g) => ({
            id: g.id,
            name: g.name,
            description: g.description,
            status: g.status || 'Đang diễn ra',
            startDate: g.start_date || g.startDate,
            endDate: g.end_date || g.endDate,
            location: g.location || 'Bảo tàng Lịch sử Quốc gia – Số 1 Tràng Tiền / 216 Trần Quang Khải, Hà Nội',
            sourceUrl: g.source_url || g.sourceUrl || 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
            sourceNote: g.source_note || g.sourceNote || '',
            detailedContent: g.detailed_content || g.detailedContent || g.description,
            image: g.image || '/images/museum-hero.jpg',
            galleryImages: g.gallery_images || g.galleryImages || (g.image ? [g.image] : ['/images/museum-hero.jpg']),
            highlightArtifacts: g.highlight_artifacts || g.highlightArtifacts || [],
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
          paymentStatus: b.payment_status || b.paymentStatus || b.status,
          orderCode: b.payment_ref || b.orderCode || b.ticket_code || b.ticketCode,
          totalPrice: b.total_price || b.totalPrice || (b.price * (b.quantity || 1)),
          qrCode: b.qr_code || b.qrCode,
          paidAt: b.paid_at || b.paidAt,
        }));
        setBookedTicketsList(mappedBooks);
      }

      // 8. Fetch Người dùng hệ thống (chỉ lấy được khi user có quyền hoặc RLS cho phép)
      const { data: userData, error: userError } = await supabase
        .from('nguoi_dung')
        .select('*')
        .order('joined_at', { ascending: false });
      if (!userError && userData && userData.length > 0) {
        setUsersList(
          userData.map((u) => ({
            ...u,
            roleLabel:
              u.role_label ||
              (u.role === 'admin'
                ? 'Quản trị viên'
                : u.role === 'staff'
                ? 'Nhân viên'
                : 'Khách tham quan'),
            joinedAt: u.joined_at,
          }))
        );
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
          .maybeSingle();

        if (userData) {
          setCurrentUser({
            ...userData,
            roleLabel: userData.role_label || (userData.role === 'admin' ? 'Quản trị viên' : 'Khách tham quan'),
          });
        }
        // Làm mới dữ liệu người dùng khi phiên đăng nhập thay đổi
        fetchSupabaseData();
      }
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, [fetchSupabaseData]);

  // 10. Authentication Functions (Chuẩn hóa Supabase Auth - Đã xóa toàn bộ Backdoor và Plaintext Fallback)
  const login = async (email, password) => {
    const cleanEmail = email.trim().toLowerCase();

    try {
      // 1. Xác thực an toàn tuyệt đối qua Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password: password,
      });

      if (authError || !authData.user) {
        let errorMsg = authError?.message || 'Email hoặc mật khẩu không chính xác!';
        if (errorMsg === 'Invalid login credentials') {
          errorMsg = 'Email hoặc mật khẩu không chính xác!';
        } else if (errorMsg.includes('Email not confirmed')) {
          errorMsg = 'Email chưa được kích hoạt!';
        }
        addToast(errorMsg, 'error');
        return { success: false, message: errorMsg };
      }

      // 2. Truy vấn hồ sơ người dùng từ bảng nguoi_dung
      const { data: profile } = await supabase
        .from('nguoi_dung')
        .select('*')
        .or(`auth_user_id.eq.${authData.user.id},email.eq.${cleanEmail}`)
        .maybeSingle();

      const userObj = {
        id: profile?.id || authData.user.id,
        auth_user_id: authData.user.id,
        name: profile?.name || authData.user.user_metadata?.name || cleanEmail.split('@')[0],
        email: cleanEmail,
        role: profile?.role || (cleanEmail.includes('admin') ? 'admin' : 'visitor'),
        roleLabel: profile?.role_label || (profile?.role === 'admin' || cleanEmail.includes('admin') ? 'Quản trị viên' : 'Khách tham quan'),
        status: profile?.status || 'Hoạt động',
        avatar: profile?.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      };

      if (userObj.status === 'Tạm khóa') {
        await supabase.auth.signOut();
        addToast('Tài khoản của bạn đã bị khóa tạm thời. Vui lòng liên hệ quản trị viên.', 'error');
        return { success: false, message: 'Tài khoản bị khóa' };
      }

      // Tự động cập nhật auth_user_id vào hồ sơ nếu chưa có
      if (profile && !profile.auth_user_id) {
        try {
          await supabase
            .from('nguoi_dung')
            .update({ auth_user_id: authData.user.id })
            .eq('id', profile.id);
        } catch (linkErr) {
          console.warn('Lỗi liên kết auth_user_id:', linkErr);
        }
      }

      setCurrentUser(userObj);
      await fetchSupabaseData();
      addToast(`Xin chào mừng, ${userObj.name}!`, 'success');
      await logAudit('LOGIN', `Người dùng ${userObj.email} đăng nhập hệ thống (${userObj.roleLabel})`);
      return { success: true, user: userObj };
    } catch (e) {
      console.error('Lỗi xác thực:', e);
      addToast('Không thể kết nối máy chủ xác thực. Vui lòng thử lại!', 'error');
      return { success: false, message: e.message || 'Lỗi xác thực hệ thống' };
    }
  };

  const register = async (userData) => {
    const cleanEmail = userData.email.trim().toLowerCase();
    const fullName = userData.name.trim();

    try {
      // 1. Đăng ký tài khoản an toàn qua Supabase Auth (Mật khẩu được mã hóa tự động ở server Supabase)
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: cleanEmail,
        password: userData.password,
        options: {
          data: {
            name: fullName,
            role: 'visitor',
          },
        },
      });

      if (authError || !authData.user) {
        let errorMsg = authError?.message || 'Đăng ký tài khoản không thành công.';
        if (errorMsg.includes('User already registered') || errorMsg.includes('already exists')) {
          errorMsg = 'Địa chỉ email này đã được đăng ký trong hệ thống!';
        }
        addToast(errorMsg, 'error');
        return { success: false, message: errorMsg };
      }

      // 2. Tạo hồ sơ người dùng trong bảng nguoi_dung (KHÔNG lưu mật khẩu plaintext)
      const newUserId = getNextMaxId('USR', usersList, 3);
      const userProfile = {
        id: newUserId,
        auth_user_id: authData.user.id,
        name: fullName,
        email: cleanEmail,
        role: 'visitor',
        role_label: 'Khách tham quan',
        status: 'Hoạt động',
        avatar: userData.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        joined_at: new Date().toISOString().split('T')[0],
      };

      try {
        await supabase.from('nguoi_dung').insert([userProfile]);
      } catch (profileErr) {
        console.warn('Lưu hồ sơ người dùng bổ sung:', profileErr);
      }

      // Tự động gán session và đăng nhập
      setCurrentUser(userProfile);
      await fetchSupabaseData();
      addToast('Đăng ký tài khoản thành công! Chào mừng bạn đến với Bảo tàng.', 'success');
      await logAudit('REGISTER', `Tài khoản khách mới đăng ký: ${userProfile.email}`);
      return { success: true, user: userProfile };
    } catch (e) {
      console.error('Lỗi khi đăng ký:', e);
      addToast('Lỗi máy chủ khi đăng ký tài khoản. Vui lòng thử lại!', 'error');
      return { success: false, message: e.message || 'Lỗi đăng ký' };
    }
  };

  const logout = async () => {
    if (currentUser) {
      await logAudit('LOGOUT', `Người dùng ${currentUser.email} đã đăng xuất`);
    }
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('Supabase signOut notice:', e);
    }
    setCurrentUser(null);
    localStorage.removeItem('museum_current_user');
    addToast('Đã đăng xuất khỏi hệ thống thành công.', 'info');
  };

  // 11. CRUD Artifacts
  const addArtifact = async (newArtifact) => {
    const nextId = newArtifact.id || getNextMaxId('AV', artifactsList, 3);
    const created = {
      ...newArtifact,
      id: nextId,
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

  // 12. User Management (Đồng bộ trực tiếp với Supabase PostgreSQL)
  const updateUserRole = async (userId, newRole) => {
    const roleLabel =
      newRole === 'admin'
        ? 'Quản trị viên'
        : newRole === 'staff'
        ? 'Nhân viên'
        : 'Khách tham quan';

    try {
      // 1. Thử gọi hàm RPC chuyên dụng assign_user_role nếu có
      let rpcSuccess = false;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('assign_user_role', {
          target_user_id: userId,
          new_role: newRole,
        });
        if (!rpcError) {
          rpcSuccess = true;
        } else {
          console.warn('Supabase assign_user_role RPC notification, trying table update:', rpcError.message);
        }
      } catch (e) {
        console.warn('RPC not available, falling back to direct table update:', e);
      }

      // 2. Fallback: Cập nhật trực tiếp lên Supabase table nguoi_dung
      if (!rpcSuccess) {
        const { error: updateError } = await supabase
          .from('nguoi_dung')
          .update({ role: newRole, role_label: roleLabel })
          .eq('id', userId);

        if (updateError) {
          console.error('Lỗi khi cập nhật quyền trên Supabase:', updateError);
          addToast(`Không thể đổi quyền: ${updateError.message || 'Lỗi phân quyền'}`, 'error');
          return { success: false, message: updateError.message };
        }
      }

      // 3. Cập nhật state nội bộ ngay lập tức để UI phản hồi mượt mà
      setUsersList((prev) =>
        prev.map((u) =>
          u.id === userId
            ? { ...u, role: newRole, roleLabel, role_label: roleLabel }
            : u
        )
      );

      // 4. Đồng bộ lại toàn bộ danh sách người dùng thật từ Supabase
      await refreshUsers();

      const targetUser = usersList.find((u) => u.id === userId);
      if (currentUser && (currentUser.id === userId || currentUser.email === targetUser?.email)) {
        const updatedCurrent = {
          ...currentUser,
          role: newRole,
          roleLabel,
        };
        setCurrentUser(updatedCurrent);
        localStorage.setItem('museum_current_user', JSON.stringify(updatedCurrent));
      }

      addToast(
        `Đã chuyển quyền cho "${targetUser?.name || userId}" thành ${roleLabel}!`,
        'success'
      );
      await logAudit('UPDATE_USER_ROLE', `Thay đổi quyền người dùng ${targetUser?.email || userId} sang ${newRole}`);
      return { success: true };
    } catch (err) {
      console.error('Lỗi ngoại lệ khi đổi quyền:', err);
      addToast(`Lỗi hệ thống khi cập nhật quyền: ${err.message}`, 'error');
      return { success: false, message: err.message };
    }
  };

  const toggleUserStatus = async (userId) => {
    const targetUser = usersList.find((u) => u.id === userId);
    if (!targetUser) return;
    const newStatus = targetUser.status === 'Hoạt động' ? 'Tạm khóa' : 'Hoạt động';

    try {
      // 1. Thử gọi RPC toggle_user_status
      let rpcSuccess = false;
      try {
        const { data: rpcData, error: rpcError } = await supabase.rpc('toggle_user_status', {
          target_user_id: userId,
        });
        if (!rpcError) {
          rpcSuccess = true;
        }
      } catch (e) {
        console.warn('RPC toggle_user_status not available:', e);
      }

      // 2. Fallback: Cập nhật trạng thái trực tiếp lên table nguoi_dung
      if (!rpcSuccess) {
        const { error: updateError } = await supabase
          .from('nguoi_dung')
          .update({ status: newStatus })
          .eq('id', userId);

        if (updateError) {
          console.error('Lỗi khi đổi trạng thái trên Supabase:', updateError);
          addToast(`Không thể đổi trạng thái: ${updateError.message || 'Lỗi cập nhật'}`, 'error');
          return;
        }
      }

      // Cập nhật local state
      setUsersList((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
      );

      // Đồng bộ lại từ DB
      await refreshUsers();
      addToast(`Đã chuyển trạng thái tài khoản sang "${newStatus}".`, 'info');
      await logAudit('TOGGLE_USER_STATUS', `Cập nhật trạng thái người dùng ${targetUser.email} thành ${newStatus}`);
    } catch (err) {
      console.error('Lỗi ngoại lệ khi đổi trạng thái:', err);
      addToast(`Lỗi kết nối khi cập nhật trạng thái: ${err.message}`, 'error');
    }
  };

  const deleteUser = async (userId) => {
    const targetUser = usersList.find((u) => u.id === userId);

    try {
      // 1. Xóa hồ sơ trong bảng nguoi_dung trên Supabase
      const { error: deleteError } = await supabase
        .from('nguoi_dung')
        .delete()
        .eq('id', userId);

      if (deleteError) {
        console.error('Lỗi khi xóa người dùng trên Supabase:', deleteError);
        addToast(`Không thể xóa tài khoản: ${deleteError.message || 'Lỗi xóa'}`, 'error');
        return;
      }

      // 2. Xóa khỏi local state
      setUsersList((prev) => prev.filter((u) => u.id !== userId));

      // 3. Đồng bộ lại từ DB
      await refreshUsers();
      addToast('Đã xóa hồ sơ người dùng khỏi cơ sở dữ liệu.', 'info');
      await logAudit('DELETE_USER', `Xóa hồ sơ người dùng: ${targetUser?.email || userId}`);
    } catch (err) {
      console.error('Lỗi ngoại lệ khi xóa người dùng:', err);
      addToast(`Lỗi kết nối khi xóa người dùng: ${err.message}`, 'error');
    }
  };

  // TODO: Cần Edge Function admin-create-user (với service_role) để tạo tài khoản Supabase Auth thật từ Admin Dashboard.
  // Hiện tại: Chỉ lưu hồ sơ vào bảng nguoi_dung, KHÔNG lưu mật khẩu plaintext dưới bất kỳ hình thức nào.
  const addUser = async (newUser) => {
    const nextId = newUser.id || getNextMaxId('USR', usersList, 3);
    const roleLabel =
      newUser.role === 'admin'
        ? 'Quản trị viên'
        : newUser.role === 'staff'
        ? 'Nhân viên'
        : 'Khách tham quan';

    const createdUser = {
      id: nextId,
      name: newUser.name || newUser.email.split('@')[0],
      email: newUser.email,
      role: newUser.role || 'visitor',
      roleLabel: roleLabel,
      role_label: roleLabel,
      status: 'Hoạt động',
      avatar: newUser.avatar || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
      joined_at: new Date().toISOString().split('T')[0],
      joinedAt: new Date().toISOString().split('T')[0],
    };

    try {
      const { error: insertError } = await supabase.from('nguoi_dung').insert([{
        id: createdUser.id,
        name: createdUser.name,
        email: createdUser.email,
        role: createdUser.role,
        role_label: createdUser.role_label,
        status: createdUser.status,
        avatar: createdUser.avatar,
        joined_at: createdUser.joined_at,
      }]);

      if (insertError) {
        console.error('Lỗi tạo hồ sơ người dùng trên Supabase:', insertError);
        addToast(`Không thể tạo hồ sơ: ${insertError.message}`, 'error');
        return { success: false, message: insertError.message };
      }

      await refreshUsers();
      addToast(`Đã tạo hồ sơ "${createdUser.name}" (${createdUser.roleLabel}) thành công!`, 'success');
      await logAudit('CREATE_USER', `Tạo hồ sơ người dùng: ${createdUser.email}`);
      return { success: true, user: createdUser };
    } catch (err) {
      console.error('Lỗi ngoại lệ khi tạo hồ sơ người dùng:', err);
      addToast(`Lỗi kết nối: ${err.message}`, 'error');
      return { success: false, message: err.message };
    }
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

  // 14. Ticket Booking & Payment Verification
  const bookTicket = async (bookingData) => {
    const isCounterType = bookingData.paymentMethod === 'Thanh toán tại quầy' || bookingData.paymentOption === 'COUNTER' || bookingData.paymentMethod === 'counter';
    const datePrefix = (bookingData.visitDate || new Date().toISOString().split('T')[0]).replace(/-/g, '');
    const randSuffix = Math.random().toString(36).substring(2, 8).toUpperCase();
    const orderCode = isCounterType
      ? `MTQ-${datePrefix}-${randSuffix}`
      : generateOrderCode();

    const ticketCode = `TK-${Date.now().toString().slice(-6)}`;

    // Explicitly check unitPrice from ticketsList or bookingData.price
    let unitPrice = typeof bookingData.price === 'number' ? bookingData.price : 50000;
    const matchedType = ticketsList.find(
      (t) => t.name.toLowerCase() === (bookingData.ticketType || '').toLowerCase()
    );
    if (matchedType) {
      unitPrice = Number(matchedType.price);
    } else if (
      bookingData.ticketType?.includes('Miễn phí') ||
      bookingData.ticketType?.includes('Trẻ em') ||
      bookingData.ticketType?.includes('Người cao tuổi')
    ) {
      unitPrice = 0;
    }

    const qty = bookingData.quantity || 1;
    const total = unitPrice * qty;
    const isFree = total === 0;
    const isCounter = !isFree && isCounterType;
    const isOnlinePayment = !isFree && !isCounter;

    const initialStatus = isFree
      ? 'Đã xác nhận'
      : isCounter
      ? 'Chờ thanh toán tại quầy'
      : PAYMENT_STATUS.PENDING;

    const initialPaymentStatus = isFree
      ? 'Miễn phí'
      : isCounter
      ? 'pending'
      : PAYMENT_STATUS.PENDING;

    const paymentMethodLabel = isFree
      ? 'Miễn phí'
      : isCounter
      ? 'counter'
      : (bookingData.paymentMethod || 'online_qr');

    const paymentConfig = getPaymentConfig();
    const paymentQRUrl = isOnlinePayment
      ? generatePaymentQRUrl({
          amount: total,
          transferContent: orderCode,
        })
      : null;

    // Ký số bảo mật QR vé tham quan (Gọi Supabase Edge Function)
    const qrSecureRes = await requestSecureQRPayload(orderCode);
    const qrSig = qrSecureRes?.sig || '';
    const qrSecurePayload = qrSecureRes?.qrString || JSON.stringify({ order_code: orderCode, sig: qrSig });

    const ticketQRData = isFree
      ? JSON.stringify({
          ticketId: `BK-${Date.now()}`,
          bookingId: `BK-${Date.now()}`,
          orderCode: orderCode,
          ticketCode: ticketCode,
          visitDate: bookingData.visitDate,
          ticketType: bookingData.ticketType || 'Vé Trẻ em / Người cao tuổi – Miễn phí',
          name: bookingData.name.trim(),
          quantity: qty,
          totalPrice: 0,
          status: 'Vé Miễn Phí',
          sig: qrSig,
        })
      : isCounter
      ? qrSecurePayload
      : null;

    const expireAt = bookingData.visitDate
      ? `${bookingData.visitDate}T23:59:59Z`
      : new Date(Date.now() + 86400000).toISOString();

    const newBooking = {
      id: `BK-${Date.now()}`,
      ticketCode,
      orderCode,
      order_code: orderCode,
      userId: currentUser?.id || null,
      name: bookingData.name.trim(),
      phone: bookingData.phone.trim(),
      email: bookingData.email.trim(),
      ticketType: bookingData.ticketType || 'Vé Người lớn',
      price: unitPrice,
      quantity: qty,
      totalPrice: total,
      visitDate: bookingData.visitDate,
      visit_date: bookingData.visitDate,
      paymentMethod: paymentMethodLabel,
      payment_method: paymentMethodLabel,
      paymentStatus: initialPaymentStatus,
      payment_status: initialPaymentStatus,
      checkinStatus: 'not_checked_in',
      checkin_status: 'not_checked_in',
      status: initialStatus,
      paymentQRUrl,
      paymentConfig,
      createdAt: new Date().toISOString().split('T')[0],
      qrCode: ticketQRData,
      qrSignature: qrSig,
      qr_signature: qrSig,
      qrExpireAt: expireAt,
      qr_expire_at: expireAt,
      userEmail: currentUser?.email || bookingData.email.trim(),
    };

    setBookedTicketsList((prev) => [newBooking, ...prev]);

    try {
      await supabase.from('dat_ve').insert([
        {
          id: newBooking.id,
          ticket_code: newBooking.ticketCode,
          order_code: newBooking.orderCode,
          payment_ref: newBooking.orderCode,
          user_id: newBooking.userId,
          name: newBooking.name,
          phone: newBooking.phone,
          email: newBooking.email,
          ticket_type: newBooking.ticketType,
          price: newBooking.price,
          quantity: newBooking.quantity,
          total_price: newBooking.totalPrice,
          visit_date: newBooking.visitDate,
          payment_method: newBooking.paymentMethod,
          payment_status: newBooking.paymentStatus,
          checkin_status: newBooking.checkinStatus,
          status: newBooking.status,
          qr_code: newBooking.qrCode,
          qr_signature: newBooking.qrSignature,
          qr_expire_at: newBooking.qrExpireAt,
        },
      ]);

      if (isOnlinePayment) {
        await supabase.from('thanh_toan').insert([
          {
            id: `PAY-${Date.now()}`,
            booking_id: newBooking.id,
            order_code: newBooking.orderCode,
            amount: newBooking.totalPrice,
            payment_method: newBooking.paymentMethod,
            bank_id: paymentConfig.bankId,
            account_no: paymentConfig.accountNo,
            account_name: paymentConfig.accountName,
            transfer_content: newBooking.orderCode,
            status: newBooking.paymentStatus,
          },
        ]);
      }
    } catch (e) {
      console.warn('Supabase book ticket notice', e);
    }

    // Simulate sending ticket confirmation email
    sendTicketConfirmationEmail(newBooking);

    if (isFree) {
      addToast(`🎉 Đặt vé miễn phí thành công (${ticketCode})! Đã lưu vào mục "Vé của tôi".`, 'success');
      logAudit('BOOK_FREE_TICKET', `Vé miễn phí được cấp: ${orderCode} - ${newBooking.ticketType} (${qty} vé)`);
    } else if (isCounter) {
      addToast(`🏛️ Đặt vé thành công! Vui lòng thanh toán ${formatCurrency(total)} tại quầy vé khi đến.`, 'info');
      logAudit('BOOK_COUNTER_TICKET', `Đặt vé thanh toán tại quầy: ${orderCode} - ${newBooking.ticketType} (${qty} vé)`);
    } else {
      logAudit('BOOK_TICKET', `Khởi tạo đơn đặt vé online: ${orderCode} - ${newBooking.ticketType} (${qty} vé)`);
    }
    return { success: true, booking: newBooking };
  };

  // Staff Checkin API endpoint logic: POST /api/staff/orders/checkin
  const confirmStaffCounterCheckin = async (rawInput, staffUser) => {
    const parsed = parseQRPayload(rawInput);
    const searchCode = (parsed?.orderCode || rawInput || '').trim();
    const sigInput = parsed?.sig || '';

    const order = bookedTicketsList.find(
      (b) =>
        (b.orderCode && b.orderCode.toLowerCase() === searchCode.toLowerCase()) ||
        (b.order_code && b.order_code.toLowerCase() === searchCode.toLowerCase()) ||
        (b.ticketCode && b.ticketCode.toLowerCase() === searchCode.toLowerCase()) ||
        (b.id && b.id.toLowerCase() === searchCode.toLowerCase())
    );

    if (!order) {
      return {
        success: false,
        error: 'Mã đơn / Vé không tồn tại trong hệ thống bảo tàng!',
      };
    }

    // Security signature check if sig was provided (Server-side Edge Function Verification)
    if (sigInput) {
      const verifyRes = await verifyTicketQROnServer(order.orderCode || order.ticketCode, sigInput);
      if (!verifyRes.valid) {
        return {
          success: false,
          error: `🔴 CẢNH BÁO BẢO MẬT: ${verifyRes.message || 'Mã QR có dấu hiệu bị làm giả hoặc chữ ký mã hóa không hợp lệ!'}`,
        };
      }
    }

    // Check if already checked in
    if (order.checkin_status === 'checked_in' || order.checkinStatus === 'checked_in') {
      const time = order.checkin_at || order.checkinAt || 'trước đó';
      const staff = order.checked_in_by || order.checkedInBy || 'Nhân viên hệ thống';
      return {
        success: false,
        alreadyCheckedIn: true,
        order,
        error: `⚠️ ĐƠN VÉ NÀY ĐÃ ĐƯỢC CHECK-IN VÀO LÚC ${time} BỞI NHÂN VIÊN "${staff}". KHÔNG THỂ QUÉT LẠI!`,
      };
    }

    // Check if expired
    const todayStr = new Date().toISOString().split('T')[0];
    const visitDateStr = order.visitDate || order.visit_date;
    if (visitDateStr && visitDateStr < todayStr) {
      return {
        success: false,
        expired: true,
        order,
        error: `⚠️ RẤT TIẾC: Đơn vé đã quá hạn sử dụng (Ngày tham quan dự kiến: ${visitDateStr}).`,
      };
    }

    const nowIso = new Date().toISOString();
    const staffName = staffUser?.name || staffUser?.email || staffUser?.id || 'Nhân viên quầy vé';

    const updatedOrder = {
      ...order,
      paymentMethod: order.paymentMethod === 'Miễn phí' ? 'Miễn phí' : 'counter',
      payment_method: order.payment_method || 'counter',
      paymentStatus: 'paid',
      payment_status: 'paid',
      status: 'Đã thanh toán – Đã check-in',
      checkinStatus: 'checked_in',
      checkin_status: 'checked_in',
      checkinAt: nowIso,
      checkin_at: nowIso,
      checkedInBy: staffName,
      checked_in_by: staffName,
      paidAt: nowIso,
      paid_at: nowIso,
      confirmedBy: staffName,
      confirmed_by: staffName,
    };

    setBookedTicketsList((prev) =>
      prev.map((b) => (b.id === order.id ? updatedOrder : b))
    );

    try {
      await supabase
        .from('dat_ve')
        .update({
          payment_status: 'paid',
          checkin_status: 'checked_in',
          status: 'Đã thanh toán – Đã check-in',
          paid_at: nowIso,
          confirmed_by: staffName,
          checkin_at: nowIso,
          checked_in_by: staffName,
        })
        .eq('id', order.id);
    } catch (e) {
      console.warn('Supabase confirm staff checkin notice:', e);
    }

    addToast(`✅ Đã thu tiền & Check-in thành công đơn vé ${order.orderCode || order.ticketCode}!`, 'success');
    logAudit('STAFF_COUNTER_CHECKIN', `Nhân viên ${staffName} đã thu tiền & check-in vé ${order.orderCode || order.ticketCode}`);

    return {
      success: true,
      order: updatedOrder,
      message: 'Xác nhận đã thu tiền & Check-in vé thành công!',
    };
  };

  const resendTicketEmail = async (orderCode) => {
    const order = bookedTicketsList.find(
      (b) => b.orderCode === orderCode || b.order_code === orderCode || b.ticketCode === orderCode || b.id === orderCode
    );
    if (!order) {
      addToast('Không tìm thấy thông tin đơn vé!', 'error');
      return { success: false };
    }
    const res = await sendTicketConfirmationEmail(order);
    addToast(`📧 ${res.message}`, 'success');
    return res;
  };

  const getOrderDetailsByCode = (code) => {
    if (!code) return null;
    return bookedTicketsList.find(
      (b) =>
        (b.orderCode && b.orderCode.toLowerCase() === code.toLowerCase()) ||
        (b.order_code && b.order_code.toLowerCase() === code.toLowerCase()) ||
        (b.ticketCode && b.ticketCode.toLowerCase() === code.toLowerCase()) ||
        (b.id && b.id.toLowerCase() === code.toLowerCase())
    ) || null;
  };

  const confirmCounterPayment = async (bookingId) => {
    return confirmStaffCounterCheckin(bookingId, currentUser);
  };


  const verifyBookingPayment = async (bookingId, simulateFailure = false) => {
    // 1. Mark status as CHECKING in state
    setBookedTicketsList((prev) =>
      prev.map((b) =>
        b.id === bookingId || b.ticketCode === bookingId || b.orderCode === bookingId
          ? { ...b, paymentStatus: PAYMENT_STATUS.CHECKING, status: PAYMENT_STATUS.CHECKING }
          : b
      )
    );

    const currentBooking = bookedTicketsList.find(
      (b) => b.id === bookingId || b.ticketCode === bookingId || b.orderCode === bookingId
    );

    const orderCode = currentBooking?.orderCode || currentBooking?.ticketCode || bookingId;
    const amount = currentBooking?.totalPrice || 100000;

    // 2. Call payment service verification
    const result = await verifyPayment({ orderCode, amount, simulateFailure });

    if (result.success) {
      const paidAt = result.paidAt || new Date().toISOString();
      const ticketQR = JSON.stringify({
        ticketId: currentBooking?.id || bookingId,
        bookingId: currentBooking?.id || bookingId,
        orderCode: orderCode,
        ticketCode: currentBooking?.ticketCode || orderCode,
        visitDate: currentBooking?.visitDate,
        ticketType: currentBooking?.ticketType,
        name: currentBooking?.name,
        quantity: currentBooking?.quantity || 1,
        totalPrice: amount,
        status: 'Đã thanh toán',
      });

      let updatedBooking = null;

      setBookedTicketsList((prev) =>
        prev.map((b) => {
          if (b.id === bookingId || b.ticketCode === bookingId || b.orderCode === bookingId) {
            updatedBooking = {
              ...b,
              paymentStatus: PAYMENT_STATUS.SUCCESS,
              status: 'Đã thanh toán',
              paidAt,
              transactionRef: result.transactionRef,
              qrCode: ticketQR,
            };
            return updatedBooking;
          }
          return b;
        })
      );

      // Sync Supabase
      try {
        await supabase
          .from('dat_ve')
          .update({
            payment_status: PAYMENT_STATUS.SUCCESS,
            status: 'Đã thanh toán',
            paid_at: paidAt,
            qr_code: ticketQR,
          })
          .eq('id', currentBooking?.id || bookingId);

        await supabase
          .from('thanh_toan')
          .update({
            status: PAYMENT_STATUS.SUCCESS,
            transaction_ref: result.transactionRef,
            paid_at: paidAt,
          })
          .eq('booking_id', currentBooking?.id || bookingId);

        await supabase.from('ve_dientu').insert([
          {
            id: `TKT-${Date.now()}`,
            booking_id: currentBooking?.id || bookingId,
            ticket_code: currentBooking?.ticketCode || orderCode,
            ticket_type: currentBooking?.ticketType || 'Vé tham quan',
            visit_date: currentBooking?.visitDate || new Date().toISOString().split('T')[0],
            visitor_name: currentBooking?.name || 'Khách',
            status: 'Có hiệu lực',
            qr_ticket_data: ticketQR,
          },
        ]);
      } catch (e) {
        console.warn('Supabase verify payment update notice', e);
      }

      addToast(`🎉 Thanh toán thành công đơn hàng ${orderCode}! Vé điện tử QR đã được tạo.`, 'success');
      logAudit('PAYMENT_SUCCESS', `Thanh toán thành công đơn hàng: ${orderCode} (${result.transactionRef})`);
      return { success: true, booking: updatedBooking, result };
    } else {
      setBookedTicketsList((prev) =>
        prev.map((b) =>
          b.id === bookingId || b.ticketCode === bookingId || b.orderCode === bookingId
            ? { ...b, paymentStatus: PAYMENT_STATUS.FAILED, status: 'Thanh toán thất bại' }
            : b
        )
      );

      try {
        await supabase
          .from('dat_ve')
          .update({
            payment_status: PAYMENT_STATUS.FAILED,
            status: 'Thanh toán thất bại',
          })
          .eq('id', currentBooking?.id || bookingId);
      } catch (e) {
        console.warn('Supabase verify payment failure update notice', e);
      }

      addToast(result.message || 'Thanh toán thất bại!', 'error');
      logAudit('PAYMENT_FAILED', `Thanh toán thất bại đơn hàng: ${orderCode}`);
      return { success: false, message: result.message, result };
    }
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

    const nextId = getNextMaxId('REV', reviewsList, 3);
    const newReview = {
      id: nextId,
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

  // 16. Exhibitions (Đồng bộ trực tiếp Supabase)
  const addExhibition = async (exhibition) => {
    const nextId = exhibition.id || getNextMaxId('EX', exhibitionsList, 3);
    const created = {
      ...exhibition,
      id: nextId,
    };

    try {
      const { error } = await supabase.from('trien_lam').insert([{
        id: created.id,
        name: created.name,
        status: created.status || 'Đang diễn ra',
        start_date: created.startDate || created.start_date,
        end_date: created.endDate || created.end_date,
        location: created.location,
        image: created.image,
        description: created.description,
        artifacts_count: created.artifactsCount || 0,
        visitors_count: created.visitorsCount || 0,
      }]);

      if (error) {
        console.error('Lỗi khi thêm triển lãm lên Supabase:', error);
        addToast(`Lỗi thêm triển lãm: ${error.message}`, 'error');
        return null;
      }
    } catch (e) {
      console.warn('Lỗi kết nối triển lãm:', e);
    }

    setExhibitionsList((prev) => [created, ...prev]);
    addToast('Đã thêm triển lãm mới thành công!', 'success');
    return created;
  };

  const updateExhibition = async (id, data) => {
    try {
      const { error } = await supabase.from('trien_lam').update({
        name: data.name,
        status: data.status,
        start_date: data.startDate || data.start_date,
        end_date: data.endDate || data.end_date,
        location: data.location,
        image: data.image,
        description: data.description,
      }).eq('id', id);

      if (error) {
        console.error('Lỗi khi cập nhật triển lãm trên Supabase:', error);
        addToast(`Lỗi cập nhật: ${error.message}`, 'error');
        return;
      }
    } catch (e) {
      console.warn('Lỗi kết nối cập nhật triển lãm:', e);
    }

    setExhibitionsList((prev) =>
      prev.map((e) => (e.id === id ? { ...e, ...data } : e))
    );
    addToast('Đã cập nhật triển lãm thành công!', 'success');
  };

  const deleteExhibition = async (id) => {
    try {
      const { error } = await supabase.from('trien_lam').delete().eq('id', id);
      if (error) {
        console.error('Lỗi khi xóa triển lãm trên Supabase:', error);
        addToast(`Lỗi xóa triển lãm: ${error.message}`, 'error');
        return;
      }
    } catch (e) {
      console.warn('Lỗi kết nối xóa triển lãm:', e);
    }

    setExhibitionsList((prev) => prev.filter((e) => e.id !== id));
    addToast('Đã xóa triển lãm thành công!', 'info');
  };

  // 17. Tickets Types CRUD (Đồng bộ trực tiếp Supabase)
  const addTicketType = async (ticket) => {
    const nextId = ticket.id || getNextMaxId('TK', ticketsList, 3);
    const created = {
      ...ticket,
      id: nextId,
    };

    try {
      const { error } = await supabase.from('ve_tham_quan').insert([{
        id: created.id,
        name: created.name,
        price: created.price || 0,
        description: created.description,
        active: created.active !== false,
      }]);

      if (error) {
        console.error('Lỗi khi thêm loại vé lên Supabase:', error);
        addToast(`Lỗi thêm loại vé: ${error.message}`, 'error');
        return null;
      }
    } catch (e) {
      console.warn('Lỗi kết nối thêm vé:', e);
    }

    setTicketsList((prev) => [...prev, created]);
    addToast('Đã thêm loại vé mới thành công!', 'success');
    return created;
  };

  const updateTicketType = async (id, data) => {
    try {
      const { error } = await supabase.from('ve_tham_quan').update({
        name: data.name,
        price: data.price,
        description: data.description,
        active: data.active,
      }).eq('id', id);

      if (error) {
        console.error('Lỗi khi cập nhật loại vé trên Supabase:', error);
        addToast(`Lỗi cập nhật: ${error.message}`, 'error');
        return;
      }
    } catch (e) {
      console.warn('Lỗi kết nối cập nhật vé:', e);
    }

    setTicketsList((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...data } : t))
    );
    addToast('Đã cập nhật loại vé thành công!', 'success');
  };

  const deleteTicketType = async (id) => {
    try {
      const { error } = await supabase.from('ve_tham_quan').delete().eq('id', id);
      if (error) {
        console.error('Lỗi khi xóa loại vé trên Supabase:', error);
        addToast(`Lỗi xóa loại vé: ${error.message}`, 'error');
        return;
      }
    } catch (e) {
      console.warn('Lỗi kết nối xóa vé:', e);
    }

    setTicketsList((prev) => prev.filter((t) => t.id !== id));
    addToast('Đã xóa loại vé thành công!', 'info');
  };

  // 18. Galleries / Thematic Exhibitions (Trưng bày chuyên đề - phong_trung_bay)
  const addGallery = async (gallery) => {
    const nextId = gallery.id || getNextMaxId('TBCD', galleriesList, 2);
    const created = {
      ...gallery,
      id: nextId,
      image: gallery.image || '/images/museum-hero.jpg',
      status: gallery.status || 'Đang diễn ra',
      location: gallery.location || 'Bảo tàng Lịch sử Quốc gia – Số 1 Tràng Tiền / 216 Trần Quang Khải, Hà Nội',
      sourceUrl: gallery.sourceUrl || 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
      sourceNote: gallery.sourceNote || '',
      detailedContent: gallery.detailedContent || gallery.description,
      galleryImages: gallery.galleryImages || (gallery.image ? [gallery.image] : ['/images/museum-hero.jpg']),
      highlightArtifacts: gallery.highlightArtifacts || [],
    };

    try {
      const { error } = await supabase.from('phong_trung_bay').insert([{
        id: created.id,
        name: created.name,
        description: created.description,
        status: created.status,
        start_date: created.startDate || created.start_date || null,
        end_date: created.endDate || created.end_date || null,
        location: created.location,
        source_url: created.sourceUrl,
        source_note: created.sourceNote,
        detailed_content: created.detailedContent,
        image: created.image,
        gallery_images: created.galleryImages,
        highlight_artifacts: created.highlightArtifacts,
      }]);

      if (error) {
        console.error('Lỗi khi thêm trưng bày chuyên đề lên Supabase:', error);
        addToast(`Lỗi thêm trưng bày: ${error.message}`, 'error');
        return null;
      }
    } catch (e) {
      console.warn('Lỗi kết nối trưng bày chuyên đề:', e);
    }

    setGalleriesList((prev) => [created, ...prev]);
    addToast('Đã thêm trưng bày chuyên đề mới thành công!', 'success');
    logAudit('CREATE_GALLERY', `Thêm trưng bày chuyên đề: ${created.name} (${created.id})`);
    return created;
  };

  const updateGallery = async (id, data) => {
    try {
      const { error } = await supabase.from('phong_trung_bay').update({
        name: data.name,
        description: data.description,
        status: data.status,
        start_date: data.startDate || data.start_date || null,
        end_date: data.endDate || data.end_date || null,
        location: data.location,
        source_url: data.sourceUrl || data.source_url,
        source_note: data.sourceNote !== undefined ? data.sourceNote : data.source_note,
        detailed_content: data.detailedContent || data.detailed_content,
        image: data.image,
        gallery_images: data.galleryImages || data.gallery_images,
        highlight_artifacts: data.highlightArtifacts || data.highlight_artifacts,
      }).eq('id', id);

      if (error) {
        console.error('Lỗi khi cập nhật trưng bày trên Supabase:', error);
        addToast(`Lỗi cập nhật: ${error.message}`, 'error');
        return;
      }
    } catch (e) {
      console.warn('Lỗi kết nối cập nhật trưng bày:', e);
    }

    setGalleriesList((prev) =>
      prev.map((g) => (g.id === id ? { ...g, ...data } : g))
    );
    addToast('Đã cập nhật trưng bày chuyên đề thành công!', 'success');
    logAudit('UPDATE_GALLERY', `Cập nhật trưng bày: ${data.name || id}`);
  };

  const deleteGallery = async (id) => {
    try {
      const { error } = await supabase.from('phong_trung_bay').delete().eq('id', id);
      if (error) {
        console.error('Lỗi khi xóa trưng bày trên Supabase:', error);
        addToast(`Lỗi xóa trưng bày: ${error.message}`, 'error');
        return;
      }
    } catch (e) {
      console.warn('Lỗi kết nối xóa trưng bày:', e);
    }

    setGalleriesList((prev) => prev.filter((g) => g.id !== id));
    addToast('Đã xóa trưng bày chuyên đề thành công!', 'info');
    logAudit('DELETE_GALLERY', `Xóa trưng bày mã: ${id}`);
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
        usersLoading,
        fetchUsersFromSupabase,
        refreshUsers,
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

        // Exhibitions (Triển lãm)
        exhibitions: exhibitionsList,
        addExhibition,
        updateExhibition,
        deleteExhibition,

        // Galleries (Trưng bày chuyên đề - phong_trung_bay)
        galleries: galleriesList,
        addGallery,
        updateGallery,
        deleteGallery,

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
        verifyBookingPayment,
        confirmCounterPayment,
        confirmStaffCounterCheckin,
        getOrderDetailsByCode,
        resendTicketEmail,
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
