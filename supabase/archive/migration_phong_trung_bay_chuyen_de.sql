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
  location, source_url, source_note, detailed_content, image, gallery_images, highlight_artifacts
) VALUES
('TBCD01', 'Vũ khúc Thiền môn - Nghệ thuật Phật giáo thời Lý: Di sản và Công nghệ', 'Ứng dụng công nghệ tương tác số hiện đại (3D mapping, hologram, AI, gauze projection) kết hợp trưng bày 14 hiện vật gốc tiêu biểu để diễn giải sinh động 4 trụ cột đỉnh cao: Kiến trúc chùa tháp, Điêu khắc đá, Đồ gốm men và Âm nhạc vũ đạo Phật giáo thời Lý.', 'Đang diễn ra', '2025-05-16', '2026-11-30',
 'Phòng Trưng bày Chuyên đề số 1, Tầng 1 – Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội', 'https://nhandan.vn/vu-khuc-thien-mon-gioi-thieu-nghe-thuat-phat-giao-thoi-ly-post880239.html', 'Bảo tàng Lịch sử Quốc gia (baotanglichsu.vn)', 'Trưng bày chuyên đề "Vũ khúc Thiền môn - Nghệ thuật Phật giáo thời Lý: Di sản và Công nghệ" do Bảo tàng Lịch sử Quốc gia phối hợp cùng Viện Nghiên cứu Văn minh Châu Á và Công ty TNHH C.M.Y.K Việt Nam tổ chức nhân dịp Ngày Quốc tế Bảo tàng, Ngày Khoa học Công nghệ Việt Nam (18/5) và kỷ niệm 135 năm Ngày sinh Chủ tịch Hồ Chí Minh.

Nghệ thuật Phật giáo thời Lý (thế kỷ XI - XIII) là đỉnh cao rực rỡ của mỹ thuật Đại Việt, là sự kết hợp độc đáo giữa tinh thần Thiền tông và văn hóa bản địa, nghệ thuật cung đình và dân gian tạo nên phong cách thanh thoát mà uy nghi, linh thiêng mà gần gũi.

Không gian trưng bày tập trung vào 4 lĩnh vực nghệ thuật tiêu biểu:
1. Nghệ thuật kiến trúc chùa tháp: Các đại danh lam quốc tự như chùa Một Cột (Diên Hựu), tháp Báo Thiên, chùa Dạm, chùa Phật Tích, chùa Long Đọi...
2. Nghệ thuật điêu khắc: Kỹ thuật chế tác tượng tròn, phù điêu, chạm nổi, chạm lộng mềm mại, uyển chuyển, cân đối, hài hòa với bệ đá chân cột, tượng Kim Cương, tượng Phật A Di Đà.
3. Nghệ thuật trên đồ gốm: Các dòng gốm men trắng ngà, men nâu, hoa nâu, men ngọc (Celadon) với hoa văn hoa sen, cúc dây, chim phượng, rồng thiêng.
4. Nghệ thuật âm nhạc và vũ đạo: Nghi lễ tôn giáo hòa quyện với vũ điệu dâng hoa, nhạc khí và điệu múa của các tiên nữ Gandharva, tượng Kinnari đánh trống tại chùa Phật Tích.

Đặc biệt, sự kết hợp của các kỹ thuật công nghệ số đỉnh cao gồm 3D Mapping, Hologram 3 chiều, Phục dựng kỹ thuật số (Digital Revival), Gauze Projection (trình diễn sương mù) và Trí tuệ nhân tạo (AI) giúp tái sinh các "mảnh vỡ di sản", mang lại cho công chúng trải nghiệm đa giác quan sâu sắc và sống động.', 'https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_1.jpg',
 '["https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_1.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_2.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_3.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh4.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh5.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh6.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh7.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh8.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh10.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh11.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh12.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh13.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh14.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/nh15.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh16.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh17.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh18.jpg","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh19.avif","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh20.avif","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh21.avif","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh22.avif","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh23.avif","https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh24.avif"]'::jsonb,
 '[
  {
    "name": "Tượng Phật A Di Đà chùa Phật Tích (Bảo vật Quốc gia)",
    "description": "Đỉnh cao điêu khắc đá thời vua Lý Thánh Tông (năm 1057), pho tượng ngồi thiền định tọa trên tòa sen nhiều tầng chạm khắc rồng và hoa văn tinh xảo.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_1.jpg",
    "period": "Thời Lý (Năm 1057)"
  },
  {
    "name": "Bệ kê chân cột bằng đá chùa Phật Tích (Bắc Ninh)",
    "description": "Hiện vật đá nguyên khối khắc họa tỉ mỉ đồ án hoa sen kép, hình rồng uốn lượn và sư tử uy mãnh đội tòa sen.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_2.jpg",
    "period": "Thời Lý (Thế kỷ 11)"
  },
  {
    "name": "Tượng Hộ Pháp Kim Cương chùa Long Đọi",
    "description": "Tác phẩm điêu khắc đá chùa Sùng Thiện Diên Linh mang phong thái uy nghiêm, giáp trụ tinh xảo bảo vệ chốn thiền môn thanh tịnh.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh_3.jpg",
    "period": "Thời Lý (Năm 1121)"
  },
  {
    "name": "Đầu rồng đất nung trang trí bộ mái cung điện, chùa tháp",
    "description": "Hiện vật đất nung từ Hoàng thành Thăng Long với đường nét uốn khúc thoăn thoắt, bờm tóc bay bổng biểu trưng cho sự thanh thoát.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh4.jpg",
    "period": "Thời Lý (Thế kỷ 11 - 12)"
  },
  {
    "name": "Lá đề chạm đôi rồng chầu tượng Phật thiền định",
    "description": "Vật liệu đất nung trang trí bờ nóc tháp chùa thời Lý chạm khắc tượng đức Phật tọa thiền trong vòm lá bồ đề thanh tịnh.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh5.jpg",
    "period": "Thời Lý (Thế kỷ 11)"
  },
  {
    "name": "Chân tảng đá hoa sen chạm hoa văn sóng nước thủy ba",
    "description": "Chân tảng cột đá chạm khắc hoa sen và đồ án sóng nước cuộn trào mang triết lý giác ngộ thiền môn sâu sắc.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh6.jpg",
    "period": "Thời Lý (Thế kỷ 11 - 12)"
  },
  {
    "name": "Gạch hoa cúc dây chạm rồng uốn khúc thời Lý",
    "description": "Gạch đất nung xây tháp Phật với họa tiết hoa cúc dây tinh xảo, thể hiện nghệ thuật trang trí cung đình và thiền môn hòa quyện.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh7.jpg",
    "period": "Thời Lý (Thế kỷ 11 - 13)"
  },
  {
    "name": "Thạp hoa nâu bằng chất liệu gốm tráng men thời Lý",
    "description": "Dòng gốm hoa nâu đặc sắc thời Lý với kỹ thuật vẽ men nâu thanh tao, hoa văn hoa sen và vũ công uyển chuyển.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh8.jpg",
    "period": "Thời Lý (Thế kỷ 11 - 12)"
  },
  {
    "name": "Tượng Kinnari đánh trống tại chùa Phật Tích (Bắc Ninh)",
    "description": "Tác phẩm nửa người nửa chim vừa đánh trống vừa dâng nhạc cúng dường chư Phật, minh chứng cho nghệ thuật âm nhạc vũ đạo thời Lý.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh10.jpg",
    "period": "Thời Lý (Thế kỷ 11)"
  },
  {
    "name": "Không gian trình diễn tương tác 3D Mapping & Digital Revival",
    "description": "Ứng dụng công nghệ trình chiếu số 3D mapping và phục dựng ảo (Digital Revival) tái hiện trọn vẹn diện mạo rực rỡ của các đại danh lam cổ tự thời Lý.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh11.jpg",
    "period": "Công nghệ Bảo tàng số 2025"
  },
  {
    "name": "Đầu chim phượng đất nung trang trí bộ mái cung điện, chùa tháp",
    "description": "Hiện vật đất nung điêu khắc đầu chim phượng hoàng với mỏ ngậm ngọc báu, mắt mở to và bộ lông tỉa nét mềm mại thanh nhã.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh12.jpg",
    "period": "Thời Lý (Thế kỷ 11)"
  },
  {
    "name": "Đầu tượng tiên nữ Gandharva (năm 1057) tại chùa Phật Tích",
    "description": "Phát hiện tại chùa Phật Tích (Tiên Du, Bắc Ninh), gương mặt tiên nữ toát lên vẻ thanh thoát, nhân từ và an lạc.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh13.jpg",
    "period": "Thời Lý (Năm 1057)"
  },
  {
    "name": "Trang trí hình rồng với chất liệu gốm men trắng",
    "description": "Tác phẩm gốm men trắng ngà quý hiếm đắp nổi hình tượng rồng thời Lý uốn khúc nhịp nhàng.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh14.jpg",
    "period": "Thời Lý (Thế kỷ 11 - 12)"
  },
  {
    "name": "Chuông đồng cổ tự và minh văn thiền môn thời Lý",
    "description": "Chuông đồng đúc quai rồng đôi, thân chuông chạm các đồ án hoa văn Phật giáo và bài minh cầu phúc thái bình thịnh trị.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/nh15.jpg",
    "period": "Thời Lý (Thế kỷ 12 - 13)"
  },
  {
    "name": "Tấm ốp gốm chạm tượng Kim Cương hộ pháp",
    "description": "Vật liệu ốp tường tháp chùa cổ với hình tượng dũng tướng Kim Cương cơ bắp cuồn cuộn, tay cầm bảo kiếm trảm ma trừ tà.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh16.jpg",
    "period": "Thời Lý (Thế kỷ 11 - 12)"
  },
  {
    "name": "Tượng rồng đá nguyên khối ngậm ngọc thời Lý",
    "description": "Khối điêu khắc đá tinh xảo uốn lượn hình sin thu nhỏ dần về đuôi, thể hiện sự linh thiêng và vương quyền Phật giáo Đại Việt.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh17.jpg",
    "period": "Thời Lý (Thế kỷ 11)"
  },
  {
    "name": "Không gian trải nghiệm công nghệ Gauze Projection & Hologram",
    "description": "Trải nghiệm không gian chiếu sương mù (gauze projection) tạo hiệu ứng thị giác 3D huyền ảo như đang lạc vào chốn thiền môn thanh tịnh thời Lý.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh18.jpg",
    "period": "Công nghệ Bảo tàng số 2025"
  },
  {
    "name": "Lễ cắt băng khai mạc trưng bày chuyên đề \"Vũ khúc Thiền môn\"",
    "description": "Các đại biểu, chuyên gia di sản văn hóa và lãnh đạo Bảo tàng Lịch sử Quốc gia cắt băng khai mạc sự kiện trưng bày chuyên đề.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh19.avif",
    "period": "Khai mạc ngày 16/05/2025"
  },
  {
    "name": "Đông đảo người dân và du khách tham quan trưng bày",
    "description": "Khán giả và du khách thập phương tham quan, chiêm ngưỡng không gian di sản Phật giáo thời Lý kết hợp trải nghiệm công nghệ số.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh20.avif",
    "period": "Không gian Trưng bày 2025"
  },
  {
    "name": "Khách tham quan tìm hiểu bệ kê chân cột bằng đá chùa Phật Tích",
    "description": "Du khách nghiên cứu hiện vật bệ đá chân cột thời Lý với đồ án hoa sen và sư tử chạm khắc sống động.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh21.avif",
    "period": "Thời Lý (Năm 1057)"
  },
  {
    "name": "Chi tiết đầu chim phượng trang trí bộ mái cung điện, chùa tháp",
    "description": "Góc nhìn cận cảnh đầu chim phượng bằng đất nung thể hiện tay nghề chế tác điêu luyện của nghệ nhân Đại Việt thời Lý.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh22.avif",
    "period": "Thời Lý (Thế kỷ 11 - 12)"
  },
  {
    "name": "Hiện vật tượng Kinnari đánh trống tại không gian trưng bày",
    "description": "Khám phá chi tiết tượng tiên nữ nửa người nửa chim đánh trống tại khu vực nghệ thuật âm nhạc và vũ đạo thiền môn.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh23.avif",
    "period": "Thời Lý (Thế kỷ 11)"
  },
  {
    "name": "Khu vực trưng bày đồ gốm men và thạp hoa nâu thời Lý",
    "description": "Tập hợp các hiện vật gốm ngự dụng và đồ thờ tự thiền môn quý hiếm thời Lý tại tủ trưng bày chuyên biệt.",
    "image": "https://yzscfptnwecjutaobyzm.supabase.co/storage/v1/object/public/anh_hien_vat/anh24.avif",
    "period": "Thời Lý (Thế kỷ 11 - 12)"
  }
]'::jsonb),

('TBCD02', 'Non sông liền một dải', 'Trưng bày kỷ niệm 50 năm ngày Giải phóng miền Nam, thống nhất đất nước (30/4/1975 – 30/4/2025), giới thiệu gần 150 tài liệu, hiện vật lịch sử về khát vọng thống nhất và tình đoàn kết Bắc - Nam.', 'Đang diễn ra', '2025-04-25', '2026-05-30',
 'Phòng Trưng bày số 2 – Số 216 Trần Quang Khải, Hoàn Kiếm, Hà Nội', 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra', 'Bảo tàng Lịch sử Quốc gia (baotanglichsu.vn)', 'Nhân dịp kỷ niệm 50 năm ngày Giải phóng miền Nam, thống nhất đất nước (30/4/1975 – 30/4/2025), trưng bày giới thiệu gần 150 tài liệu, hiện vật chia làm 2 phần chính: "Khát vọng thống nhất" và "Nước Việt Nam là một – Dân tộc Việt Nam là một". Trưng bày khắc họa những bước chuyển biến chiến lược, sự lãnh đạo tài tình của Đảng và tinh thần chiến đấu quả cảm của quân và dân hai miền Nam - Bắc.', '/images/museum-hero.jpg',
 '["/images/museum-hero.jpg","/images/museum-building.jpg","/images/bia-tien-si.jpg"]'::jsonb,
 '[
  {
    "name": "Lá cờ Mặt trận Dân tộc Giải phóng miền Nam Việt Nam",
    "description": "Lá cờ dẫn đầu đoàn quân tiến vào giải phóng Dinh Độc Lập lúc 11h30 trưa ngày 30/4/1975.",
    "image": "/images/museum-hero.jpg",
    "period": "Năm 1975"
  },
  {
    "name": "Sổ tay chỉ đạo chiến dịch Hồ Chí Minh lịch sử",
    "description": "Ghi lại các mốc thời gian, mệnh lệnh tác chiến quyết định mở màn và kết thúc chiến dịch giải phóng Sài Gòn.",
    "image": "/images/bia-tien-si.jpg",
    "period": "Tháng 4/1975"
  },
  {
    "name": "Xe đạp thồ của chiến sĩ vận tải chiến trường",
    "description": "Phương tiện vận tải thô sơ huyền thoại vượt dãy Trường Sơn chi viện vũ khí, lương thực cho tiền tuyến.",
    "image": "/images/museum-building.jpg",
    "period": "Kháng chiến chống Mỹ"
  }
]'::jsonb),

('TBCD03', 'Rồng trên cổ vật qua sưu tập hiện vật Bảo tàng Lịch sử quốc gia', 'Bộ sưu tập 25 hiện vật quý hiếm giới thiệu sự tiến hóa và ý nghĩa linh thiêng, quyền uy của hình tượng Rồng qua hơn 2.000 năm lịch sử văn hóa Việt Nam từ thời Đông Sơn, Lý, Trần, Lê, Mạc đến triều Nguyễn.', 'Đang diễn ra', '2024-01-20', '2026-12-31',
 'Phòng Trưng bày Chuyên đề số 1, Tầng 1 – Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội', 'https://baotanglichsu.vn/vi/Articles/3096/74471/rong-tren-co-vat-qua-suu-tap-hien-vat-bao-tang-lich-su-quoc-gia.html', 'Bảo tàng Lịch sử Quốc gia (baotanglichsu.vn) - Phòng Nghiên cứu Sưu tầm', 'Rồng là hình tượng có vị trí đặc biệt trong văn hóa, tín ngưỡng của nhiều dân tộc trên thế giới, trong đó có dân tộc Việt Nam. Ở Việt Nam, hình tượng rồng xuất hiện rất sớm vào buổi đầu dựng nước Văn Lang - Âu Lạc và trở thành biểu tượng linh thiêng gắn với Tổ Tiên, cội nguồn "con Rồng cháu Tiên" của dân tộc. Nằm trong khu vực là cái nôi của nền văn minh lúa nước, rồng Việt Nam còn giữ vai trò là một Phúc thần mang lại mưa thuận gió hòa, mùa màng tươi tốt.

Trưng bày chuyên đề "Rồng trên cổ vật" do Bảo tàng Lịch sử Quốc gia tổ chức giới thiệu 25 hiện vật tiêu biểu phân theo 5 giai đoạn tiến hóa mỹ thuật đỉnh cao:

1. Văn hóa Đông Sơn (khoảng 2.500 - 2.000 năm cách ngày nay): Xuất phát từ cư dân nông nghiệp ven sông, "rồng" được hình dung từ con vật thân dài có vẩy như cá sấu (Giao Long) trang trí trên họng rìu đồng, qua đồng và tấm che ngực (hộ tâm phiến).
2. Thời kỳ 10 thế kỷ đầu Công nguyên (Thế kỷ I - X): Hình tượng rồng tiếp thu giao lưu văn hóa qua gương đồng đúc nổi Nghi Vệ (Bắc Ninh), bích đồng thần thú Thanh Long và trán bia chùa Trường Xuân (năm 618).
3. Thời Lý - Trần (Thế kỷ XI - XIV): Rồng gắn với vương quyền và Phật giáo thiền môn; rồng thời Lý thân tròn lượn sóng hình sin mềm mại dạng lá đề, bờm bay uyển chuyển; rồng thời Trần khỏe khoắn, có sừng, móng vuốt vững chãi trên kiến trúc chùa tháp, bệ đá và cửa gỗ chùa Phổ Minh.
4. Thời Lê Sơ - Mạc - Lê Trung Hưng (Thế kỷ XV - XVIII): Phân định nghiêm ngặt đồ ngự dụng của nhà vua (rồng 5 móng) và quan lại (rồng 4 móng), rồng mây đao lửa, rồng đuôi cá trên gạch điện miếu Lam Kinh, gốm hoa lam Cù Lao Chàm, cửa gỗ chùa Keo và lư hương gốm men tứ linh.
5. Thời Nguyễn (Thế kỷ XIX - Đầu thế kỷ XX): Đỉnh cao quyền uy quân chủ với tượng rồng vàng, kim sách thời Gia Long, ấn vàng "Sắc mệnh chi bảo" (Bảo vật Quốc gia), tranh "Đại Nam lịch đại long phi đồ" khẳng định khí thế vươn lên và sự cường thịnh của non sông Đại Nam.', 'https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/1.jpg',
 '["https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/1.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/2.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/3.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/4.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/5.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/6.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/7.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/8.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/9.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/10.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/11.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/12a.png","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/13.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/14.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/15.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/16.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/17.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/18.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/19.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/20.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/22.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/23.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/24.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/25.jpg","https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/26.jpg"]'::jsonb,
 '[
  {
    "name": "Giao Long trang trí trên họng rìu đồng Đông Sơn",
    "description": "Hiện vật rìu đồng văn hóa Đông Sơn khắc họa hình tượng Giao Long (cá sấu) - cội nguồn biểu tượng rồng của cư dân nông nghiệp lúa nước buổi đầu dựng nước Văn Lang - Âu Lạc.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/1.jpg",
    "period": "Văn hóa Đông Sơn (2.500 - 2.000 năm trước)"
  },
  {
    "name": "Giao Long (cá sấu) trang trí trên qua đồng Đông Sơn",
    "description": "Vũ khí qua đồng thời kỳ Đông Sơn chạm khắc tinh xảo hình cá sấu Giao Long thân dài có vẩy, biểu trưng cho sức mạnh và vật Tổ bảo hộ của người Việt cổ.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/2.jpg",
    "period": "Văn hóa Đông Sơn (2.500 - 2.000 năm trước)"
  },
  {
    "name": "Giao Long trang trí trên tấm che ngực (hộ tâm phiến) đồng",
    "description": "Hộ tâm phiến bằng đồng đúc nổi hình tượng hai Giao Long đối xứng, dùng để hộ vệ chiến binh và mang ý nghĩa tâm linh cầu sự bình an, mùa màng bội thu.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/3.jpg",
    "period": "Văn hóa Đông Sơn (2.500 - 2.000 năm trước)"
  },
  {
    "name": "Hình rồng đúc nổi trên gương đồng Nghi Vệ (Bắc Ninh)",
    "description": "Hiện vật độc bản phát hiện tại Nghi Vệ (Bắc Ninh), đúc nổi hoa văn rồng thời kỳ đầu Công nguyên, minh chứng cho sự tiếp biến văn hóa sâu sắc.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/4.jpg",
    "period": "Thế kỷ 3 - 4"
  },
  {
    "name": "Thần thú Thanh Long trong Tứ linh trang trí nổi trên bích đồng",
    "description": "Bích đồng đúc nổi hình tượng rồng Thanh Long kết hợp cùng Bạch Hổ, Chu Tước, Huyền Vũ biểu trưng cho bốn phương trời và sự hài hòa vũ trụ.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/5.jpg",
    "period": "Thế kỷ 1 - 3"
  },
  {
    "name": "Hình rồng trang trí trên trán bia Trường Xuân (Thanh Hóa)",
    "description": "Bia đá cổ niên đại năm 618 triều Tùy Đại Nghiệp ghi lại việc lập đạo tràng Bảo An Phật giáo tại Cửu Chân, trán bia chạm đôi rồng đấu lưng vào nhau độc đáo.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/6.jpg",
    "period": "Năm 618 (Thế kỷ 7)"
  },
  {
    "name": "Hình rồng trang trí kiến trúc hình lá đề chùa Phật Tích (Bắc Ninh)",
    "description": "Điêu khắc đá thời vua Lý Thánh Tông (năm 1056) chạm đôi rồng uốn lượn hình sin mềm mại, bờm tóc bay bổng chầu trong vòm lá bồ đề Phật giáo.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/7.jpg",
    "period": "Thời Lý (Năm 1056, Thế kỷ 11)"
  },
  {
    "name": "Hình rồng đắp nổi trang trí trên bệ tháp gốm men trắng",
    "description": "Gốm men trắng thời Lý chế tác tinh xảo, thân rồng 3 móng tròn trơn nhẵn uốn lượn thắt túi quanh chân bệ tháp bảo tháp Phật giáo.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/8.jpg",
    "period": "Thời Lý (Thế kỷ 11 - 13)"
  },
  {
    "name": "Đầu rồng đất nung trang trí bờ nóc kiến trúc cung điện, chùa tháp",
    "description": "Tác phẩm đất nung điêu khắc đầu rồng thời Lý với miệng ngậm ngọc châu, vòi uốn lượn, mũi lửa và bờm mượt mà thanh thoát mang đậm tinh thần Thiền tông.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/9.jpg",
    "period": "Thời Lý (Thế kỷ 11 - 13)"
  },
  {
    "name": "Hình rồng trang trí trong nửa lá đề đất nung thời Trần",
    "description": "Chi tiết trang trí kiến trúc đất nung thời Trần với hình tượng rồng 4 móng khỏe khoắn, có vảy và vây nhọn, biểu thị hào khí Đông A quật cường.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/10.jpg",
    "period": "Thời Trần (Thế kỷ 13 - 14)"
  },
  {
    "name": "Hình rồng chạm khắc trên cánh cửa gỗ chùa Phổ Minh (Nam Định)",
    "description": "Kiệt tác điêu khắc gỗ thời Trần tại quốc tự Phổ Minh, đồ án rồng cuộn uốn lượn trong lá đề với đường nét đục chạm tầng tầng lớp lớp tinh vi tuyệt hảo.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/11.jpg",
    "period": "Thời Trần (Thế kỷ 13 - 14)"
  },
  {
    "name": "Chi tiết đôi rồng chầu trên cánh cửa gỗ chùa Phổ Minh",
    "description": "Toàn cảnh cánh cửa gỗ chạm khắc đôi rồng thời Trần chầu chữ Phật, đại diện cho đỉnh cao nghệ thuật điêu khắc gỗ cổ truyền Đại Việt.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/12a.png",
    "period": "Thời Trần (Thế kỷ 13 - 14)"
  },
  {
    "name": "Rồng trang trí trên đôi đầu võng và bàn đạp yên ngựa bằng đồng",
    "description": "Hiện vật kim loại đồng quý hiếm thời Trần chạm khắc hình rồng trang trí ngự dụng trên yên ngựa và đầu đòn võng của tầng lớp quý tộc hoàng gia.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/13.jpg",
    "period": "Thời Trần (Thế kỷ 13 - 14)"
  },
  {
    "name": "Hình rồng trang trí trên gạch lát nền điện miếu Lam Kinh (Thanh Hóa)",
    "description": "Gạch đất nung khai quật tại Hoàng thành Lam Kinh chạm hình rồng 5 móng thời vua Lê Thái Tổ - Lê Thánh Tông, biểu trưng cho quyền uy tối thượng của vương triều Lê Sơ.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/14.jpg",
    "period": "Thời Lê Sơ (Thế kỷ 15)"
  },
  {
    "name": "Hình rồng trang trí trên diềm ngói gốm men vàng Lam Kinh",
    "description": "Diềm ngói tráng men hoàng lưu ly tráng lệ khai quật tại Lam Kinh, chạm khắc hình rồng mây uyển chuyển trên mái cung điện hoàng gia thời Lê Sơ.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/15.jpg",
    "period": "Thời Lê Sơ (Thế kỷ 15)"
  },
  {
    "name": "Hình rồng trang trí trên đĩa gốm hoa lam tàu đắm cổ Cù Lao Chàm",
    "description": "Hiện vật gốm hoa lam xuất khẩu đỉnh cao thời Lê Sơ trục vớt từ tàu đắm cổ Cù Lao Chàm (Hội An), vẽ rồng bay lượn giữa mây trời bằng men lam cobalt tinh tế.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/16.jpg",
    "period": "Thời Lê Sơ (Thế kỷ 15)"
  },
  {
    "name": "Hình rồng trang trí trên gạch đất nung chùa Sổ (Hà Nội)",
    "description": "Gạch phù điêu đất nung thời Mạc thế kỷ 16 phát hiện tại chùa Sổ, rồng có mắt lồi, sừng chạc, râu dài và các đao mác bung tỏa sống động.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/17.jpg",
    "period": "Thời Mạc (Thế kỷ 16)"
  },
  {
    "name": "Hình rồng chạm khắc trên cánh cửa gỗ chùa Keo (Thái Bình)",
    "description": "Nghệ thuật điêu khắc gỗ dân gian thời Lê Trung Hưng với hình tượng rồng mẹ rồng con quây quần, rồng đuôi cá đao mác uy nghi mà gần gũi với đời sống thôn dã.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/18.jpg",
    "period": "Thời Lê Trung Hưng (Thế kỷ 17)"
  },
  {
    "name": "Lư hương gốm men nâu đắp nổi Tứ Linh (Long - Ly - Quy - Phụng)",
    "description": "Lư hương gốm thời Lê Trung Hưng đắp nổi tượng rồng uy nghiêm cùng bộ tứ linh hướng về chốn tôn nghiêm, mang đậm màu sắc tín ngưỡng thờ cúng tổ tiên.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/19.jpg",
    "period": "Thời Lê Trung Hưng (Thế kỷ 17 - 18)"
  },
  {
    "name": "Quai ấn vàng \"Sắc mệnh chi bảo\" hình rồng cuộn (Bảo vật Quốc gia)",
    "description": "Bảo vật Quốc gia bằng vàng ròng đúc năm Minh Mạng thứ 8 (1827), quai ấn đúc hình rồng cuộn viên long 5 móng với mắt đính ngọc, đầu ngẩng cao uy quyền hoàng đế.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/20.jpg",
    "period": "Triều Nguyễn (Năm 1827)"
  },
  {
    "name": "Tượng rồng vàng đúc nổi thời vua Thiệu Trị",
    "description": "Tác phẩm kim hoàn hoàng gia đúc năm Thiệu Trị thứ 2 (1842) bằng vàng nguyên chất chạm khắc vảy rồng tỉ mỉ, tượng trưng cho thiên mệnh thái bình thịnh trị.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/22.jpg",
    "period": "Triều Nguyễn (Năm 1842)"
  },
  {
    "name": "Hình rồng trang trí trên bìa kim sách vàng thời vua Gia Long",
    "description": "Kim sách hoàng tộc đúc năm Gia Long thứ 5 (1806) bằng vàng ròng, chạm khắc đồ án lưỡng long chầu nguyệt và mây ngũ sắc ghi lại sắc phong của triều đình.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/23.jpg",
    "period": "Triều Nguyễn (Năm 1806)"
  },
  {
    "name": "Tranh \"Đại Nam lịch đại long phi đồ\" (Bản đồ nước Đại Nam hình rồng bay)",
    "description": "Kiệt tác tranh giấy dó vẽ nhiều màu niên đại năm Đồng Khánh thứ 3 (1888), tạo hình dáng hình đất nước non sông Đại Nam liền một dải như một con rồng thiêng vươn mình ra biển lớn.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/24.jpg",
    "period": "Triều Nguyễn (Năm 1888)"
  },
  {
    "name": "Đôi rồng chầu mặt trời trang trí trên biển gỗ sơn son thếp vàng",
    "description": "Hiện vật hoàng cung và đình đền thế kỷ 19 - 20 chạm lộng tinh xảo đồ án lưỡng long chầu nhật, sơn son thếp vàng rực rỡ mang ước vọng quốc thái dân an.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/25.jpg",
    "period": "Triều Nguyễn (Thế kỷ 19 - 20)"
  },
  {
    "name": "Chân đèn hình tòa Cửu Long (9 rồng) bằng kim loại sắt",
    "description": "Hiện vật thờ tự độc đáo đầu thế kỷ 20 với cấu trúc 9 tầng rồng uốn lượn đỡ đài sen cắm nến, thể hiện sự kết hợp mỹ thuật cung đình và tín ngưỡng thờ mẫu dân gian.",
    "image": "https://baotanglichsu.vn/DataFiles/2024/02/News/Tieng%20Viet/20.1.2024/Rong%20tren%20co%20vat%20qua%20s%C6%B0u%20tap%20hien%20vat%20BTLSQG/26.jpg",
    "period": "Triều Nguyễn (Đầu thế kỷ 20)"
  }
]'::jsonb),

('TBCD04', 'Điện Biên Phủ – Tinh thần bất diệt', 'Trưng bày gần 150 hiện vật, tài liệu quý tái hiện chiến thắng Điện Biên Phủ "lừng lẫy năm châu, chấn động địa cầu" nhân kỷ niệm 70 năm chiến thắng Điện Biên Phủ và Hiệp định Genève.', 'Đã diễn ra', '2024-05-07', '2024-09-30',
 'Phòng Trưng bày Lịch sử Hiện đại – Số 216 Trần Quang Khải, Hà Nội', 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra', 'Bảo tàng Lịch sử Quốc gia (baotanglichsu.vn)', 'Chiến thắng Điện Biên Phủ ngày 7/5/1954 là mốc son chói lọi trong lịch sử đấu tranh giữ nước của dân tộc Việt Nam. Trưng bày tái hiện toàn diện từ công tác chuẩn bị hậu cần, tinh thần "tất cả cho tiền tuyến", quyết tâm mở đường, kéo pháo vào trận địa cho đến các đợt tiến công tiêu diệt hoàn toàn tập đoàn cứ điểm của thực dân Pháp.', '/images/museum-building.jpg',
 '["/images/museum-building.jpg","/images/museum-hero.jpg","/images/bia-tien-si.jpg"]'::jsonb,
 '[
  {
    "name": "Bản đồ tác chiến chiến dịch Điện Biên Phủ",
    "description": "Bản đồ tác chiến của Bộ Tổng tham mưu Quân đội nhân dân Việt Nam với các mũi tiến công của quân ta năm 1954.",
    "image": "/images/museum-building.jpg",
    "period": "Năm 1954"
  },
  {
    "name": "Chiếc cúp chiến lợi phẩm từ sở chỉ huy hầm De Castries",
    "description": "Thu giữ vào chiều ngày 7/5/1954 khi phân đội bộ binh cắm cờ quyết chiến quyết thắng trên nóc hầm chỉ huy Pháp.",
    "image": "/images/binh-gom.jpg",
    "period": "Tháng 5/1954"
  },
  {
    "name": "Đèn bão kéo pháo vào trận địa",
    "description": "Dụng cụ soi đường thầm lặng của bộ đội ta vượt qua đèo dốc hiểm trở để đưa những khẩu pháo ngàn cân vào trận địa.",
    "image": "/images/bia-tien-si.jpg",
    "period": "Năm 1954"
  }
]'::jsonb),

('TBCD05', 'Gốm cổ Bát Tràng – Tinh hoa ngàn năm', 'Giới thiệu bộ sưu tập 39 hiện vật gốm cổ tinh hoa độc bản từ thế kỷ 14 đến thế kỷ 20, tôn vinh các dòng men lam, men rạn, men ngọc độc đáo của làng gốm Bát Tràng.', 'Đã diễn ra', '2023-05-18', '2023-12-31',
 'Gian Trưng bày Cổ vật Tầng 2 – Số 1 Tràng Tiền, Hoàn Kiếm, Hà Nội', 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra', 'Bảo tàng Lịch sử Quốc gia (baotanglichsu.vn)', 'Làng gốm Bát Tràng nằm bên tả ngạn sông Hồng là một trong những trung tâm sản xuất gốm sứ lâu đời và phồn vinh bậc nhất Việt Nam. Trưng bày tuyển chọn 39 hiện vật gốm cổ tiêu biểu từ thời Trần, Mạc, Lê Trung Hưng đến triều Nguyễn, thể hiện kỹ thuật chế tác men ngọc, men lam, men rạn đắp nổi điêu luyện của các nghệ nhân dân gian.', '/images/binh-gom.jpg',
 '["/images/binh-gom.jpg","/images/trong-dong.jpg","/images/tuong-phat.jpg"]'::jsonb,
 '[
  {
    "name": "Chân đèn gốm hoa lam thời Mạc (1572)",
    "description": "Tác phẩm độc bản của nghệ nhân Đỗ Phủ với nét vẽ rồng mây phóng khoáng, minh văn ghi niên hiệu Sùng Khang thứ 7.",
    "image": "/images/binh-gom.jpg",
    "period": "Thời Mạc (Năm 1572)"
  },
  {
    "name": "Lư hương gốm men rạn đắp nổi thời Lê Trung Hưng",
    "description": "Đặc trưng nghệ thuật men rạn ngà đắp nổi hoa văn lưỡng long chầu nguyệt tinh xảo thế kỷ 18.",
    "image": "/images/tuong-phat.jpg",
    "period": "Thời Lê Trung Hưng (Thế kỷ 18)"
  },
  {
    "name": "Bình vôi cổ hoa văn men ngũ sắc thời Nguyễn",
    "description": "Vật phẩm gốm sinh hoạt gắn liền với phong tục ăn trầu truyền thống và đời sống văn hóa cung đình Huế.",
    "image": "/images/trong-dong.jpg",
    "period": "Triều Nguyễn (Thế kỷ 19)"
  }
]'::jsonb),

('TBCD06', 'Máu và Hoa – Hà Nội 12 ngày đêm', 'Tái hiện 12 ngày đêm chiến đấu ngoan cường đánh bại cuộc tập kích chiến lược B-52 của không quân Mỹ, làm nên kỳ tích "Điện Biên Phủ trên không" vang dội của quân dân Thủ đô.', 'Đã diễn ra', '2022-12-18', '2023-04-30',
 'Phòng Trưng bày Lịch sử Hiện đại – Số 216 Trần Quang Khải, Hà Nội', 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra', 'Bảo tàng Lịch sử Quốc gia (baotanglichsu.vn)', 'Tháng 12/1972, không quân Mỹ tiến hành chiến dịch tập kích chiến lược đường không Linebacker II bằng pháo đài bay B-52 vào Hà Nội và Hải Phòng. Với lòng dũng cảm phi thường, quân dân ta đã lập nên kỳ tích bắn rơi 81 máy bay Mỹ (trong đó có 34 chiếc B-52), buộc chính quyền Mỹ phải ký Hiệp định Paris rút quân về nước.', '/images/bia-tien-si.jpg',
 '["/images/bia-tien-si.jpg","/images/museum-hero.jpg","/images/museum-building.jpg"]'::jsonb,
 '[
  {
    "name": "Mảnh xác pháo đài bay B-52 rơi tại hồ Hữu Tiệp",
    "description": "Chứng tích chiến thắng bắn rơi B-52 tại chỗ của tiểu đoàn tên lửa 72 đêm 27/12/1972 tại làng hoa Ngọc Hà.",
    "image": "/images/bia-tien-si.jpg",
    "period": "Tháng 12/1972"
  },
  {
    "name": "Mũ phi công Mỹ và trang bị lái dù",
    "description": "Chiến lợi phẩm thu được từ các phi công lái máy bay ném bom bị quân dân Thủ đô bắt sống.",
    "image": "/images/museum-hero.jpg",
    "period": "Năm 1972"
  },
  {
    "name": "Đài quan sát phòng không trên đỉnh Nhà hát Lớn Hà Nội",
    "description": "Tư liệu về mạng lưới quan sát và hệ thống còi báo động phòng không bảo vệ tính mạng nhân dân Thủ đô.",
    "image": "/images/museum-building.jpg",
    "period": "Năm 1972"
  }
]'::jsonb),

('TBCD07', 'Bình dân học vụ – Thắp sáng tương lai', 'Giới thiệu nhiều tư liệu, hiện vật quý về phong trào xóa nạn mù chữ do Chủ tịch Hồ Chí Minh phát động ngay sau Cách mạng Tháng Tám năm 1945.', 'Đã diễn ra', '2025-08-22', '2025-12-31',
 'Gian Trưng bày Giáo dục Văn hóa – Số 216 Trần Quang Khải, Hà Nội', 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra', 'Bảo tàng Lịch sử Quốc gia (baotanglichsu.vn)', 'Hưởng ứng lời kêu gọi "Diệt giặc đói, diệt giặc dốt, diệt giặc ngoại xâm" của Chủ tịch Hồ Chí Minh năm 1945, phong trào Bình dân học vụ đã trở thành cuộc vận động văn hóa sâu rộng bậc nhất, mang ánh sáng chữ quốc ngữ đến cho hàng triệu người dân nghèo trên khắp mọi miền Tổ quốc.', '/images/trong-dong.jpg',
 '["/images/trong-dong.jpg","/images/bia-tien-si.jpg","/images/museum-hero.jpg"]'::jsonb,
 '[
  {
    "name": "Huy hiệu Bình dân học vụ (1945-1946)",
    "description": "Biểu trưng vinh danh các giáo viên và học viên hoàn thành xuất sắc các lớp học xóa mù chữ.",
    "image": "/images/trong-dong.jpg",
    "period": "Năm 1945 - 1946"
  },
  {
    "name": "Thư khen của Chủ tịch Hồ Chí Minh ngày 24/2/1948",
    "description": "Bức thư Bác gửi toàn thể bộ đội khu 2 và khu 3 về thành tích 100% cán bộ chiến sĩ biết đọc, biết viết.",
    "image": "/images/bia-tien-si.jpg",
    "period": "Năm 1948"
  },
  {
    "name": "Sách Phương pháp và cách thức dạy vỡ lòng chữ quốc ngữ",
    "description": "Ấn bản Hà Nội năm 1946 làm giáo trình chuẩn cho phong trào Bình dân học vụ cả nước.",
    "image": "/images/museum-hero.jpg",
    "period": "Năm 1946"
  }
]'::jsonb),

('TBCD08', 'Thi đua ái quốc – Ươm những mầm xanh', 'Trưng bày chuyên đề kỷ niệm 75 năm ngày Chủ tịch Hồ Chí Minh ra Lời kêu gọi thi đua ái quốc (11/6/1948 – 11/6/2023), lan tỏa các phong trào Ba sẵn sàng, Năm xung phong, Hũ gạo cứu đói.', 'Đã diễn ra', '2023-06-11', '2023-11-30',
 'Phòng Trưng bày Chuyên đề – Số 216 Trần Quang Khải, Hà Nội', 'https://baotanglichsu.vn/vi/Articles/4002/chuyen-dje-dja-dien-ra', 'Bảo tàng Lịch sử Quốc gia (baotanglichsu.vn)', 'Ngày 11/6/1948, Chủ tịch Hồ Chí Minh ra Lời kêu gọi thi đua ái quốc, mở đầu cho phong trào thi đua yêu nước sôi nổi khắp cả nước, khơi dậy sức mạnh của toàn thể dân tộc vượt qua mọi gian khổ, hoàn thành thắng lợi sự nghiệp giải phóng dân tộc và xây dựng đất nước.', '/images/museum-hero.jpg',
 '["/images/museum-hero.jpg","/images/tuong-phat.jpg","/images/trong-dong.jpg"]'::jsonb,
 '[
  {
    "name": "Bản in Lời kêu gọi Thi đua ái quốc năm 1948",
    "description": "Tài liệu lịch sử mở đầu cho phong trào thi đua yêu nước sâu rộng trong toàn quân và toàn dân.",
    "image": "/images/museum-hero.jpg",
    "period": "Năm 1948"
  },
  {
    "name": "Cờ luân lưu phong trào Dạy tốt - Học tốt",
    "description": "Phần thưởng thi đua cao quý trao tặng cho các trường học và đơn vị giáo dục có thành tích xuất sắc.",
    "image": "/images/tuong-phat.jpg",
    "period": "Giai đoạn 1960 - 1970"
  },
  {
    "name": "Huy hiệu Chiến sĩ thi đua toàn quốc khóa I",
    "description": "Kỷ vật trao tặng tại Đại hội Chiến sĩ thi đua và Cán bộ gương mẫu toàn quốc năm 1952 tại chiến khu Việt Bắc.",
    "image": "/images/trong-dong.jpg",
    "period": "Năm 1952"
  }
]'::jsonb);
