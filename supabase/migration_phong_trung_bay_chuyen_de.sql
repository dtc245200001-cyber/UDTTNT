-- ====================================================================
-- BẢO TÀNG QUỐC GIA VIỆT NAM - MIGRATION TRƯNG BÀY CHUYÊN ĐỀ
-- File: supabase/migration_phong_trung_bay_chuyen_de.sql
-- Nguồn dữ liệu: Bảo tàng Lịch sử Quốc gia (baotanglichsu.vn)
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

-- Xóa constraint cũ nếu có để tránh trùng lặp
ALTER TABLE public.phong_trung_bay DROP CONSTRAINT IF EXISTS chk_status_trung_bay;

-- Thêm ràng buộc check status: 'Sắp diễn ra', 'Đang diễn ra', 'Đã diễn ra'
ALTER TABLE public.phong_trung_bay
  ADD CONSTRAINT chk_status_trung_bay 
  CHECK (status IN ('Sắp diễn ra', 'Đang diễn ra', 'Đã diễn ra'));

-- Bật RLS và cấp quyền
ALTER TABLE public.phong_trung_bay ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "allow_public_select_phong_trung_bay" ON public.phong_trung_bay;
CREATE POLICY "allow_public_select_phong_trung_bay" ON public.phong_trung_bay FOR SELECT USING (true);

DROP POLICY IF EXISTS "allow_admin_modify_phong_trung_bay" ON public.phong_trung_bay;
CREATE POLICY "allow_admin_modify_phong_trung_bay" ON public.phong_trung_bay FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- --------------------------------------------------------------------
-- BƯỚC 2: SEED DỮ LIỆU THẬT 8 CHUYÊN ĐỀ TỪ BẢO TÀNG LỊCH SỬ QUỐC GIA
-- --------------------------------------------------------------------
DELETE FROM public.phong_trung_bay;

INSERT INTO public.phong_trung_bay (id, name, description, status, start_date, end_date, image, highlight_artifacts) VALUES
('TBCD01', 'Vũ khúc Thiền môn - Nghệ thuật Phật giáo thời Lý: Di sản và Công nghệ',
 'Ứng dụng công nghệ tương tác số hiện đại (3D mapping, hologram, AI) kết hợp trưng bày hiện vật gốc để diễn giải sinh động đỉnh cao mỹ thuật, kiến trúc và nghệ thuật Phật giáo thời Lý.',
 'Đang diễn ra', '2025-05-16', '2026-11-30', '/images/tuong-phat.jpg',
 '[
   {"name": "Tượng Phật A Di Đà chùa Phật Tích", "description": "Tuyệt tác điêu khắc đá thời Lý (thế kỷ 11) được tái hiện bằng công nghệ số và ánh sáng hologram."},
   {"name": "Đầu rồng đất nung thời Lý hoàng thành Thăng Long", "description": "Hiện vật đất nung tinh xảo trang trí bờ nóc cung điện thời Lý."},
   {"name": "Gạch hoa cúc và lá đề chạm rồng thời Lý", "description": "Vật liệu kiến trúc cung đình mang biểu tượng Phật giáo thịnh vượng."}
 ]'::jsonb),

('TBCD02', 'Non sông liền một dải',
 'Trưng bày kỷ niệm 50 năm ngày Giải phóng miền Nam, thống nhất đất nước (30/4/1975 – 30/4/2025), giới thiệu gần 150 tài liệu, hiện vật lịch sử về khát vọng thống nhất và tình đoàn kết Bắc - Nam.',
 'Đang diễn ra', '2025-04-25', '2026-05-30', '/images/museum-hero.jpg',
 '[
   {"name": "Lá cờ Mặt trận Dân tộc Giải phóng miền Nam Việt Nam", "description": "Lá cờ dẫn đầu đoàn quân tiến vào giải phóng Dinh Độc Lập ngày 30/4/1975."},
   {"name": "Sổ tay chỉ đạo chiến dịch Hồ Chí Minh", "description": "Ghi lại các mốc thời gian và mệnh lệnh tác chiến quyết định thống nhất non sông."},
   {"name": "Xe đạp thồ của chiến sĩ vận tải chiến trường", "description": "Hiện vật huyền thoại vượt dãy Trường Sơn chi viện cho tiền tuyến miền Nam."}
 ]'::jsonb),

('TBCD03', 'Rồng trên cổ vật – Biểu tượng quyền uy & tâm linh',
 'Chuyên đề đặc biệt giới thiệu sự biến đổi của biểu tượng Rồng thiêng qua hơn 2.000 năm lịch sử văn hóa Việt Nam, từ thời kỳ văn hóa Đông Sơn, Lý - Trần - Lê cho đến triều Nguyễn.',
 'Sắp diễn ra', '2026-10-10', '2027-02-28', '/images/trong-dong.jpg',
 '[
   {"name": "Ấn vàng Sắc mệnh chi bảo triều Nguyễn", "description": "Bảo vật hoàng gia đúc năm Minh Mạng thứ 8 (1827) chạm khắc hình rồng uốn lượn uy nghiêm."},
   {"name": "Rồng đá trang trí thềm điện Kính Thiên", "description": "Tác phẩm điêu khắc đá thế kỷ 15 mang phong cách quyền uy thời Lê Sơ."},
   {"name": "Thạp đồng Đông Sơn trang trí hoa văn giao long", "description": "Cổ vật hơn 2.000 năm tuổi thể hiện cội nguồn hình tượng Rồng trong tâm thức Việt."}
 ]'::jsonb),

('TBCD04', 'Điện Biên Phủ – Tinh thần bất diệt',
 'Trưng bày gần 150 hiện vật, tài liệu quý tái hiện chiến thắng Điện Biên Phủ "lừng lẫy năm châu, chấn động địa cầu" nhân kỷ niệm 70 năm chiến thắng Điện Biên Phủ và Hiệp định Genève.',
 'Đã diễn ra', '2024-05-07', '2024-09-30', '/images/museum-building.jpg',
 '[
   {"name": "Bản đồ tác chiến chiến dịch Điện Biên Phủ", "description": "Bản đồ tác chiến của Bộ Tổng tham mưu Quân đội nhân dân Việt Nam năm 1954."},
   {"name": "Chiếc cúp chiến lợi phẩm từ sở chỉ huy hầm De Castries", "description": "Thu giữ vào chiều ngày 7/5/1954 khi quân ta cắm cờ trên nóc hầm chỉ huy."},
   {"name": "Đèn bão kéo pháo vào trận địa", "description": "Dụng cụ soi đường thầm lặng của bộ đội ta vượt đèo dốc kéo pháo vào lòng chảo."}
 ]'::jsonb),

('TBCD05', 'Gốm cổ Bát Tràng – Tinh hoa ngàn năm',
 'Giới thiệu bộ sưu tập 39 hiện vật gốm cổ tinh hoa độc bản từ thế kỷ 14 đến thế kỷ 20, tôn vinh các dòng men lam, men rạn, men ngọc độc đáo của làng gốm Bát Tràng.',
 'Đã diễn ra', '2023-05-18', '2023-12-31', '/images/binh-gom.jpg',
 '[
   {"name": "Chân đèn gốm hoa lam thời Mạc (1572)", "description": "Tác phẩm độc bản của nghệ nhân Đỗ Phủ với nét vẽ phóng khoáng, niên hiệu Sùng Khang thứ 7."},
   {"name": "Lư hương gốm men rạn đắp nổi thời Lê Trung Hưng", "description": "Đặc trưng nghệ thuật men rạn ngà đắp nổi hoa văn rồng mây thế kỷ 18."},
   {"name": "Bình vôi cổ hoa văn dây lá thời Nguyễn", "description": "Vật phẩm gốm sinh hoạt gắn liền với phong tục ăn trầu truyền thống của người Việt."}
 ]'::jsonb),

('TBCD06', 'Máu và Hoa – Hà Nội 12 ngày đêm',
 'Tái hiện 12 ngày đêm chiến đấu ngoan cường đánh bại cuộc tập kích chiến lược B-52 của không quân Mỹ, làm nên kỳ tích "Điện Biên Phủ trên không" vang dội của quân dân Thủ đô.',
 'Đã diễn ra', '2022-12-18', '2023-04-30', '/images/bia-tien-si.jpg',
 '[
   {"name": "Mảnh xác pháo đài bay B-52 rơi tại hồ Hữu Tiệp", "description": "Chứng tích chiến thắng bắn rơi B-52 tại chỗ của tiểu đoàn tên lửa 72 đêm 27/12/1972."},
   {"name": "Mũ phi công Mỹ và trang bị lái dù", "description": "Chiến lợi phẩm thu được từ các phi công bị bắt sống trên bầu trời Hà Nội."},
   {"name": "Đài quan sát phòng không trên đỉnh Nhà hát Lớn", "description": "Tư liệu về mạng lưới quan sát và còi báo động phòng không bảo vệ người dân Thủ đô."}
 ]'::jsonb),

('TBCD07', 'Bình dân học vụ – Thắp sáng tương lai',
 'Giới thiệu nhiều tư liệu, hiện vật quý về phong trào xóa nạn mù chữ do Chủ tịch Hồ Chí Minh phát động ngay sau Cách mạng Tháng Tám năm 1945.',
 'Đã diễn ra', '2025-08-22', '2025-12-31', '/images/trong-dong.jpg',
 '[
   {"name": "Huy hiệu Bình dân học vụ (1945-1946)", "description": "Biểu trưng vinh danh các giáo viên và học viên hoàn thành lớp học xóa mù chữ."},
   {"name": "Thư khen của Chủ tịch Hồ Chí Minh ngày 24/2/1948", "description": "Gửi toàn thể bộ đội khu 2 và khu 3 về thành tích xóa nạn mù chữ trong quân ngũ."},
   {"name": "Sách Phương pháp và cách thức dạy vỡ lòng chữ quốc ngữ", "description": "Ấn bản Hà Nội năm 1946 làm giáo trình chuẩn cho phong trào."},
   {"name": "Đặc san Bình dân học vụ Trung Bộ (1947)", "description": "Ghi danh 17 liệt sĩ Bình dân học vụ hy sinh trong thời kỳ kháng chiến."}
 ]'::jsonb),

('TBCD08', 'Thi đua ái quốc – Ươm những mầm xanh',
 'Trưng bày chuyên đề kỷ niệm 75 năm ngày Chủ tịch Hồ Chí Minh ra Lời kêu gọi thi đua ái quốc (11/6/1948 – 11/6/2023), lan tỏa các phong trào Ba sẵn sàng, Năm xung phong, Hũ gạo cứu đói.',
 'Đã diễn ra', '2023-06-11', '2023-11-30', '/images/museum-hero.jpg',
 '[
   {"name": "Bản in Lời kêu gọi Thi đua ái quốc năm 1948", "description": "Tài liệu lịch sử mở đầu cho phong trào thi đua yêu nước toàn dân."},
   {"name": "Cờ luân lưu phong trào Dạy tốt - Học tốt", "description": "Phần thưởng thi đua cao quý trao tặng cho các đơn vị giáo dục xuất sắc."},
   {"name": "Huy hiệu Chiến sĩ thi đua toàn quốc khóa I", "description": "Trao tặng tại Đại hội Chiến sĩ thi đua và Cán bộ gương mẫu toàn quốc năm 1952."}
 ]'::jsonb);
