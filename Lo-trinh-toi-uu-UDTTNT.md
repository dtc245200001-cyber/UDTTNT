# Lộ Trình Tối Ưu & Hoàn Thiện Hệ Thống Bảo Tàng UDTTNT

Tài liệu theo dõi tiến độ thực hiện theo từng giai đoạn chuẩn kỹ thuật và bảo mật:

---

### Giai đoạn 1: Bảo mật (Ưu tiên tuyệt đối)
- [x] **1.1 Chặn user tự nâng quyền admin qua RLS trigger** (`supabase/migration_fix_role_escalation.sql`)
- [ ] **1.2 Sửa fallback QR mặc định-chấp-nhận (Chuyển sang cơ chế Fail-Closed)**
- [ ] **1.3 Dọn mật khẩu plaintext và chuẩn hóa role trong seed data**

---

### Giai đoạn 2: Lỗi chức năng & Đồng bộ dữ liệu
- [x] **2.1 Đồng bộ thật quản lý User lên Supabase (CRUD người dùng qua API)**
- [ ] **2.2 Sinh ID phía server (Postgres DEFAULT / Sequence thay vì client-side)**
- [ ] **2.3 Không nuốt lỗi Supabase âm thầm (Xử lý và hiển thị thông báo lỗi rõ ràng)**
- [ ] **2.4 Chuyển bộ lọc từ cấm lên server (Database Trigger / Constraint)**

---

### Giai đoạn 3: Kiến trúc & Chuẩn hóa mã nguồn
- [ ] **3.1 Tách AppContext thành các Context / Custom Hooks nhỏ chuyên biệt**
- [ ] **3.2 Thêm cấu hình ESLint chuẩn**
- [ ] **3.3 Dọn dẹp console.log và console.warn rải rác**

---

### Giai đoạn 4: Hiệu năng & Tối ưu hóa Bundle
- [ ] **4.1 Phân trang Supabase (Pagination cho bảng hiện vật & tin tức)**
- [ ] **4.2 Tối ưu bundle: loại bỏ dữ liệu tĩnh 270 hiện vật khỏi bundle chính của Vite**
- [ ] **4.3 Dọn dẹp các tài nguyên ảnh/file nặng khỏi Git history**
