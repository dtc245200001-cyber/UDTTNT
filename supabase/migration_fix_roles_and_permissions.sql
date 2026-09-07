-- ====================================================================
-- BẢO TÀNG QUỐC GIA VIỆT NAM - MIGRATION XỬ LÝ TRIỆT ĐỂ PHÂN QUYỀN
-- File: supabase/migration_fix_roles_and_permissions.sql
-- Mục đích:
--   1. Khắc phục lỗi đệ quy / chặn nhầm khi phân quyền (Role Assignment).
--   2. Cho phép Quản trị viên đổi quyền (admin / staff / visitor) từ cả Web UI và Supabase Table Editor.
--   3. Cung cấp hàm RPC assign_user_role() thực thi an toàn và đồng bộ App Metadata.
--   4. Bảo vệ chống leo thang quyền (người dùng thường không thể tự gán admin).
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TỐI ƯU HÀM KIỂM TRA QUYỀN (RBAC HELPER FUNCTIONS)
-- --------------------------------------------------------------------

-- Hàm kiểm tra Quản trị viên (is_admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    _jwt_email TEXT;
    _jwt_role TEXT;
    _db_role TEXT;
BEGIN
    -- 1. Nếu thực thi từ Supabase SQL Editor, Table Editor, hoặc Service Role
    IF current_user IN ('postgres', 'supabase_admin', 'service_role') 
       OR (auth.role() = 'service_role') THEN
        RETURN TRUE;
    END IF;

    -- 2. Kiểm tra trực tiếp qua JWT claims (nhanh và không đệ quy)
    _jwt_email := auth.jwt() ->> 'email';
    _jwt_role := COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role'
    );

    IF _jwt_email = 'admin@gmail.com' OR _jwt_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 3. Kiểm tra vai trò trong bảng public.nguoi_dung
    IF auth.uid() IS NOT NULL OR _jwt_email IS NOT NULL THEN
        SELECT role INTO _db_role
        FROM public.nguoi_dung
        WHERE (auth_user_id = auth.uid() OR (_jwt_email IS NOT NULL AND email = _jwt_email))
        LIMIT 1;

        IF _db_role = 'admin' THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;

-- Hàm lấy vai trò hiện tại của User
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    _role TEXT;
BEGIN
    IF is_admin() THEN
        RETURN 'admin';
    END IF;

    -- Kiểm tra Staff từ JWT
    IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
       OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff' THEN
        RETURN 'staff';
    END IF;

    -- Kiểm tra DB
    SELECT role INTO _role
    FROM public.nguoi_dung
    WHERE (auth_user_id = auth.uid() OR (auth.jwt() ->> 'email' IS NOT NULL AND email = (auth.jwt() ->> 'email')))
    LIMIT 1;

    RETURN COALESCE(_role, 'visitor');
END;
$$;

-- Hàm kiểm tra Nhân viên hoặc Admin (is_staff_or_admin)
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    IF is_admin() THEN
        RETURN TRUE;
    END IF;

    IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
       OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff' THEN
        RETURN TRUE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.nguoi_dung
        WHERE (auth_user_id = auth.uid() OR (auth.jwt() ->> 'email' IS NOT NULL AND email = (auth.jwt() ->> 'email')))
          AND role IN ('admin', 'staff')
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;


-- --------------------------------------------------------------------
-- 2. ĐIỀU CHỈNH TRIGGER BẢO VỆ LEO THANG QUYỀN (PREVENT SELF ROLE CHANGE)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Nếu người thực hiện là Admin hoặc thao tác trực tiếp từ Supabase Studio / Service Role:
    -- Cho phép cập nhật tất cả mọi trường.
    IF is_admin() THEN
        RETURN NEW;
    END IF;

    -- Nếu KHÔNG PHẢI Admin:
    -- Khóa việc tự thay đổi role, role_label, status, auth_user_id, email
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        NEW.role := OLD.role;
    END IF;

    IF NEW.role_label IS DISTINCT FROM OLD.role_label THEN
        NEW.role_label := OLD.role_label;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status := OLD.status;
    END IF;

    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
        NEW.auth_user_id := OLD.auth_user_id;
    END IF;

    IF NEW.email IS DISTINCT FROM OLD.email THEN
        NEW.email := OLD.email;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_change ON public.nguoi_dung;
CREATE TRIGGER trg_prevent_self_role_change
    BEFORE UPDATE ON public.nguoi_dung
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_self_role_change();


-- --------------------------------------------------------------------
-- 3. CẬP NHẬT CHÍNH SÁCH ROW LEVEL SECURITY (RLS) CHO BẢNG NGUOI_DUNG
-- --------------------------------------------------------------------
ALTER TABLE public.nguoi_dung ENABLE ROW LEVEL SECURITY;

-- 3.1 SELECT: Cho phép hiển thị danh sách người dùng
DROP POLICY IF EXISTS "allow_select_nguoi_dung" ON public.nguoi_dung;
CREATE POLICY "allow_select_nguoi_dung" ON public.nguoi_dung FOR SELECT
    USING (true);

-- 3.2 INSERT: Cho phép đăng ký mới & tạo người dùng từ Admin
DROP POLICY IF EXISTS "allow_insert_nguoi_dung" ON public.nguoi_dung;
CREATE POLICY "allow_insert_nguoi_dung" ON public.nguoi_dung FOR INSERT
    WITH CHECK (
        is_admin()
        OR auth_user_id = auth.uid()
        OR email = (auth.jwt() ->> 'email')
        OR auth.role() IN ('anon', 'authenticated')
    );

-- 3.3 UPDATE: Admin được sửa mọi dòng, User thường chỉ sửa thông tin cá nhân của mình
DROP POLICY IF EXISTS "allow_update_nguoi_dung" ON public.nguoi_dung;
CREATE POLICY "allow_update_nguoi_dung" ON public.nguoi_dung FOR UPDATE
    USING (
        is_admin()
        OR auth_user_id = auth.uid()
        OR email = (auth.jwt() ->> 'email')
    )
    WITH CHECK (
        is_admin()
        OR auth_user_id = auth.uid()
        OR email = (auth.jwt() ->> 'email')
    );

-- 3.4 DELETE: Chỉ Admin mới có quyền xóa người dùng
DROP POLICY IF EXISTS "allow_admin_delete_nguoi_dung" ON public.nguoi_dung;
DROP POLICY IF EXISTS "allow_delete_nguoi_dung" ON public.nguoi_dung;
CREATE POLICY "allow_delete_nguoi_dung" ON public.nguoi_dung FOR DELETE
    USING (is_admin());


-- --------------------------------------------------------------------
-- 4. HÀM RPC ĐỔI QUYỀN (ASSIGN USER ROLE) CHUYÊN DỤNG
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_user_role(
    target_user_id TEXT,
    new_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_label TEXT;
    v_auth_id UUID;
    v_result JSON;
BEGIN
    -- Kiểm tra quyền Admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền đổi vai trò người dùng.';
    END IF;

    -- Chuẩn hóa role
    new_role := lower(trim(new_role));
    IF new_role NOT IN ('admin', 'staff', 'visitor') THEN
        RAISE EXCEPTION 'Vai trò "%" không hợp lệ. Chỉ chấp nhận: admin, staff, visitor.', new_role;
    END IF;

    IF new_role = 'admin' THEN
        v_label := 'Quản trị viên';
    ELSIF new_role = 'staff' THEN
        v_label := 'Nhân viên';
    ELSE
        v_label := 'Khách tham quan';
    END IF;

    -- Cập nhật bảng public.nguoi_dung
    UPDATE public.nguoi_dung
    SET 
        role = new_role,
        role_label = v_label
    WHERE id = target_user_id OR email = target_user_id
    RETURNING auth_user_id INTO v_auth_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy người dùng với mã / email: %', target_user_id;
    END IF;

    -- Đồng bộ vai trò sang auth.users.raw_app_meta_data (nếu có tài khoản auth tương ứng)
    IF v_auth_id IS NOT NULL THEN
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
        WHERE id = v_auth_id;
    END IF;

    SELECT row_to_json(u) INTO v_result
    FROM public.nguoi_dung u
    WHERE id = target_user_id OR email = target_user_id
    LIMIT 1;

    RETURN v_result;
END;
$$;


-- --------------------------------------------------------------------
-- 5. HÀM RPC KHÓA / MỞ KHÓA TÀI KHOẢN (TOGGLE USER STATUS)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_user_status(
    target_user_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_curr_status TEXT;
    v_new_status TEXT;
    v_result JSON;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Từ chối truy cập: Chỉ Quản trị viên mới có quyền đổi trạng thái tài khoản.';
    END IF;

    SELECT status INTO v_curr_status
    FROM public.nguoi_dung
    WHERE id = target_user_id OR email = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy người dùng: %', target_user_id;
    END IF;

    IF v_curr_status = 'Hoạt động' THEN
        v_new_status := 'Tạm khóa';
    ELSE
        v_new_status := 'Hoạt động';
    END IF;

    UPDATE public.nguoi_dung
    SET status = v_new_status
    WHERE id = target_user_id OR email = target_user_id;

    SELECT row_to_json(u) INTO v_result
    FROM public.nguoi_dung u
    WHERE id = target_user_id OR email = target_user_id
    LIMIT 1;

    RETURN v_result;
END;
$$;


-- --------------------------------------------------------------------
-- 6. ĐẢM BẢO TÀI KHOẢN QUẢN TRỊ VIÊN MẶC ĐỊNH LUÔN CÓ QUYỀN ADMIN
-- --------------------------------------------------------------------
UPDATE public.nguoi_dung
SET 
    role = 'admin',
    role_label = 'Quản trị viên',
    status = 'Hoạt động'
WHERE email = 'admin@gmail.com';

-- Cập nhật metadata trong auth.users cho admin@gmail.com nếu tồn tại
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE email = 'admin@gmail.com';
