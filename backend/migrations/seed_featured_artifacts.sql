-- ====================================================================
-- Seed: Cập nhật cờ is_featured và featured_order cho 8 hiện vật tiêu biểu
-- Danh sách đã chốt:
--   1. AV221 - Trống đồng Ngọc Lũ
--   2. AV019 - Trống đồng Cảnh Thịnh - tiếng vọng ngàn năm
--   3. AV020 - Ánh sáng từ Đường Kách mệnh
--   4. AV003 - Một số đồ dùng sinh hoạt của Lãnh tụ Nguyễn Ái Quốc tại Pác Bó
--   5. AV002 - Hai kỷ vật kể chuyện về Anh hùng, liệt sĩ Lê Thị Riêng
--   6. AV001 - Những kỷ vật thiêng liêng về thương binh, liệt sĩ tại BTLSQG
--   7. AV024 - Về tấm bia đàn Nam Giao thời Lê ở Hà Nội
--   8. AV063 - Cờ "Đi là chiến thắng, đánh là diệt gọn"
-- ====================================================================

BEGIN;

-- 1. Trống đồng Ngọc Lũ (Thời kỳ: Cổ đại, Vị trí: Tầng 2 · Phòng C · Kệ 02)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 1 
WHERE id = 'AV221';

-- 2. Trống đồng Cảnh Thịnh - tiếng vọng ngàn năm (Thời kỳ: Trung đại, Vị trí: Tầng 1 · Phòng B · Kệ 01)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 2 
WHERE id = 'AV019';

-- 3. Ánh sáng từ Đường Kách mệnh (Thời kỳ: Cận đại, Vị trí: Tầng 2 · Phòng B · Kệ 04)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 3 
WHERE id = 'AV020';

-- 4. Một số đồ dùng sinh hoạt của Lãnh tụ Nguyễn Ái Quốc tại Pác Bó (Thời kỳ: Cận đại, Vị trí: Tầng 3 · Phòng B · Kệ 03)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 4 
WHERE id = 'AV003';

-- 5. Hai kỷ vật kể chuyện về Anh hùng, liệt sĩ Lê Thị Riêng (Thời kỳ: Hiện đại, Vị trí: Tầng 2 · Phòng A · Kệ 05)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 5 
WHERE id = 'AV002';

-- 6. Những kỷ vật thiêng liêng về thương binh, liệt sĩ tại Bảo tàng Lịch sử quốc gia (Thời kỳ: Hiện đại, Vị trí: Tầng 1 · Phòng A · Kệ 02)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 6 
WHERE id = 'AV001';

-- 7. Về tấm bia đàn Nam Giao thời Lê ở Hà Nội (Thời kỳ: Trung đại, Vị trí: Tầng 3 · Phòng D · Kệ 01)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 7 
WHERE id = 'AV024';

-- 8. Cờ "Đi là chiến thắng, đánh là diệt gọn" (Thời kỳ: Hiện đại, Vị trí: Tầng 3 · Phòng D · Kệ 03)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 8 
WHERE id = 'AV063';

COMMIT;
