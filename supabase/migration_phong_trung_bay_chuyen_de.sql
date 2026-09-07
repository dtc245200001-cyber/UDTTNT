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
  ADD COLUMN IF NOT EXISTS location TEXT DEFAULT 'Bảo tàng Lịch sử Quốc gia – Số 1 Tràng Tiền / 216 Trần Quang Khải, Hà Nội',
  ADD COLUMN IF NOT EXISTS source_url TEXT DEFAULT 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
  ADD COLUMN IF NOT EXISTS source_note TEXT,
  ADD COLUMN IF NOT EXISTS detailed_content TEXT,
  ADD COLUMN IF NOT EXISTS image TEXT,
  ADD COLUMN IF NOT EXISTS gallery_images JSONB DEFAULT '[]'::jsonb,
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

INSERT INTO public.phong_trung_bay (
  id, name, description, status, start_date, end_date, 
  location, source_url, detailed_content, image, gallery_images, highlight_artifacts
) VALUES
('TBCD01', 'Vũ khúc Thiền môn - Nghệ thuật Phật giáo thời Lý: Di sản và Công nghệ',
 'Ứng dụng công nghệ tương tác số hiện đại (3D mapping, hologram, AI, gauze projection) kết hợp trưng bày 14 hiện vật gốc tiêu biểu để diễn giải sinh động 4 trụ cột đỉnh cao: Kiến trúc chùa tháp, Điêu khắc đá, Đồ gốm men và Âm nhạc vũ đạo Phật giáo thời Lý.',
 'Đang diễn ra', '2025-05-16', '2026-11-30',
 'Phòng Trưng bày Chuyên đề số 1, Tầng 1 – Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
 'https://nhandan.vn/vu-khuc-thien-mon-gioi-thieu-nghe-thuat-phat-giao-thoi-ly-post880239.html',
 'Trưng bày chuyên đề "Vũ khúc Thiền môn - Nghệ thuật Phật giáo thời Lý: Di sản và Công nghệ" do Bảo tàng Lịch sử Quốc gia phối hợp cùng Viện Nghiên cứu Văn minh Châu Á và Công ty TNHH C.M.Y.K Việt Nam tổ chức nhân dịp Ngày Quốc tế Bảo tàng, Ngày Khoa học Công nghệ Việt Nam (18/5) và kỷ niệm 135 năm Ngày sinh Chủ tịch Hồ Chí Minh. Nghệ thuật Phật giáo thời Lý (thế kỷ XI - XIII) là đỉnh cao rực rỡ của mỹ thuật Đại Việt với 4 lĩnh vực tiêu biểu: Kiến trúc chùa tháp, Điêu khắc đá, Đồ gốm men và Âm nhạc vũ đạo thiền môn, kết hợp công nghệ trình chiếu 3D Mapping, Hologram, Phục dựng số (Digital Revival) và Gauze Projection.',
 'https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_1.jpg',
 '["https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_1.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_2.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_3.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh4.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh5.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh6.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh7.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh8.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh10.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh11.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh12.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh13.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh14.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/nh15.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh16.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh17.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh18.jpg", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh19.avif", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh20.avif", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh21.avif", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh22.avif", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh23.avif", "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh24.avif"]'::jsonb,
 '[
   {"name": "Tượng Phật A Di Đà chùa Phật Tích (Bảo vật Quốc gia)", "description": "Đỉnh cao điêu khắc đá thời vua Lý Thánh Tông (năm 1057), pho tượng ngồi thiền định tọa trên tòa sen nhiều tầng chạm khắc rồng và hoa văn tinh xảo.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_1.jpg", "period": "Thời Lý (Năm 1057)"},
   {"name": "Bệ kê chân cột bằng đá chùa Phật Tích (Bắc Ninh)", "description": "Hiện vật đá nguyên khối khắc họa tỉ mỉ đồ án hoa sen kép, hình rồng uốn lượn và sư tử uy mãnh đội tòa sen.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_2.jpg", "period": "Thời Lý (Thế kỷ 11)"},
   {"name": "Tượng Hộ Pháp Kim Cương chùa Long Đọi", "description": "Tác phẩm điêu khắc đá chùa Sùng Thiện Diên Linh mang phong thái uy nghiêm, giáp trụ tinh xảo bảo vệ chốn thiền môn thanh tịnh.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_3.jpg", "period": "Thời Lý (Năm 1121)"},
   {"name": "Đầu rồng đất nung trang trí bộ mái cung điện, chùa tháp", "description": "Hiện vật đất nung từ Hoàng thành Thăng Long với đường nét uốn khúc thoăn thoắt, bờm tóc bay bổng biểu trưng cho sự thanh thoát.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh4.jpg", "period": "Thời Lý (Thế kỷ 11 - 12)"},
   {"name": "Lá đề chạm đôi rồng chầu tượng Phật thiền định", "description": "Vật liệu đất nung trang trí bờ nóc tháp chùa thời Lý chạm khắc tượng đức Phật tọa thiền trong vòm lá bồ đề thanh tịnh.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh5.jpg", "period": "Thời Lý (Thế kỷ 11)"},
   {"name": "Chân tảng đá hoa sen chạm hoa văn sóng nước thủy ba", "description": "Chân tảng cột đá chạm khắc hoa sen và đồ án sóng nước cuộn trào mang triết lý giác ngộ thiền môn sâu sắc.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh6.jpg", "period": "Thời Lý (Thế kỷ 11 - 12)"},
   {"name": "Gạch hoa cúc dây chạm rồng uốn khúc thời Lý", "description": "Gạch đất nung xây tháp Phật với họa tiết hoa cúc dây tinh xảo, thể hiện nghệ thuật trang trí cung đình và thiền môn hòa quyện.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh7.jpg", "period": "Thời Lý (Thế kỷ 11 - 13)"},
   {"name": "Thạp hoa nâu bằng chất liệu gốm tráng men thời Lý", "description": "Dòng gốm hoa nâu đặc sắc thời Lý với kỹ thuật vẽ men nâu thanh tao, hoa văn hoa sen và vũ công uyển chuyển.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh8.jpg", "period": "Thời Lý (Thế kỷ 11 - 12)"},
   {"name": "Tượng Kinnari đánh trống tại chùa Phật Tích (Bắc Ninh)", "description": "Tác phẩm nửa người nửa chim vừa đánh trống vừa dâng nhạc cúng dường chư Phật, minh chứng cho nghệ thuật âm nhạc vũ đạo thời Lý.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh10.jpg", "period": "Thời Lý (Thế kỷ 11)"},
   {"name": "Không gian trình diễn tương tác 3D Mapping & Digital Revival", "description": "Ứng dụng công nghệ trình chiếu số 3D mapping và phục dựng ảo (Digital Revival) tái hiện trọn vẹn diện mạo rực rỡ của các đại danh lam cổ tự thời Lý.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh11.jpg", "period": "Công nghệ Bảo tàng số 2025"},
   {"name": "Đầu chim phượng đất nung trang trí bộ mái cung điện, chùa tháp", "description": "Hiện vật đất nung điêu khắc đầu chim phượng hoàng với mỏ ngậm ngọc báu, mắt mở to và bộ lông tỉa nét mềm mại thanh nhã.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh12.jpg", "period": "Thời Lý (Thế kỷ 11)"},
   {"name": "Đầu tượng tiên nữ Gandharva (năm 1057) tại chùa Phật Tích", "description": "Phát hiện tại chùa Phật Tích (Tiên Du, Bắc Ninh), gương mặt tiên nữ toát lên vẻ thanh thoát, nhân từ và an lạc.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh13.jpg", "period": "Thời Lý (Năm 1057)"},
   {"name": "Trang trí hình rồng với chất liệu gốm men trắng", "description": "Tác phẩm gốm men trắng ngà quý hiếm đắp nổi hình tượng rồng thời Lý uốn khúc nhịp nhàng.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh14.jpg", "period": "Thời Lý (Thế kỷ 11 - 12)"},
   {"name": "Chuông đồng cổ tự và minh văn thiền môn thời Lý", "description": "Chuông đồng đúc quai rồng đôi, thân chuông chạm các đồ án hoa văn Phật giáo và bài minh cầu phúc thái bình thịnh trị.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/nh15.jpg", "period": "Thời Lý (Thế kỷ 12 - 13)"},
   {"name": "Tấm ốp gốm chạm tượng Kim Cương hộ pháp", "description": "Vật liệu ốp tường tháp chùa cổ với hình tượng dũng tướng Kim Cương cơ bắp cuồn cuộn, tay cầm bảo kiếm trảm ma trừ tà.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh16.jpg", "period": "Thời Lý (Thế kỷ 11 - 12)"},
   {"name": "Tượng rồng đá nguyên khối ngậm ngọc thời Lý", "description": "Khối điêu khắc đá tinh xảo uốn lượn hình sin thu nhỏ dần về đuôi, thể hiện sự linh thiêng và vương quyền Phật giáo Đại Việt.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh17.jpg", "period": "Thời Lý (Thế kỷ 11)"},
   {"name": "Không gian trải nghiệm công nghệ Gauze Projection & Hologram", "description": "Trải nghiệm không gian chiếu sương mù (gauze projection) tạo hiệu ứng thị giác 3D huyền ảo như đang lạc vào chốn thiền môn thanh tịnh thời Lý.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh18.jpg", "period": "Công nghệ Bảo tàng số 2025"},
   {"name": "Lễ cắt băng khai mạc trưng bày chuyên đề \"Vũ khúc Thiền môn\"", "description": "Các đại biểu, chuyên gia di sản văn hóa và lãnh đạo Bảo tàng Lịch sử Quốc gia cắt băng khai mạc sự kiện trưng bày chuyên đề.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh19.avif", "period": "Khai mạc ngày 16/05/2025"},
   {"name": "Đông đảo người dân và du khách tham quan trưng bày", "description": "Khán giả và du khách thập phương tham quan, chiêm ngưỡng không gian di sản Phật giáo thời Lý kết hợp trải nghiệm công nghệ số.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh20.avif", "period": "Không gian Trưng bày 2025"},
   {"name": "Khách tham quan tìm hiểu bệ kê chân cột bằng đá chùa Phật Tích", "description": "Du khách nghiên cứu hiện vật bệ đá chân cột thời Lý với đồ án hoa sen và sư tử chạm khắc sống động.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh21.avif", "period": "Thời Lý (Năm 1057)"},
   {"name": "Chi tiết đầu chim phượng trang trí bộ mái cung điện, chùa tháp", "description": "Góc nhìn cận cảnh đầu chim phượng bằng đất nung thể hiện tay nghề chế tác điêu luyện của nghệ nhân Đại Việt thời Lý.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh22.avif", "period": "Thời Lý (Thế kỷ 11 - 12)"},
   {"name": "Hiện vật tượng Kinnari đánh trống tại không gian trưng bày", "description": "Khám phá chi tiết tượng tiên nữ nửa người nửa chim đánh trống tại khu vực nghệ thuật âm nhạc và vũ đạo thiền môn.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh23.avif", "period": "Thời Lý (Thế kỷ 11)"},
   {"name": "Khu vực trưng bày đồ gốm men và thạp hoa nâu thời Lý", "description": "Tập hợp các hiện vật gốm ngự dụng và đồ thờ tự thiền môn quý hiếm thời Lý tại tủ trưng bày chuyên biệt.", "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh24.avif", "period": "Thời Lý (Thế kỷ 11 - 12)"}
 ]'::jsonb),

('TBCD02', 'Non sông liền một dải',
 'Trưng bày kỷ niệm 50 năm ngày Giải phóng miền Nam, thống nhất đất nước (30/4/1975 – 30/4/2025), giới thiệu gần 150 tài liệu, hiện vật lịch sử về khát vọng thống nhất và tình đoàn kết Bắc - Nam.',
 'Đang diễn ra', '2025-04-25', '2026-05-30',
 'Phòng Trưng bày số 2 – Số 216 Trần Quang Khải, Hoàn Kiếm, Hà Nội',
 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
 'Trưng bày giới thiệu gần 150 tài liệu, hiện vật chia làm 2 phần: "Khát vọng thống nhất" và "Nước Việt Nam là một – Dân tộc Việt Nam là một", khắc họa ý chí sắt đá và tinh thần chiến đấu quả cảm của toàn dân tộc.',
 '/images/museum-hero.jpg',
 '["/images/museum-hero.jpg", "/images/museum-building.jpg", "/images/bia-tien-si.jpg"]'::jsonb,
 '[
   {"name": "Lá cờ Mặt trận Dân tộc Giải phóng miền Nam Việt Nam", "description": "Lá cờ dẫn đầu đoàn quân tiến vào giải phóng Dinh Độc Lập lúc 11h30 trưa ngày 30/4/1975.", "image": "/images/museum-hero.jpg", "period": "Năm 1975"},
   {"name": "Sổ tay chỉ đạo chiến dịch Hồ Chí Minh lịch sử", "description": "Ghi lại các mốc thời gian, mệnh lệnh tác chiến quyết định mở màn và kết thúc chiến dịch.", "image": "/images/bia-tien-si.jpg", "period": "Tháng 4/1975"},
   {"name": "Xe đạp thồ của chiến sĩ vận tải chiến trường", "description": "Phương tiện vận tải thô sơ huyền thoại vượt dãy Trường Sơn chi viện vũ khí, lương thực cho tiền tuyến.", "image": "/images/museum-building.jpg", "period": "Kháng chiến chống Mỹ"}
 ]'::jsonb),

('TBCD03', 'Rồng trên cổ vật – Biểu tượng quyền uy & tâm linh',
 'Chuyên đề đặc biệt giới thiệu sự biến đổi của biểu tượng Rồng thiêng qua hơn 2.000 năm lịch sử văn hóa Việt Nam, từ thời kỳ văn hóa Đông Sơn, Lý - Trần - Lê cho đến triều Nguyễn.',
 'Sắp diễn ra', '2026-10-10', '2027-02-28',
 'Gian Trưng bày Trung tâm – Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
 'Trưng bày tập hợp hơn 60 cổ vật quý hiếm từ văn hóa Đông Sơn hơn 2.000 năm trước, qua các thời kỳ Đinh - Tiền Lê, Lý - Trần, Lê Sơ cho đến triều Nguyễn thế kỷ 19, minh chứng cho sự tiến hóa độc đáo của mỹ cảm dân tộc.',
 '/images/trong-dong.jpg',
 '["/images/trong-dong.jpg", "/images/tuong-phat.jpg", "/images/binh-gom.jpg"]'::jsonb,
 '[
   {"name": "Ấn vàng Sắc mệnh chi bảo triều Nguyễn", "description": "Bảo vật hoàng gia đúc năm Minh Mạng thứ 8 (1827) bằng vàng ròng, núm ấn chạm khắc hình rồng uốn lượn uy nghiêm.", "image": "/images/trong-dong.jpg", "period": "Triều Nguyễn (Năm 1827)"},
   {"name": "Rồng đá trang trí thềm điện Kính Thiên", "description": "Tác phẩm điêu khắc đá thế kỷ 15 mang phong cách quyền uy, khỏe khoắn thời Lê Sơ tại Hoàng thành Thăng Long.", "image": "/images/tuong-phat.jpg", "period": "Thời Lê Sơ (Thế kỷ 15)"},
   {"name": "Thạp đồng Đông Sơn trang trí hoa văn giao long", "description": "Cổ vật hơn 2.000 năm tuổi thể hiện cội nguồn hình tượng Rồng trong tâm thức và tín ngưỡng cư dân nông nghiệp lúa nước.", "image": "/images/binh-gom.jpg", "period": "Văn hóa Đông Sơn"}
 ]'::jsonb),

('TBCD04', 'Điện Biên Phủ – Tinh thần bất diệt',
 'Trưng bày gần 150 hiện vật, tài liệu quý tái hiện chiến thắng Điện Biên Phủ "lừng lẫy năm châu, chấn động địa cầu" nhân kỷ niệm 70 năm chiến thắng Điện Biên Phủ và Hiệp định Genève.',
 'Đã diễn ra', '2024-05-07', '2024-09-30',
 'Phòng Trưng bày Lịch sử Hiện đại – Số 216 Trần Quang Khải, Hà Nội',
 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
 'Chiến thắng Điện Biên Phủ ngày 7/5/1954 là mốc son chói lọi trong lịch sử đấu tranh giữ nước của dân tộc Việt Nam. Trưng bày tái hiện toàn diện từ công tác chuẩn bị hậu cần, kéo pháo vào trận địa cho đến các đợt tiến công đập tan tập đoàn cứ điểm Pháp.',
 '/images/museum-building.jpg',
 '["/images/museum-building.jpg", "/images/museum-hero.jpg", "/images/bia-tien-si.jpg"]'::jsonb,
 '[
   {"name": "Bản đồ tác chiến chiến dịch Điện Biên Phủ", "description": "Bản đồ tác chiến của Bộ Tổng tham mưu Quân đội nhân dân Việt Nam với các mũi tiến công của quân ta năm 1954.", "image": "/images/museum-building.jpg", "period": "Năm 1954"},
   {"name": "Chiếc cúp chiến lợi phẩm từ sở chỉ huy hầm De Castries", "description": "Thu giữ vào chiều ngày 7/5/1954 khi phân đội bộ binh cắm cờ quyết chiến quyết thắng trên nóc hầm chỉ huy Pháp.", "image": "/images/binh-gom.jpg", "period": "Tháng 5/1954"},
   {"name": "Đèn bão kéo pháo vào trận địa", "description": "Dụng cụ soi đường thầm lặng của bộ đội ta vượt qua đèo dốc hiểm trở để đưa những khẩu pháo ngàn cân vào trận địa.", "image": "/images/bia-tien-si.jpg", "period": "Năm 1954"}
 ]'::jsonb),

('TBCD05', 'Gốm cổ Bát Tràng – Tinh hoa ngàn năm',
 'Giới thiệu bộ sưu tập 39 hiện vật gốm cổ tinh hoa độc bản từ thế kỷ 14 đến thế kỷ 20, tôn vinh các dòng men lam, men rạn, men ngọc độc đáo của làng gốm Bát Tràng.',
 'Đã diễn ra', '2023-05-18', '2023-12-31',
 'Gian Trưng bày Cổ vật Tầng 2 – Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội',
 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
 'Làng gốm Bát Tràng nằm bên tả ngạn sông Hồng là một trong những trung tâm sản xuất gốm sứ lâu đời và phồn vinh bậc nhất Việt Nam. Trưng bày tuyển chọn 39 hiện vật gốm cổ tiêu biểu từ thời Trần, Mạc, Lê Trung Hưng đến triều Nguyễn.',
 '/images/binh-gom.jpg',
 '["/images/binh-gom.jpg", "/images/trong-dong.jpg", "/images/tuong-phat.jpg"]'::jsonb,
 '[
   {"name": "Chân đèn gốm hoa lam thời Mạc (1572)", "description": "Tác phẩm độc bản của nghệ nhân Đỗ Phủ với nét vẽ rồng mây phóng khoáng, minh văn ghi niên hiệu Sùng Khang thứ 7.", "image": "/images/binh-gom.jpg", "period": "Thời Mạc (Năm 1572)"},
   {"name": "Lư hương gốm men rạn đắp nổi thời Lê Trung Hưng", "description": "Đặc trưng nghệ thuật men rạn ngà đắp nổi hoa văn lưỡng long chầu nguyệt tinh xảo thế kỷ 18.", "image": "/images/tuong-phat.jpg", "period": "Thời Lê Trung Hưng (Thế kỷ 18)"},
   {"name": "Bình vôi cổ hoa văn men ngũ sắc thời Nguyễn", "description": "Vật phẩm gốm sinh hoạt gắn liền với phong tục ăn trầu truyền thống và đời sống văn hóa cung đình Huế.", "image": "/images/trong-dong.jpg", "period": "Triều Nguyễn (Thế kỷ 19)"}
 ]'::jsonb),

('TBCD06', 'Máu và Hoa – Hà Nội 12 ngày đêm',
 'Tái hiện 12 ngày đêm chiến đấu ngoan cường đánh bại cuộc tập kích chiến lược B-52 của không quân Mỹ, làm nên kỳ tích "Điện Biên Phủ trên không" vang dội của quân dân Thủ đô.',
 'Đã diễn ra', '2022-12-18', '2023-04-30',
 'Phòng Trưng bày Lịch sử Hiện đại – Số 216 Trần Quang Khải, Hà Nội',
 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
 'Tháng 12/1972, không quân Mỹ tiến hành chiến dịch tập kích chiến lược Linebacker II vào Hà Nội và Hải Phòng. Với lòng dũng cảm phi thường, quân dân ta đã lập nên kỳ tích bắn rơi 81 máy bay Mỹ, buộc Mỹ ký Hiệp định Paris.',
 '/images/bia-tien-si.jpg',
 '["/images/bia-tien-si.jpg", "/images/museum-hero.jpg", "/images/museum-building.jpg"]'::jsonb,
 '[
   {"name": "Mảnh xác pháo đài bay B-52 rơi tại hồ Hữu Tiệp", "description": "Chứng tích chiến thắng bắn rơi B-52 tại chỗ của tiểu đoàn tên lửa 72 đêm 27/12/1972 tại làng hoa Ngọc Hà.", "image": "/images/bia-tien-si.jpg", "period": "Tháng 12/1972"},
   {"name": "Mũ phi công Mỹ và trang bị lái dù", "description": "Chiến lợi phẩm thu được từ các phi công lái máy bay ném bom bị quân dân Thủ đô bắt sống.", "image": "/images/museum-hero.jpg", "period": "Năm 1972"},
   {"name": "Đài quan sát phòng không trên đỉnh Nhà hát Lớn Hà Nội", "description": "Tư liệu về mạng lưới quan sát và hệ thống còi báo động phòng không bảo vệ tính mạng nhân dân Thủ đô.", "image": "/images/museum-building.jpg", "period": "Năm 1972"}
 ]'::jsonb),

('TBCD07', 'Bình dân học vụ – Thắp sáng tương lai',
 'Giới thiệu nhiều tư liệu, hiện vật quý về phong trào xóa nạn mù chữ do Chủ tịch Hồ Chí Minh phát động ngay sau Cách mạng Tháng Tám năm 1945.',
 'Đã diễn ra', '2025-08-22', '2025-12-31',
 'Gian Trưng bày Giáo dục Văn hóa – Số 216 Trần Quang Khải, Hà Nội',
 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
 'Phong trào Bình dân học vụ đã trở thành cuộc vận động văn hóa sâu rộng bậc nhất, mang ánh sáng chữ quốc ngữ đến cho hàng triệu người dân nghèo trên khắp mọi miền Tổ quốc trong những năm tháng kháng chiến gian khổ.',
 '/images/trong-dong.jpg',
 '["/images/trong-dong.jpg", "/images/bia-tien-si.jpg", "/images/museum-hero.jpg"]'::jsonb,
 '[
   {"name": "Huy hiệu Bình dân học vụ (1945-1946)", "description": "Biểu trưng vinh danh các giáo viên và học viên hoàn thành xuất sắc các lớp học xóa mù chữ.", "image": "/images/trong-dong.jpg", "period": "Năm 1945 - 1946"},
   {"name": "Thư khen của Chủ tịch Hồ Chí Minh ngày 24/2/1948", "description": "Bức thư Bác gửi toàn thể bộ đội khu 2 và khu 3 về thành tích 100% cán bộ chiến sĩ biết đọc, biết viết.", "image": "/images/bia-tien-si.jpg", "period": "Năm 1948"},
   {"name": "Sách Phương pháp và cách thức dạy vỡ lòng chữ quốc ngữ", "description": "Ấn bản Hà Nội năm 1946 làm giáo trình chuẩn cho phong trào Bình dân học vụ cả nước.", "image": "/images/museum-hero.jpg", "period": "Năm 1946"}
 ]'::jsonb),

('TBCD08', 'Thi đua ái quốc – Ươm những mầm xanh',
 'Trưng bày chuyên đề kỷ niệm 75 năm ngày Chủ tịch Hồ Chí Minh ra Lời kêu gọi thi đua ái quốc (11/6/1948 – 11/6/2023), lan tỏa các phong trào Ba sẵn sàng, Năm xung phong, Hũ gạo cứu đói.',
 'Đã diễn ra', '2023-06-11', '2023-11-30',
 'Phòng Trưng bày Chuyên đề – Số 216 Trần Quang Khải, Hà Nội',
 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra',
 'Ngày 11/6/1948, Chủ tịch Hồ Chí Minh ra Lời kêu gọi thi đua ái quốc, mở đầu cho phong trào thi đua yêu nước sôi nổi khắp cả nước, khơi dậy sức mạnh của toàn thể dân tộc vượt qua mọi gian khổ kiến thiết đất nước.',
 '/images/museum-hero.jpg',
 '["/images/museum-hero.jpg", "/images/tuong-phat.jpg", "/images/trong-dong.jpg"]'::jsonb,
 '[
   {"name": "Bản in Lời kêu gọi Thi đua ái quốc năm 1948", "description": "Tài liệu lịch sử mở đầu cho phong trào thi đua yêu nước sâu rộng trong toàn quân và toàn dân.", "image": "/images/museum-hero.jpg", "period": "Năm 1948"},
   {"name": "Cờ luân lưu phong trào Dạy tốt - Học tốt", "description": "Phần thưởng thi đua cao quý trao tặng cho các trường học và đơn vị giáo dục có thành tích xuất sắc.", "image": "/images/tuong-phat.jpg", "period": "Giai đoạn 1960 - 1970"},
   {"name": "Huy hiệu Chiến sĩ thi đua toàn quốc khóa I", "description": "Kỷ vật trao tặng tại Đại hội Chiến sĩ thi đua và Cán bộ gương mẫu toàn quốc năm 1952 tại chiến khu Việt Bắc.", "image": "/images/trong-dong.jpg", "period": "Năm 1952"}
 ]'::jsonb);
