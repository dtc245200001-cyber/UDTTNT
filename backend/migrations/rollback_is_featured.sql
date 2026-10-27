-- ====================================================================
-- Rollback Migration: Xóa bỏ cột is_featured và featured_order khỏi bảng hien_vat
-- An toàn: Bọc trong TRANSACTION (BEGIN ... COMMIT)
-- ====================================================================

BEGIN;

-- 1. Xóa Index nếu có
DROP INDEX IF EXISTS public.idx_hien_vat_is_featured;

-- 2. Xóa cột featured_order
ALTER TABLE public.hien_vat 
DROP COLUMN IF EXISTS featured_order;

-- 3. Xóa cột is_featured
ALTER TABLE public.hien_vat 
DROP COLUMN IF EXISTS is_featured;

COMMIT;
