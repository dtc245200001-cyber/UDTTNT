-- ====================================================================
-- BẢO TÀNG QUỐC GIA VIỆT NAM - MIGRATION TRƯNG BÀY CHUYÊN ĐỀ
-- File: supabase/migration_phong_trung_bay_chuyen_de.sql
-- Mục đích:
--   1. Mở rộng schema bảng phong_trung_bay sang mô hình Trưng bày chuyên đề.
--   2. Ràng buộc trạng thái: Sắp diễn ra / Đang diễn ra / Đã diễn ra.
--   3. Seed dữ liệu thật 5 chuyên đề lịch sử.
-- ====================================================================

-- --------------------------------------------------------------------
-- BƯỚC 1: MỞ RỘNG SCHEMA BẢNG PHONG_TRUNG_BAY
-- --------------------------------------------------------------------
ALTER TABLE public.phong_trung_bay 
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'Đang diễn ra',
  ADD COLUMN IF NOT EXISTS start_date DATE,
  ADD COLUMN IF NOT EXISTS end_date DATE,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS highlight_artifacts JSONB DEFAULT '[]'::jsonb;

-- Xóa constraint cũ nếu có để tránh lỗi khi chạy lại
ALTER TABLE public.phong_trung_bay DROP CONSTRAINT IF EXISTS chk_status_trung_bay;

-- Thêm ràng buộc check status
ALTER TABLE public.phong_trung_bay
  ADD CONSTRAINT chk_status_trung_bay 
  CHECK (status IN ('Sắp diễn ra', 'Đang diễn ra', 'Đã diễn ra'));

-- Bật RLS và cấp quyền đọc công khai, quyền chỉnh sửa cho Admin
ALTER TABLE public.phong_trung_bay ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_public_select_phong_trung_bay" ON public.phong_trung_bay;
CREATE POLICY "allow_public_select_phong_trung_bay" ON public.phong_trung_bay FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_admin_modify_phong_trung_bay" ON public.phong_trung_bay;
CREATE POLICY "allow_admin_modify_phong_trung_bay" ON public.phong_trung_bay FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());


-- --------------------------------------------------------------------
-- BƯỚC 2: SEED DỮ LIỆU THẬT TRƯNG BÀY CHUYÊN ĐỀ
-- --------------------------------------------------------------------
DELETE FROM public.phong_trung_bay;

INSERT INTO public.phong_trung_bay (id, name, description, status, start_date, end_date, image, highlight_artifacts) VALUES
('TBCD01', 'Mùa Xuân – Khởi nguồn thắng lợi', 
 'Trưng bày hệ thống tài liệu và hiện vật phản ánh những bước ngoặt lịch sử của cách mạng Việt Nam cùng các quyết sách chiến lược của Đảng.',
 'Đã diễn ra', NULL, NULL, '/images/museum-hero.jpg',
 '[{"name": "Đồ dùng sinh hoạt của Lãnh tụ Nguyễn Ái Quốc", "description": "Các đồ dùng sinh hoạt của Người trong thời gian sống và hoạt động cách mạng tại Pác Bó, Cao Bằng năm 1941."}]'::jsonb),

('TBCD02', 'Bình dân học vụ – Thắp sáng tương lai',
 'Giới thiệu nhiều hiện vật quý về phong trào xóa nạn mù chữ.',
 'Đã diễn ra', '2025-08-22', '2025-12-31', '/images/bia-tien-si.jpg',
 '[
   {"name": "Huy hiệu Bình dân học vụ", "description": "Hiện vật tiêu biểu của phong trào xóa mù chữ giai đoạn 1945-1946."},
   {"name": "Thư khen của Chủ tịch Hồ Chí Minh", "description": "Gửi toàn thể bộ đội khu 2 và khu 3 về thành tích xóa nạn mù chữ, ngày 24/2/1948."},
   {"name": "Sách Phương pháp và cách thức dạy vỡ lòng chữ quốc ngữ", "description": "Hà Nội xuất bản năm 1946."},
   {"name": "Đặc san Bình dân học vụ", "description": "Trung Bộ xuất bản năm 1947, ghi lại danh tính của 17 liệt sĩ Bình dân học vụ hy sinh trong năm 1946-1947."},
   {"name": "Lời hiệu triệu của Nha Tổng Giám đốc Bình dân học vụ", "description": "Ngày 8/9/1949."}
 ]'::jsonb),

('TBCD03', 'Đảng cộng sản Việt Nam – Những mốc son lịch sử',
 'Giới thiệu hơn 100 hiện vật, tài liệu và hình ảnh phản ánh các quyết sách đúng đắn, thành tựu và bài học kinh nghiệm của cách mạng, nhân dịp kỷ niệm 95 năm thành lập Đảng Cộng sản Việt Nam (1930-2025).',
 'Đã diễn ra', '2025-02-01', '2025-12-31', '/images/trong-dong.jpg',
 '[{"name": "Sưu tập hiện vật của nhân dân tham gia, nuôi giấu, bảo vệ cán bộ cách mạng", "description": "Giai đoạn từ năm 1930 đến 1945."}]'::jsonb),

('TBCD04', 'Việt Bắc - Thủ đô gió ngàn',
 'Trưng bày nhiều tài liệu, hiện vật tiêu biểu thời kỳ kháng chiến chống thực dân Pháp, nhân kỷ niệm 75 năm ngày Toàn quốc kháng chiến (19/12/1946 - 19/12/2021).',
 'Đã diễn ra', '2021-12-19', '2021-12-19', '/images/binh-gom.jpg',
 '[{"name": "Vở học bằng mo tre", "description": "Của học sinh trường Hàn Thuyên (Bắc Ninh) dùng trong thời kỳ kháng chiến."}]'::jsonb),

('TBCD05', 'Quan hệ hữu nghị vĩ đại, đoàn kết đặc biệt Việt Nam - Lào, Lào - Việt Nam',
 'Triển lãm chuyên đề về quan hệ hữu nghị Việt Nam - Lào.',
 'Đã diễn ra', NULL, NULL, '/images/tuong-phat.jpg',
 '[{"name": "Bản án chế độ Thực dân Pháp (Le Procès de la Colonisation Francaise)", "description": "Hiện vật chứa đựng một câu chuyện thú vị về hành trình tìm kiếm và đưa sách trở về với bảo tàng."}]'::jsonb);
