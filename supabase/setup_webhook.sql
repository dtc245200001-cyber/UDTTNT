-- Hướng dẫn: 
-- 1. Mở giao diện Supabase Dashboard -> SQL Editor
-- 2. Thay thế 'https://YOUR_BACKEND_URL.onrender.com' bằng URL backend thực tế của bạn (nếu chạy local thì cần ngrok)
-- 3. Chạy toàn bộ script này.

-- Bật extension pg_net để gọi HTTP từ Postgres
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Tạo hàm trigger để gọi API sync-rag
CREATE OR REPLACE FUNCTION public.trigger_sync_rag()
RETURNS TRIGGER AS $$
DECLARE
    backend_url TEXT := 'https://YOUR_BACKEND_URL.onrender.com/api/admin/sync-rag'; 
    -- Thay YOUR_BACKEND_URL.onrender.com bằng URL thực tế của backend
    req_id BIGINT;
BEGIN
    -- Gọi POST request (không quan tâm kết quả trả về để không block giao dịch DB)
    SELECT net.http_post(
        url := backend_url,
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := '{}'::jsonb
    ) INTO req_id;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Xóa trigger cũ (nếu có) trước khi tạo lại để tránh lỗi
DROP TRIGGER IF EXISTS on_su_kien_change ON public.su_kien;
DROP TRIGGER IF EXISTS on_phong_trung_bay_change ON public.phong_trung_bay;
DROP TRIGGER IF EXISTS on_danh_muc_change ON public.danh_muc;
DROP TRIGGER IF EXISTS on_bai_viet_change ON public.bai_viet;

-- Tạo trigger cho bảng su_kien
CREATE TRIGGER on_su_kien_change
AFTER INSERT OR UPDATE OR DELETE ON public.su_kien
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_sync_rag();

-- Tạo trigger cho bảng phong_trung_bay
CREATE TRIGGER on_phong_trung_bay_change
AFTER INSERT OR UPDATE OR DELETE ON public.phong_trung_bay
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_sync_rag();

-- Tạo trigger cho bảng danh_muc
CREATE TRIGGER on_danh_muc_change
AFTER INSERT OR UPDATE OR DELETE ON public.danh_muc
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_sync_rag();

-- Tạo trigger cho bảng bai_viet
CREATE TRIGGER on_bai_viet_change
AFTER INSERT OR UPDATE OR DELETE ON public.bai_viet
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_sync_rag();
