-- ====================================================================
-- BẢO TÀNG QUỐC GIA VIỆT NAM - MIGRATION FIX ROLE ESCALATION
-- File: supabase/migration_fix_role_escalation.sql
-- Mục đích:
--   Chống lỗ hổng leo thang đặc quyền (Privilege Escalation):
--   Ngăn chặn người dùng tự cập nhật cột 'role', 'role_label', 'status' của chính mình
--   thông qua BEFORE UPDATE Trigger trên bảng nguoi_dung.
-- ====================================================================

-- 1. TẠO HÀM TRIGGER KIỂM SOÁT THAY ĐỔI VAI TRÒ & TRẠNG THÁI TÀI KHOẢN
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Nếu người thực hiện UPDATE KHÔNG PHẢI là Admin (is_admin() trả về FALSE)
    IF NOT is_admin() THEN
        -- Giữ nguyên các trường bảo mật nhạy cảm theo giá trị cũ (OLD)
        NEW.role := OLD.role;
        NEW.role_label := OLD.role_label;
        NEW.status := OLD.status;
        NEW.auth_user_id := OLD.auth_user_id;
        NEW.email := OLD.email;
    END IF;

    -- Người dùng vẫn được phép tự do cập nhật thông tin cá nhân (name, avatar...)
    RETURN NEW;
END;
$$;

-- 2. GẮN TRIGGER TRƯỚC KHI CẬP NHẬT (BEFORE UPDATE) TRÊN BẢNG NGUOI_DUNG
DROP TRIGGER IF EXISTS trg_prevent_self_role_change ON public.nguoi_dung;

CREATE TRIGGER trg_prevent_self_role_change
    BEFORE UPDATE ON public.nguoi_dung
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_self_role_change();
