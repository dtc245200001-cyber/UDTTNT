-- ====================================================================
-- BẢO TÀNG QUỐC GIA VIỆT NAM - SUPABASE USER SYNC TRIGGER MIGRATION
-- File: supabase/migration_ensure_user_sync.sql
-- Mục đích: Đảm bảo Trigger tự động đồng bộ từ auth.users sang public.nguoi_dung
-- Bảo mật: Loại bỏ hoàn toàn khả năng tự nâng quyền qua client metadata (raw_user_meta_data)
-- Tính chất: Idempotent (chạy nhiều lần an toàn, không sinh lỗi duplicate)
-- ====================================================================

-- 1. Đảm bảo cột auth_user_id đã tồn tại trong bảng nguoi_dung
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nguoi_dung' AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.nguoi_dung ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_nguoi_dung_auth_user_id ON public.nguoi_dung(auth_user_id);
    END IF;
END $$;

-- 2. TẠO HOẶC CẬP NHẬT FUNCTION HANDLE_NEW_USER
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
    -- Gán vai trò an toàn: chỉ email admin@gmail.com được gán admin mặc định
    -- Tuyệt đối KHÔNG đọc role từ raw_user_meta_data để ngăn chặn leo thang quyền từ client
    IF NEW.email = 'admin@gmail.com' THEN
        user_role := 'admin';
        user_role_label := 'Quản trị viên';
    ELSE
        user_role := 'visitor';
        user_role_label := 'Khách tham quan';
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

-- 3. GẮN TRIGGER VÀO AUTH.USERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ĐỒNG BỘ CÁC USER HIỆN CÓ TỪ TRƯỚC SANG NGUOI_DUNG
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
