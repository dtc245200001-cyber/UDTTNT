# Hướng Dẫn Quản Lý Database & Migration - Supabase

Tài liệu hướng dẫn cấu trúc, thứ tự thực thi và quy chuẩn đặt tên migration cho Cơ sở dữ liệu Bảo tàng Quốc gia Việt Nam (Supabase PostgreSQL).

---

## 1. Cấu Trúc Các File Migration Chuẩn Hiện Hành

| Thứ tự | File Migration | Mục đích |
| :---: | :--- | :--- |
| **01** | `supabase/migration_current.sql` | **Bản Canonical gốc**: Khởi tạo toàn bộ Schemas, 10 bảng dữ liệu quan hệ, pgvector extension, HNSW indexes, RPC `match_hien_vat`, seed 13 danh mục (`DM01`–`DM13`) và 270 hiện vật chuẩn hóa. |
| **02** | `supabase/migration_security_hardening.sql` | **Vá Bảo mật & RLS**: Thêm liên kết `auth_user_id UUID` cho `nguoi_dung`, bảng `audit_logs` bất biến, Trigger tự động đồng bộ tài khoản `auth.users` &rarr; `public.nguoi_dung`, và toàn bộ Policies RLS chặt chẽ theo vai trò (RBAC). |

---

## 2. Thứ Tự Chạy Khi Khởi Tạo Dự Án Mới Trên Supabase

Khi cài đặt trên một Supabase project mới hoặc reset database, chạy tuần tự trong **SQL Editor**:

1. **Bước 1**: Mở và chạy `supabase/migration_current.sql` để tạo toàn bộ bảng và nạp 270 hiện vật.
2. **Bước 2**: Mở và chạy `supabase/migration_security_hardening.sql` để thiết lập cơ chế bảo mật, trigger đồng bộ user và chính sách RLS.

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

Thư mục `supabase/archive/` chứa các script phụ trợ, công cụ migrate dữ liệu 1 lần (one-off scripts) và bản backup trong quá trình chuẩn hóa danh mục từ `CAT01-CAT08` sang `DM01-DM13`. Không chạy lại các file trong thư mục này trừ khi cần đối chiếu lịch sử.
