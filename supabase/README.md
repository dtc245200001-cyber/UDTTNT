# Hướng Dẫn Quản Lý Database & Migration - Supabase

Tài liệu hướng dẫn cấu trúc, thứ tự thực thi và quy chuẩn đặt tên migration cho Cơ sở dữ liệu Bảo tàng Quốc gia Việt Nam (Supabase PostgreSQL).

---

## 1. Cấu Trúc Các File Migration Chuẩn Hiện Hành

| Thứ tự | File Migration | Mục đích |
| :---: | :--- | :--- |
| **01** | `supabase/migration_current.sql` | **Bản Baseline Hoàn Chỉnh Duy Nhất**: Khởi tạo toàn bộ Schemas, 10 bảng dữ liệu quan hệ, pgvector, HNSW indexes, RPC. Chứa Seed 13 danh mục, 270 hiện vật. Bao gồm RLS đã được **vá lỗ hổng bảo mật hoàn chỉnh** và các Trigger đồng bộ quyền. |

---

## 2. Hướng Dẫn Chạy Khi Khởi Tạo Dự Án Mới Trên Supabase

Khi cài đặt trên một Supabase project mới hoặc reset database, bạn chỉ cần thực hiện **đúng 1 bước duy nhất**:

1. Mở và chạy file `supabase/migration_current.sql` trong **SQL Editor**. (Không chạy lại trên production đã có data thật).

---

## 3. Quy Ước Đặt Tên Cho Các Migration Mới Sau Này

Để tránh tình trạng trùng lặp nhiều file gây nhầm lẫn:
- Mọi thay đổi schema mới sau này cần được đặt tên theo định dạng:
  ```
  supabase/migrations/YYYYMMDD_mo_ta_ngan_gon.sql
  ```
  *Ví dụ:* `supabase/migrations/20260907_them_bang_audio_guide.sql`
- File migration mới phải đảm bảo tính **Idempotent** (sử dụng `IF NOT EXISTS`, `CREATE OR REPLACE`, và `DROP POLICY IF EXISTS` trước khi tạo policy).

---

## 4. Thư Mục Lưu Trữ Lịch Sử (`supabase/archive/`)

Thư mục `supabase/archive/` chứa:
- Các file migration trung gian (vd: `migration_security_hardening.sql`, `migration_fix_roles_and_permissions.sql`, v.v.) đã được **gộp vào baseline** `migration_current.sql` để tránh việc lỡ tay chạy đè lại các bản cũ chứa lỗ hổng (điển hình là lỗ hổng bypass `anon` insert Role).
- Các script phụ trợ, công cụ migrate dữ liệu 1 lần. 
**TUYỆT ĐỐI KHÔNG chạy lại** các file trong thư mục này trừ khi cần đối chiếu lịch sử.
