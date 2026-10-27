-- ====================================================================
-- Migration: Thêm cột is_featured và featured_order vào bảng hien_vat
-- An toàn: Bọc trong TRANSACTION (BEGIN ... COMMIT)
-- ====================================================================

BEGIN;

-- 1. Thêm cột is_featured (mặc định false)
ALTER TABLE public.hien_vat 
ADD COLUMN IF NOT EXISTS is_featured BOOLEAN DEFAULT FALSE NOT NULL;

-- 2. Thêm cột featured_order (thứ tự ưu tiên hiển thị)
ALTER TABLE public.hien_vat 
ADD COLUMN IF NOT EXISTS featured_order INTEGER NULL;

-- 3. Tạo Index tối ưu truy vấn cho is_featured và featured_order
CREATE INDEX IF NOT EXISTS idx_hien_vat_is_featured 
ON public.hien_vat (is_featured, featured_order ASC NULLS LAST);

-- 4. Chú thích cho các cột
COMMENT ON COLUMN public.hien_vat.is_featured IS 'Đánh dấu hiện vật tiêu biểu / nổi bật của bảo tàng';
COMMENT ON COLUMN public.hien_vat.featured_order IS 'Thứ tự ưu tiên hiển thị của hiện vật tiêu biểu (1, 2, 3...)';

COMMIT;
