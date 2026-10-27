-- ====================================================================
-- Seed: Cập nhật cờ is_featured và featured_order cho 8 hiện vật tiêu biểu
-- Chạy script này SAU KHI đã chạy migration add_is_featured_to_hien_vat.sql
-- ====================================================================

-- 1. Trống đồng Ngọc Lũ (Bảo vật quốc gia - Văn hóa Đông Sơn)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 1 
WHERE id = 'AV221';

-- 2. Trống đồng Cảnh Thịnh (Bảo vật quốc gia - Thời Tây Sơn)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 2 
WHERE id = 'AV019';

-- 3. Sưu tập gốm Bát Tràng (Gốm cổ truyền thống tiêu biểu)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 3 
WHERE id = 'AV151';

-- 4. Ánh sáng từ Đường Kách mệnh (Bảo vật quốc gia - Tác phẩm của Lãnh tụ Nguyễn Ái Quốc)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 4 
WHERE id = 'AV020';

-- 5. Đồ dùng sinh hoạt của Lãnh tụ Nguyễn Ái Quốc tại Pác Bó
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 5 
WHERE id = 'AV003';

-- 6. Nhân dân Hà Nội đánh chiếm Phủ Khâm sai (Cách mạng Tháng Tám 1945)
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 6 
WHERE id = 'AV112';

-- 7. Hai kỷ vật kể chuyện về Anh hùng, liệt sĩ Lê Thị Riêng
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 7 
WHERE id = 'AV002';

-- 8. Những kỷ vật thiêng liêng về thương binh, liệt sĩ tại BTLSQG
UPDATE public.hien_vat 
SET is_featured = TRUE, featured_order = 8 
WHERE id = 'AV001';
