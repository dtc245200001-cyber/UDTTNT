-- ====================================================================
-- BẢO TÀNG QUỐC GIA VIỆT NAM - SECURITY HARDENING MIGRATION SCRIPT
-- File: supabase/migration_security_hardening.sql
-- Mục đích:
--   1. Thêm liên kết auth.users (auth_user_id) vào bảng nguoi_dung
--   2. Tạo bảng audit_logs lưu vết tập trung (Postgres) với tính bất biến
--   3. Tạo các hàm SQL Helper phân quyền vai trò (Role-Based Access Control)
--   4. Viết lại toàn bộ Row Level Security (RLS) theo vai trò thật
-- ====================================================================

-- 1. CẬP NHẬT BẢNG NGUOI_DUNG ĐỂ LIÊN KẾT SUPABASE AUTH (auth.users)
-- Thêm cột auth_user_id kiểu UUID trỏ tới auth.users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nguoi_dung' AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE nguoi_dung ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_nguoi_dung_auth_user_id ON nguoi_dung(auth_user_id);
    END IF;
END $$;

-- 1.1 TỰ ĐỘNG ĐỒNG BỘ MỌI TÀI KHOẢN TẠO TỪ AUTH.USERS SANG PUBLIC.NGUOI_DUNG
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT := 'visitor';
    user_role_label TEXT := 'Khách tham quan';
    user_name TEXT;
BEGIN
    -- Xác định vai trò dựa trên email hoặc metadata
    IF NEW.email = 'admin@gmail.com' OR (NEW.raw_user_meta_data->>'role') = 'admin' THEN
        user_role := 'admin';
        user_role_label := 'Quản trị viên';
    ELSIF (NEW.raw_user_meta_data->>'role') = 'staff' THEN
        user_role := 'staff';
        user_role_label := 'Nhân viên';
    END IF;

    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

    -- Tự động thêm hoặc cập nhật hồ sơ trong bảng nguoi_dung
    INSERT INTO public.nguoi_dung (
        id,
        auth_user_id,
        email,
        name,
        role,
        role_label,
        status,
        avatar,
        joined_at
    )
    VALUES (
        'USR' || substring(NEW.id::text from 1 for 6),
        NEW.id,
        NEW.email,
        user_name,
        user_role,
        user_role_label,
        'Hoạt động',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        CURRENT_DATE
    )
    ON CONFLICT (email) DO UPDATE
    SET 
        auth_user_id = EXCLUDED.auth_user_id,
        role = CASE WHEN public.nguoi_dung.role = 'admin' THEN 'admin' ELSE EXCLUDED.role END,
        role_label = CASE WHEN public.nguoi_dung.role = 'admin' THEN 'Quản trị viên' ELSE EXCLUDED.role_label END;

    RETURN NEW;
END;
$$;

-- Gắn Trigger lắng nghe sự kiện tạo user mới trong auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Đồng bộ ngay lập tức toàn bộ các user hiện đang có trong auth.users sang bảng nguoi_dung
INSERT INTO public.nguoi_dung (
    id,
    auth_user_id,
    email,
    name,
    role,
    role_label,
    status,
    avatar,
    joined_at
)
SELECT 
    'USR' || substring(u.id::text from 1 for 6),
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    CASE WHEN u.email = 'admin@gmail.com' THEN 'admin' ELSE 'visitor' END,
    CASE WHEN u.email = 'admin@gmail.com' THEN 'Quản trị viên' ELSE 'Khách tham quan' END,
    'Hoạt động',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    CURRENT_DATE
FROM auth.users u
ON CONFLICT (email) DO UPDATE
SET auth_user_id = EXCLUDED.auth_user_id;

-- 2. TẠO BẢNG AUDIT_LOGS LƯU NHẬT KÝ BẤT BIẾN TRÊN POSTGRESQL
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) REFERENCES nguoi_dung(id) ON DELETE SET NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tối ưu truy vấn logs theo thời gian và người dùng
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_auth_user ON audit_logs(auth_user_id);

-- 3. CÁC HÀM HELPER XÁC THỰC VAI TRÒ (RBAC FUNCTIONS)
-- Hàm lấy role thật của user đang thực hiện request (admin / staff / visitor)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (
            SELECT role 
            FROM nguoi_dung 
            WHERE auth_user_id = auth.uid() 
               OR email = (auth.jwt() ->> 'email')
            LIMIT 1
        ),
        'visitor'
    );
$$;

-- Hàm kiểm tra xem user hiện tại có phải là Quản trị viên (Admin) hay không
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT get_current_user_role() = 'admin';
$$;

-- Hàm kiểm tra xem user hiện tại có phải là Nhân viên soát vé / Quản trị viên hay không
CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT get_current_user_role() IN ('admin', 'staff');
$$;

-- 4. VIẾT LẠI ROW LEVEL SECURITY (RLS) THEO PHÂN QUYỀN CHẶT CHẼ
-- Bật RLS trên toàn bộ các bảng
ALTER TABLE danh_muc ENABLE ROW LEVEL SECURITY;
ALTER TABLE phong_trung_bay ENABLE ROW LEVEL SECURITY;
ALTER TABLE hien_vat ENABLE ROW LEVEL SECURITY;
ALTER TABLE trien_lam ENABLE ROW LEVEL SECURITY;
ALTER TABLE su_kien ENABLE ROW LEVEL SECURITY;
ALTER TABLE ve_tham_quan ENABLE ROW LEVEL SECURITY;
ALTER TABLE bai_viet ENABLE ROW LEVEL SECURITY;
ALTER TABLE nguoi_dung ENABLE ROW LEVEL SECURITY;
ALTER TABLE dat_ve ENABLE ROW LEVEL SECURITY;
ALTER TABLE dang_ky_su_kien ENABLE ROW LEVEL SECURITY;
ALTER TABLE danh_gia ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4.1 Xóa sạch các policy cũ mở toang (FOR ALL USING true)
DROP POLICY IF EXISTS "Public read danh_muc" ON danh_muc;
DROP POLICY IF EXISTS "Public read phong_trung_bay" ON phong_trung_bay;
DROP POLICY IF EXISTS "Public read hien_vat" ON hien_vat;
DROP POLICY IF EXISTS "Public read trien_lam" ON trien_lam;
DROP POLICY IF EXISTS "Public read su_kien" ON su_kien;
DROP POLICY IF EXISTS "Public read ve_tham_quan" ON ve_tham_quan;
DROP POLICY IF EXISTS "Public read bai_viet" ON bai_viet;
DROP POLICY IF EXISTS "Public read danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "Public read nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "Public read dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "Public read dang_ky_su_kien" ON dang_ky_su_kien;

DROP POLICY IF EXISTS "Public insert/update hien_vat" ON hien_vat;
DROP POLICY IF EXISTS "Public insert/update danh_muc" ON danh_muc;
DROP POLICY IF EXISTS "Public insert/update trien_lam" ON trien_lam;
DROP POLICY IF EXISTS "Public insert/update su_kien" ON su_kien;
DROP POLICY IF EXISTS "Public insert/update ve_tham_quan" ON ve_tham_quan;
DROP POLICY IF EXISTS "Public insert/update nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "Public insert/update danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "Public insert/update dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "Public insert/update dang_ky_su_kien" ON dang_ky_su_kien;
DROP POLICY IF EXISTS "Public insert/update bai_viet" ON bai_viet;

-- Xóa các policy của đợt hardening trước (nếu chạy lại)
DROP POLICY IF EXISTS "allow_public_select_danh_muc" ON danh_muc;
DROP POLICY IF EXISTS "allow_admin_modify_danh_muc" ON danh_muc;

DROP POLICY IF EXISTS "allow_public_select_phong_trung_bay" ON phong_trung_bay;
DROP POLICY IF EXISTS "allow_admin_modify_phong_trung_bay" ON phong_trung_bay;

DROP POLICY IF EXISTS "allow_public_select_hien_vat" ON hien_vat;
DROP POLICY IF EXISTS "allow_admin_modify_hien_vat" ON hien_vat;

DROP POLICY IF EXISTS "allow_public_select_trien_lam" ON trien_lam;
DROP POLICY IF EXISTS "allow_admin_modify_trien_lam" ON trien_lam;

DROP POLICY IF EXISTS "allow_public_select_su_kien" ON su_kien;
DROP POLICY IF EXISTS "allow_admin_modify_su_kien" ON su_kien;

DROP POLICY IF EXISTS "allow_public_select_ve_tham_quan" ON ve_tham_quan;
DROP POLICY IF EXISTS "allow_admin_modify_ve_tham_quan" ON ve_tham_quan;

DROP POLICY IF EXISTS "allow_public_select_bai_viet" ON bai_viet;
DROP POLICY IF EXISTS "allow_admin_modify_bai_viet" ON bai_viet;

DROP POLICY IF EXISTS "allow_select_nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "allow_insert_nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "allow_update_nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "allow_admin_delete_nguoi_dung" ON nguoi_dung;

DROP POLICY IF EXISTS "allow_select_dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "allow_insert_dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "allow_update_dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "allow_delete_dat_ve" ON dat_ve;

DROP POLICY IF EXISTS "allow_select_dang_ky_su_kien" ON dang_ky_su_kien;
DROP POLICY IF EXISTS "allow_insert_dang_ky_su_kien" ON dang_ky_su_kien;
DROP POLICY IF EXISTS "allow_admin_modify_dang_ky_su_kien" ON dang_ky_su_kien;

DROP POLICY IF EXISTS "allow_public_select_danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "allow_insert_danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "allow_author_or_admin_modify_danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "allow_author_or_admin_delete_danh_gia" ON danh_gia;

DROP POLICY IF EXISTS "allow_admin_select_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "allow_authenticated_insert_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "allow_insert_audit_logs" ON audit_logs;

-- ====================================================================
-- 4.2 THIẾT LẬP CÁC POLICY CHẶT CHẼ THEO ĐÚNG TỪNG NHÓM BẢNG
-- ====================================================================

-- [NHÓM 1: CÁC BẢNG NỘI DUNG CÔNG KHAI] (danh_muc, phong_trung_bay, hien_vat, trien_lam, su_kien, ve_tham_quan, bai_viet)
-- Nguyên tắc: Mọi người (kể cả khách chưa đăng nhập) được SELECT. Chỉ Admin mới được INSERT / UPDATE / DELETE.

-- Danh mục
DROP POLICY IF EXISTS "allow_public_select_danh_muc" ON danh_muc;
CREATE POLICY "allow_public_select_danh_muc" ON danh_muc FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_danh_muc" ON danh_muc;
CREATE POLICY "allow_admin_modify_danh_muc" ON danh_muc FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Phòng trưng bày
DROP POLICY IF EXISTS "allow_public_select_phong_trung_bay" ON phong_trung_bay;
CREATE POLICY "allow_public_select_phong_trung_bay" ON phong_trung_bay FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_phong_trung_bay" ON phong_trung_bay;
CREATE POLICY "allow_admin_modify_phong_trung_bay" ON phong_trung_bay FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Hiện vật (Cực kỳ quan trọng: Ngăn chặn tuyệt đối việc Visitor thêm/sửa/xóa cổ vật)
DROP POLICY IF EXISTS "allow_public_select_hien_vat" ON hien_vat;
CREATE POLICY "allow_public_select_hien_vat" ON hien_vat FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_hien_vat" ON hien_vat;
CREATE POLICY "allow_admin_modify_hien_vat" ON hien_vat FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Triển lãm
DROP POLICY IF EXISTS "allow_public_select_trien_lam" ON trien_lam;
CREATE POLICY "allow_public_select_trien_lam" ON trien_lam FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_trien_lam" ON trien_lam;
CREATE POLICY "allow_admin_modify_trien_lam" ON trien_lam FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Sự kiện
DROP POLICY IF EXISTS "allow_public_select_su_kien" ON su_kien;
CREATE POLICY "allow_public_select_su_kien" ON su_kien FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_su_kien" ON su_kien;
CREATE POLICY "allow_admin_modify_su_kien" ON su_kien FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Loại vé tham quan
DROP POLICY IF EXISTS "allow_public_select_ve_tham_quan" ON ve_tham_quan;
CREATE POLICY "allow_public_select_ve_tham_quan" ON ve_tham_quan FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_ve_tham_quan" ON ve_tham_quan;
CREATE POLICY "allow_admin_modify_ve_tham_quan" ON ve_tham_quan FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Bài viết tin tức
DROP POLICY IF EXISTS "allow_public_select_bai_viet" ON bai_viet;
CREATE POLICY "allow_public_select_bai_viet" ON bai_viet FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_bai_viet" ON bai_viet;
CREATE POLICY "allow_admin_modify_bai_viet" ON bai_viet FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());


-- [NHÓM 2: BẢNG NGƯỜI DÙNG (nguoi_dung)]
-- Nguyên tắc: 
-- - User chỉ xem/sửa hồ sơ của chính mình (auth_user_id = auth.uid() hoặc email trùng JWT).
-- - Admin được xem và chỉnh sửa tất cả.
-- - Chỉ Admin mới có quyền xóa tài khoản.
-- - Cho phép INSERT khi đăng ký tài khoản mới.
DROP POLICY IF EXISTS "allow_select_nguoi_dung" ON nguoi_dung;
CREATE POLICY "allow_select_nguoi_dung" ON nguoi_dung FOR SELECT
    USING (
        auth_user_id = auth.uid() 
        OR email = (auth.jwt() ->> 'email')
        OR is_admin()
    );

DROP POLICY IF EXISTS "allow_insert_nguoi_dung" ON nguoi_dung;
CREATE POLICY "allow_insert_nguoi_dung" ON nguoi_dung FOR INSERT
    WITH CHECK (
        auth_user_id = auth.uid()
        OR email = (auth.jwt() ->> 'email')
        OR is_admin()
        OR auth.role() = 'anon'
    );

DROP POLICY IF EXISTS "allow_update_nguoi_dung" ON nguoi_dung;
CREATE POLICY "allow_update_nguoi_dung" ON nguoi_dung FOR UPDATE
    USING (
        auth_user_id = auth.uid() 
        OR email = (auth.jwt() ->> 'email')
        OR is_admin()
    )
    WITH CHECK (
        auth_user_id = auth.uid() 
        OR email = (auth.jwt() ->> 'email')
        OR is_admin()
    );

DROP POLICY IF EXISTS "allow_admin_delete_nguoi_dung" ON nguoi_dung;
CREATE POLICY "allow_admin_delete_nguoi_dung" ON nguoi_dung FOR DELETE
    USING (is_admin());


-- [NHÓM 3: BẢNG ĐẶT VÉ (dat_ve)]
-- Nguyên tắc:
-- - User xem vé của chính mình (theo email hoặc user_id).
-- - Staff và Admin xem được toàn bộ danh sách vé để quét QR và soát vé.
-- - Bất kỳ ai (Khách vãng lai lẫn User đã đăng nhập) đều được tạo đơn đặt vé mới.
-- - Staff và Admin được cập nhật trạng thái (checkin, xác nhận thu tiền).
DROP POLICY IF EXISTS "allow_select_dat_ve" ON dat_ve;
CREATE POLICY "allow_select_dat_ve" ON dat_ve FOR SELECT
    USING (
        email = (auth.jwt() ->> 'email')
        OR user_id IN (SELECT id FROM nguoi_dung WHERE auth_user_id = auth.uid())
        OR is_staff_or_admin()
    );

DROP POLICY IF EXISTS "allow_insert_dat_ve" ON dat_ve;
CREATE POLICY "allow_insert_dat_ve" ON dat_ve FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "allow_update_dat_ve" ON dat_ve;
CREATE POLICY "allow_update_dat_ve" ON dat_ve FOR UPDATE
    USING (is_staff_or_admin())
    WITH CHECK (is_staff_or_admin());

DROP POLICY IF EXISTS "allow_delete_dat_ve" ON dat_ve;
CREATE POLICY "allow_delete_dat_ve" ON dat_ve FOR DELETE
    USING (is_admin());


-- [NHÓM 4: BẢNG ĐĂNG KÝ SỰ KIỆN (dang_ky_su_kien)]
DROP POLICY IF EXISTS "allow_select_dang_ky_su_kien" ON dang_ky_su_kien;
CREATE POLICY "allow_select_dang_ky_su_kien" ON dang_ky_su_kien FOR SELECT
    USING (
        email = (auth.jwt() ->> 'email')
        OR user_id IN (SELECT id FROM nguoi_dung WHERE auth_user_id = auth.uid())
        OR is_staff_or_admin()
    );

DROP POLICY IF EXISTS "allow_insert_dang_ky_su_kien" ON dang_ky_su_kien;
CREATE POLICY "allow_insert_dang_ky_su_kien" ON dang_ky_su_kien FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "allow_admin_modify_dang_ky_su_kien" ON dang_ky_su_kien;
CREATE POLICY "allow_admin_modify_dang_ky_su_kien" ON dang_ky_su_kien FOR ALL
    USING (is_admin()) WITH CHECK (is_admin());


-- [NHÓM 5: BẢNG ĐÁNH GIÁ (danh_gia)]
-- Nguyên tắc: Mọi người xem được bình luận công khai. Tạo bình luận tự do. Chỉ người viết hoặc Admin mới được sửa/xóa.
DROP POLICY IF EXISTS "allow_public_select_danh_gia" ON danh_gia;
CREATE POLICY "allow_public_select_danh_gia" ON danh_gia FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "allow_insert_danh_gia" ON danh_gia;
CREATE POLICY "allow_insert_danh_gia" ON danh_gia FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "allow_author_or_admin_modify_danh_gia" ON danh_gia;
CREATE POLICY "allow_author_or_admin_modify_danh_gia" ON danh_gia FOR UPDATE
    USING (
        user_id IN (SELECT id FROM nguoi_dung WHERE auth_user_id = auth.uid())
        OR is_admin()
    )
    WITH CHECK (
        user_id IN (SELECT id FROM nguoi_dung WHERE auth_user_id = auth.uid())
        OR is_admin()
    );

DROP POLICY IF EXISTS "allow_author_or_admin_delete_danh_gia" ON danh_gia;
CREATE POLICY "allow_author_or_admin_delete_danh_gia" ON danh_gia FOR DELETE
    USING (
        user_id IN (SELECT id FROM nguoi_dung WHERE auth_user_id = auth.uid())
        OR is_admin()
    );


-- [NHÓM 6: BẢNG AUDIT LOGS (audit_logs) - BẤT BIẾN]
-- Nguyên tắc: 
-- - Chỉ Admin mới có quyền SELECT đọc log hệ thống.
-- - Cho phép ghi INSERT nhật ký hoạt động.
-- - TUYỆT ĐỐI CẤM UPDATE VÀ DELETE (Bảo đảm tính toàn vẹn và bất biến của nhật ký an ninh).
DROP POLICY IF EXISTS "allow_admin_select_audit_logs" ON audit_logs;
CREATE POLICY "allow_admin_select_audit_logs" ON audit_logs FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "allow_insert_audit_logs" ON audit_logs;
CREATE POLICY "allow_insert_audit_logs" ON audit_logs FOR INSERT
    WITH CHECK (true);
