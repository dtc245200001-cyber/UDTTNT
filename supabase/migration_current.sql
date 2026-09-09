-- ==========================================
-- TỪ FILE: migration_current.sql
-- ==========================================

BEGIN;

-- ====================================================================
-- BẢO TÀNG QUỐC GIA VIỆT NAM - SUPABASE DATABASE MIGRATION SCRIPT
-- Bao gồm: Schema, pgvector extension, Tables, Foreign Keys, Indexes, RPC & Seed Data
-- ====================================================================

-- 1. BẬT EXTENSION PGVECTOR
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. TẠO CÁC BẢNG DỮ LIỆU
-- Bảng Danh mục
CREATE TABLE IF NOT EXISTS danh_muc (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    count INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Phòng trưng bày
CREATE TABLE IF NOT EXISTS phong_trung_bay (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    floor VARCHAR(100),
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Hiện vật (Kèm vector embedding 1536 cho Trợ lý AI RAG)
CREATE TABLE IF NOT EXISTS hien_vat (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(500) NOT NULL,
    category_id VARCHAR(50) REFERENCES danh_muc(id) ON DELETE SET NULL,
    category VARCHAR(255),
    culture VARCHAR(255),
    period VARCHAR(255),
    material VARCHAR(255),
    dimensions VARCHAR(255),
    origin VARCHAR(255),
    location VARCHAR(255),
    status VARCHAR(100) DEFAULT 'Đang trưng bày',
    image TEXT,
    description TEXT,
    ai_analysis TEXT,
    date_display VARCHAR(100),
    page_source VARCHAR(100),
    embedding vector(1536),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Triển lãm
CREATE TABLE IF NOT EXISTS trien_lam (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(100) DEFAULT 'Đang diễn ra',
    start_date DATE,
    end_date DATE,
    location VARCHAR(255),
    image TEXT,
    description TEXT,
    artifacts_count INT DEFAULT 0,
    visitors_count INT DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Sự kiện
CREATE TABLE IF NOT EXISTS su_kien (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    date DATE,
    time VARCHAR(100),
    location VARCHAR(255),
    speaker VARCHAR(255),
    status VARCHAR(100) DEFAULT 'Sắp diễn ra',
    seats INT DEFAULT 100,
    registered INT DEFAULT 0,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Loại vé tham quan
CREATE TABLE IF NOT EXISTS ve_tham_quan (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    price NUMERIC NOT NULL DEFAULT 0,
    description TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Người dùng hệ thống (liên kết auth.users)
CREATE TABLE IF NOT EXISTS nguoi_dung (
    id VARCHAR(100) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'visitor',
    role_label VARCHAR(100) DEFAULT 'Khách tham quan',
    status VARCHAR(50) DEFAULT 'Hoạt động',
    avatar TEXT,
    joined_at DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Bài viết
CREATE TABLE IF NOT EXISTS bai_viet (
    id VARCHAR(50) PRIMARY KEY,
    title VARCHAR(500) NOT NULL,
    author VARCHAR(255),
    category VARCHAR(255),
    date DATE DEFAULT CURRENT_DATE,
    status VARCHAR(100) DEFAULT 'Đã xuất bản',
    views INT DEFAULT 0,
    content TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Đánh giá & Phản hồi
CREATE TABLE IF NOT EXISTS danh_gia (
    id VARCHAR(50) PRIMARY KEY,
    author VARCHAR(255) NOT NULL,
    user_id VARCHAR(100) REFERENCES nguoi_dung(id) ON DELETE SET NULL,
    artifact_id VARCHAR(50) REFERENCES hien_vat(id) ON DELETE SET NULL,
    artifact_name VARCHAR(255),
    rating INT CHECK (rating >= 1 AND rating <= 5),
    comment TEXT NOT NULL,
    date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Đặt vé trực tuyến
CREATE TABLE IF NOT EXISTS dat_ve (
    id VARCHAR(100) PRIMARY KEY,
    ticket_code VARCHAR(100) UNIQUE NOT NULL,
    user_id VARCHAR(100) REFERENCES nguoi_dung(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    ticket_type VARCHAR(255),
    price NUMERIC NOT NULL,
    quantity INT DEFAULT 1,
    visit_date DATE NOT NULL,
    payment_method VARCHAR(100) DEFAULT 'Thanh toán tại quầy',
    status VARCHAR(100) DEFAULT 'Đã xác nhận',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bảng Đăng ký tham gia sự kiện
CREATE TABLE IF NOT EXISTS dang_ky_su_kien (
    id VARCHAR(100) PRIMARY KEY,
    event_id VARCHAR(50) REFERENCES su_kien(id) ON DELETE CASCADE,
    event_title VARCHAR(255),
    user_id VARCHAR(100) REFERENCES nguoi_dung(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    phone VARCHAR(50),
    email VARCHAR(255),
    visit_date DATE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TẠO INDEXES & HNSW VECTOR SEARCH INDEX
CREATE INDEX IF NOT EXISTS idx_hien_vat_category ON hien_vat(category_id);
CREATE INDEX IF NOT EXISTS idx_hien_vat_name ON hien_vat(name);
CREATE INDEX IF NOT EXISTS idx_dat_ve_user ON dat_ve(user_id);
CREATE INDEX IF NOT EXISTS idx_dang_ky_su_kien_event ON dang_ky_su_kien(event_id);

-- Tạo HNSW Index cho Vector Search
CREATE INDEX IF NOT EXISTS idx_hien_vat_embedding ON hien_vat USING hnsw (embedding vector_cosine_ops);

-- 4. TẠO HÀM RPC TÌM HIỆN VẬT TƯƠNG TỰ (AI SEARCH)
CREATE OR REPLACE FUNCTION match_hien_vat(
    query_embedding vector(1536),
    match_threshold float DEFAULT 0.5,
    match_count int DEFAULT 5
)
RETURNS TABLE (
    id VARCHAR(50),
    name VARCHAR(500),
    category VARCHAR(255),
    culture VARCHAR(255),
    period VARCHAR(255),
    location VARCHAR(255),
    image TEXT,
    description TEXT,
    ai_analysis TEXT,
    similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT
        hv.id,
        hv.name,
        hv.category,
        hv.culture,
        hv.period,
        hv.location,
        hv.image,
        hv.description,
        hv.ai_analysis,
        1 - (hv.embedding <=> query_embedding) AS similarity
    FROM hien_vat hv
    WHERE hv.embedding IS NOT NULL
      AND 1 - (hv.embedding <=> query_embedding) > match_threshold
    ORDER BY hv.embedding <=> query_embedding
    LIMIT match_count;
END;
$$;

-- 5. BẬT ROW LEVEL SECURITY (RLS) & CHÍNH SÁCH TRUY CẬP AN TOÀN
ALTER TABLE danh_muc ENABLE ROW LEVEL SECURITY;
ALTER TABLE phong_trung_bay ENABLE ROW LEVEL SECURITY;
ALTER TABLE hien_vat ENABLE ROW LEVEL SECURITY;
ALTER TABLE trien_lam ENABLE ROW LEVEL SECURITY;
ALTER TABLE su_kien ENABLE ROW LEVEL SECURITY;
ALTER TABLE ve_tham_quan ENABLE ROW LEVEL SECURITY;
ALTER TABLE nguoi_dung ENABLE ROW LEVEL SECURITY;
ALTER TABLE bai_viet ENABLE ROW LEVEL SECURITY;
ALTER TABLE danh_gia ENABLE ROW LEVEL SECURITY;
ALTER TABLE dat_ve ENABLE ROW LEVEL SECURITY;
ALTER TABLE dang_ky_su_kien ENABLE ROW LEVEL SECURITY;

-- Xóa các Policy cũ nếu đã tồn tại để tránh lỗi trùng lặp khi chạy lại
DROP POLICY IF EXISTS "Public read danh_muc" ON danh_muc;
DROP POLICY IF EXISTS "Public read phong_trung_bay" ON phong_trung_bay;
DROP POLICY IF EXISTS "Public read hien_vat" ON hien_vat;
DROP POLICY IF EXISTS "Public read trien_lam" ON trien_lam;
DROP POLICY IF EXISTS "Public read su_kien" ON su_kien;
DROP POLICY IF EXISTS "Public read ve_tham_quan" ON ve_tham_quan;
DROP POLICY IF EXISTS "Public read bai_viet" ON bai_viet;
DROP POLICY IF EXISTS "Public read danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "Public read nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "Public read dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "Public read dang_ky_su_kien" ON dang_ky_su_kien;

DROP POLICY IF EXISTS "Public insert/update hien_vat" ON hien_vat;
DROP POLICY IF EXISTS "Public insert/update danh_muc" ON danh_muc;
DROP POLICY IF EXISTS "Public insert/update trien_lam" ON trien_lam;
DROP POLICY IF EXISTS "Public insert/update su_kien" ON su_kien;
DROP POLICY IF EXISTS "Public insert/update ve_tham_quan" ON ve_tham_quan;
DROP POLICY IF EXISTS "Public insert/update nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "Public insert/update danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "Public insert/update dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "Public insert/update dang_ky_su_kien" ON dang_ky_su_kien;
DROP POLICY IF EXISTS "Public insert/update bai_viet" ON bai_viet;

-- Cho phép đọc dữ liệu công khai cho khách tham quan và admin
CREATE POLICY "Public read danh_muc" ON danh_muc FOR SELECT USING (true);
CREATE POLICY "Public read phong_trung_bay" ON phong_trung_bay FOR SELECT USING (true);
CREATE POLICY "Public read hien_vat" ON hien_vat FOR SELECT USING (true);
CREATE POLICY "Public read trien_lam" ON trien_lam FOR SELECT USING (true);
CREATE POLICY "Public read su_kien" ON su_kien FOR SELECT USING (true);
CREATE POLICY "Public read ve_tham_quan" ON ve_tham_quan FOR SELECT USING (true);
CREATE POLICY "Public read bai_viet" ON bai_viet FOR SELECT USING (true);
CREATE POLICY "Public read danh_gia" ON danh_gia FOR SELECT USING (true);
CREATE POLICY "Public read nguoi_dung" ON nguoi_dung FOR SELECT USING (true);
CREATE POLICY "Public read dat_ve" ON dat_ve FOR SELECT USING (true);
CREATE POLICY "Public read dang_ky_su_kien" ON dang_ky_su_kien FOR SELECT USING (true);

-- Cho phép tạo / sửa / xóa cho ứng dụng

CREATE POLICY "Public insert/update danh_muc" ON danh_muc FOR ALL USING (true) WITH CHECK (true);

CREATE POLICY "Public insert/update su_kien" ON su_kien FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update ve_tham_quan" ON ve_tham_quan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update nguoi_dung" ON nguoi_dung FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update danh_gia" ON danh_gia FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update dat_ve" ON dat_ve FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update dang_ky_su_kien" ON dang_ky_su_kien FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update bai_viet" ON bai_viet FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 6. SEED DATA (DỮ LIỆU KHỞI TẠO MẪU CHUẨN)
-- Thứ tự INSERT đảm bảo khóa ngoại: danh_muc → hien_vat → danh_gia
-- ====================================================================

-- Xóa các danh mục cũ CAT01-08 nếu có
DELETE FROM danh_muc WHERE id LIKE 'CAT%';

-- Seed Danh mục (13 danh mục DM01 - DM13)
INSERT INTO danh_muc (id, name, count, description) VALUES
('DM01', 'Vũ khí & khí tài quân sự', 20, 'Súng, bom, đạn, kiếm, mã tấu và khí tài quân sự dùng trong các cuộc kháng chiến, chiến tranh cách mạng'),
('DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 43, 'Đồ dùng cá nhân, quà tặng gắn với Chủ tịch Hồ Chí Minh và các anh hùng, liệt sĩ tiêu biểu'),
('DM03', 'Sách, báo & tài liệu cách mạng', 25, 'Sách, báo chí, tuyên ngôn, nghị quyết, truyền đơn và văn bản lịch sử thời kỳ cách mạng'),
('DM04', 'Ảnh tư liệu lịch sử', 26, 'Ảnh và bài viết ghi lại các sự kiện, phong trào lịch sử quan trọng của dân tộc'),
('DM05', 'Trang phục, huy hiệu & huân huy chương', 10, 'Trang phục, mũ, huy hiệu, bằng khen, huân huy chương thời kỳ cách mạng'),
('DM06', 'Vật dụng sinh hoạt & phương tiện', 38, 'Đồ dùng sinh hoạt, công cụ lao động, phương tiện đi lại và máy móc dân dụng'),
('DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 9, 'Tranh vẽ, tượng và tác phẩm nghệ thuật phản ánh đề tài cách mạng, kháng chiến'),
('DM08', 'Cổ vật đồng', 18, 'Trống đồng, rìu, giáo mác, ấn tín và đồ đồng cổ thuộc văn hóa Đông Sơn và các triều đại phong kiến'),
('DM09', 'Cổ vật đá', 33, 'Công cụ đá, bia đá, tượng đá, phù điêu đá thời tiền sử và các di tích cổ'),
('DM10', 'Cổ vật gốm', 29, 'Đồ gốm, sứ, gạch ngói cổ qua các thời kỳ và triều đại Lý, Trần, Lê, Nguyễn'),
('DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 14, 'Tượng gỗ, đồ gỗ khảm trai, kết cấu kiến trúc gỗ cổ truyền'),
('DM12', 'Đồ vàng bạc & trang sức', 3, 'Đồ trang sức, ấn kim bảo, đồ thờ bằng vàng bạc và trang sức cổ'),
('DM13', 'Đồ ngọc & đá quý', 2, 'Tượng, đồ vật chế tác từ ngọc và đá quý')
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, count = EXCLUDED.count, description = EXCLUDED.description;

-- Seed Phòng trưng bày
INSERT INTO phong_trung_bay (id, name, floor, description) VALUES
('TB01', 'Phòng Trưng bày A', 'Tầng 1', 'Trưng bày Thời Tiền sử và Thời kỳ dựng nước Văn Lang - Âu Lạc'),
('TB02', 'Phòng Trưng bày B', 'Tầng 2', 'Trưng bày Nghệ thuật Phật giáo và Di sản Thời Lý - Trần - Lê'),
('TB03', 'Phòng Trưng bày C', 'Tầng 3', 'Trưng bày Triều đại Nhà Nguyễn và Di sản Mỹ nghệ Cung đình'),
('TB04', 'Phòng Trưng bày D', 'Tầng 1', 'Trưng bày Lịch sử Đấu tranh Giành Độc lập và Cách mạng Hiện đại')
ON CONFLICT (id) DO NOTHING;

-- Seed Triển lãm
INSERT INTO trien_lam (id, name, status, start_date, end_date, location, image, description, artifacts_count, visitors_count) VALUES
('EX001', 'Tinh hoa văn hóa Việt', 'Đang diễn ra', '2024-06-01', '2024-08-30', 'Phòng trưng bày A', '/images/museum-hero.jpg', 'Triển lãm tổng hợp trưng bày các hiện vật tiêu biểu đại diện cho 4.000 năm lịch sử dựng nước và giữ nước của dân tộc Việt Nam.', 45, 12500),
('EX002', 'Di sản thời Lý', 'Đang diễn ra', '2024-05-15', '2024-08-15', 'Phòng trưng bày B', '/images/bia-tien-si.jpg', 'Tập trung giới thiệu các bảo vật quốc gia thời Lý (1009 - 1225) như tượng Phật Tích, rồng thời Lý, bia đá và gốm men ngọc.', 28, 8900),
('EX003', 'Gốm Việt xưa và nay', 'Sắp diễn ra', '2024-07-01', '2024-09-30', 'Phòng trưng bày C', '/images/binh-gom.jpg', 'Hành trình phát triển gốm Việt Nam từ gốm Đông Sơn, Chu Đậu, Bát Tràng cho tới phong cách thiết kế gốm nghệ thuật hiện đại.', 60, 0),
('EX004', 'Trang phục triều đình nhà Nguyễn', 'Đã kết thúc', '2024-01-01', '2024-04-30', 'Phòng trưng bày D', '/images/tuong-phat.jpg', 'Bộ sưu tập trang phục hoàng gia, long bào, mũ mão và trang sức của triều đại phong kiến cuối cùng tại Việt Nam.', 35, 15400)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, description = EXCLUDED.description;

-- Seed Sự kiện
INSERT INTO su_kien (id, title, date, time, location, speaker, status, seats, registered, description) VALUES
('EV001', 'Tọa đàm: Tìm hiểu bí mật Trống đồng Đông Sơn', '2024-08-18', '09:00 - 11:30', 'Hội trường 1 - Bảo tàng Việt Nam', 'GS.TS Nguyễn Văn A', 'Sắp diễn ra', 150, 124, 'Chương trình tọa đàm chuyên sâu về kỹ thuật đúc đồng và hoa văn chim lạc trên trống đồng Đông Sơn.'),
('EV002', 'Xưởng trải nghiệm làm gốm Chu Đậu thủ công', '2024-08-25', '14:00 - 17:00', 'Khu vực sáng tạo ngoài trời', 'Nghệ nhân ưu tú Lê Văn B', 'Sắp diễn ra', 40, 40, 'Du khách được tự tay tạo hình và vẽ họa tiết men lam lên sản phẩm gốm dưới sự hướng dẫn của nghệ nhân.'),
('EV003', 'Đêm Bảo Tàng: Ánh sáng di sản Thăng Long', '2024-09-02', '19:30 - 22:00', 'Khuôn viên trung tâm', 'Ban Quản lý Di sản', 'Sắp diễn ra', 300, 210, 'Trình diễn ánh sáng 3D Mapping tái hiện hình ảnh Thăng Long nghìn năm văn hiến.')
ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, registered = EXCLUDED.registered;

-- Seed Vé tham quan
INSERT INTO ve_tham_quan (id, name, price, description, active) VALUES
('TK001', 'Vé Người lớn', 50000, 'Áp dụng cho du khách từ 16 đến 60 tuổi', true),
('TK002', 'Vé Học sinh - Sinh viên', 20000, 'Cần xuất trình thẻ HS-SV còn hiệu lực', true),
('TK003', 'Vé Trẻ em / Người cao tuổi', 0, 'Miễn phí cho trẻ em dưới 6 tuổi và người > 60 tuổi', true),
('TK004', 'Vé Khách Quốc tế', 100000, 'Bao gồm máy thuyết minh đa ngôn ngữ', true),
('TK005', 'Vé Combo Triển lãm Đặc biệt', 120000, 'Tham quan toàn bộ phòng trưng bày + Triển lãm chuyên đề', true)
ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;

-- Seed Người dùng
INSERT INTO nguoi_dung (id, email, name, password_hash, role, role_label, status, avatar, joined_at) VALUES
('USR000', 'admin@gmail.com', 'Quản trị viên', 'Admin@123', 'admin', 'Quản trị viên', 'Hoạt động', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150', '2024-01-01'),
('USR001', 'admin@baotang.gov.vn', 'Nguyễn Văn Quản', 'admin123', 'admin', 'Quản trị viên', 'Hoạt động', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150', '2023-01-10'),
('USR002', 'huong.tt@baotang.gov.vn', 'Trần Thị Thu Hương', '123456', 'admin', 'Chuyên viên Bảo tồn', 'Hoạt động', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', '2023-03-15'),
('USR003', 'minh.lh@baotang.gov.vn', 'Lê Hoàng Minh', '123456', 'admin', 'Hướng dẫn viên', 'Hoạt động', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150', '2023-06-20'),
('USR004', 'visitor@gmail.com', 'Trần Văn Khách', 'visitor123', 'visitor', 'Khách tham quan', 'Hoạt động', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', '2024-05-01')
ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash;

-- Seed Bài viết
INSERT INTO bai_viet (id, title, author, category, date, status, views, content) VALUES
('ART001', 'Hành trình phục dựng họa tiết Trống đồng Đông Sơn', 'GS.TS Nguyễn Văn A', 'Nghiên cứu di sản', '2024-07-28', 'Đã xuất bản', 2450, 'Nghiên cứu chi tiết về phương pháp đúc đồng truyền thống và biểu tượng chim Lạc trên trống đồng Đông Sơn.'),
('ART002', 'Kỹ thuật bảo tồn đồ gốm men lam thế kỷ XIV', 'Chuyên viên Thu Hương', 'Kỹ thuật bảo tồn', '2024-08-02', 'Đã xuất bản', 1820, 'Các bước làm sạch, gia cố và phục chế hoa văn trên gốm sứ cổ truyền.'),
('ART003', 'Ứng dụng Trí tuệ nhân tạo trong thuyết minh di sản', 'Quản trị viên', 'Công nghệ bảo tàng', '2024-08-08', 'Bản nháp', 0, 'Sử dụng AI và mô hình ngôn ngữ lớn để trả lời câu hỏi của du khách 24/7.')
ON CONFLICT (id) DO NOTHING;

-- Seed 270 Hiện vật đã phân loại chuẩn DM01 - DM13
INSERT INTO hien_vat (id, name, category_id, category, culture, period, location, status, image, description, date_display, page_source) VALUES
('AV001', 'Những kỷ vật thiêng liêng về thương binh, liệt sĩ tại Bảo tàng Lịch sử quốc gia', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 1 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2026/07/News/Thumb/20260731-092529-i3WzKqzX.jpg', 'Chiến tranh đã lùi xa, nhưng sự hy sinh, cống hiến của các anh hùng, liệt sĩ, thương binh, bệnh binh và người có công với cách mạng vẫn mãi là biểu tượng sáng ngời của lòng yêu nước và ý chí quật cường của dân tộc Việt Nam. Sưu tập tài liệu, hiện vật về thương binh, liệt sĩ tại BTLSQG là nguồn tư liệu lịch sử quý giá, ghi lại những câu chuyện cảm động về lòng dũng cảm, đức hy sinh của những người đã cống hiến cho Tổ quốc.', '31/07/2026', 'Trang 1'),
('AV002', 'Hai kỷ vật kể chuyện về Anh hùng, liệt sĩ Lê Thị Riêng', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 2 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2026/07/News/Thumb/20260725-202719-TRx1yC1i.jpg', 'Gắn với cuộc tìm kiếm hài cốt Anh hùng, liệt sĩ Lê Thị Riêng tại Công viên Lê Thị Riêng (TP.HCM), hai kỷ vật (một cuốn sổ tay và một chiếc kẹp tóc) đang lưu giữ tại BTLSQG kể lại câu chuyện xúc động về tình cảm, lý tưởng cách mạng của bà.', '25/07/2026', 'Trang 1'),
('AV003', 'Một số đồ dùng sinh hoạt của Lãnh tụ Nguyễn Ái Quốc tại Pác Bó, Cao Bằng trong trưng bày chuyên đề "Mùa Xuân – Khởi nguồn thắng lợi"', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2026/02/News/Thumb/20260213-082340-zirNxiIg.jpg', 'Trong trưng bày chuyên đề, những đồ dùng sinh hoạt của lãnh tụ Nguyễn Ái Quốc tại Pác Bó, Cao Bằng (1941) thể hiện đời sống hoạt động cách mạng của Người.', '13/02/2026', 'Trang 1'),
('AV004', 'Huy hiệu Bình dân học vụ – Biểu tượng của ánh sáng tri thức giữa ngục tù Côn Đảo', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2025/11/News/Thumb/20251111-153130-iqlNev4E.png', 'Trong trưng bày "Bình dân học vụ – Thắp sáng tương lai" (khai mạc 22/8/2025), nhiều hiện vật quý lần đầu giới thiệu: thư khen của Chủ tịch Hồ Chí Minh (24/2/1948), sách dạy vỡ lòng chữ quốc ngữ (1946), đặc san "Bình dân học vụ" (1947)...', '11/11/2025', 'Trang 1'),
('AV005', 'Kỷ vật kể chuyện lòng dân', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2025/03/News/Thumb/20250319-140430-J5iPpbK2.jpg', 'Nhân kỷ niệm 95 năm thành lập Đảng CSVN, trưng bày "Đảng cộng sản Việt Nam – Những mốc son lịch sử" giới thiệu hơn 100 hiện vật, tài liệu, hình ảnh về những thắng lợi và bài học kinh nghiệm của cách mạng Việt Nam.', '19/03/2025', 'Trang 1'),
('AV006', 'Cuốn sổ tay của dân công tỉnh Phú Thọ trong chiến dịch Điện Biên Phủ, năm 1954', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2024/09/News/Thumb/20240906-090440-DnC9zD92.jpg', 'Cuốn sổ tay của một dân công thuộc Tiểu đội xe thồ Phú Thọ II, tham gia vận tải cho chiến dịch Điện Biên Phủ năm 1954.', '06/09/2024', 'Trang 1'),
('AV007', 'Sưu tập hiện vật về Tổng Bí thư Trường Chinh tại Bảo tàng Lịch sử Quốc gia', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2023/10/News/Thumb/20231002-151005-rqK3dOKw.jpg', 'Đồng chí Trường Chinh tham gia phong trào yêu nước từ 1925, gia nhập Hội Việt Nam Cách mạng Thanh niên năm 1927, là một trong những chiến sĩ cộng sản lớp đầu tiên của Đảng (1930).', '02/10/2023', 'Trang 1'),
('AV008', 'Tác phẩm "Lịch sử nước ta" năm 1942 lưu giữ tại Bảo tàng Lịch sử quốc gia', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2023/05/News/Thumb/20230517-085909-25rswffR.jpg', 'Cuối năm 1941 tại Pác Bó, Cao Bằng, lãnh tụ Nguyễn Ái Quốc viết "Lịch sử nước ta" bằng văn vần; tháng 2/1942 được Việt Minh tuyên truyền Bộ xuất bản lần đầu.', '17/05/2023', 'Trang 1'),
('AV009', 'Sưu tập hiện vật về Cách mạng Tháng Tám năm 1945 tại Bảo tàng Lịch sử quốc gia', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2022/08/News/Thumb/20220819-130332-QCKzWH2X.jpg', 'Sưu tập gồm hơn 1000 hiện vật (1941-1945): truyền đơn, báo chí (~700), văn bản (~50), vũ khí (~60), hiện vật về các nhà cách mạng (~100), hiện vật về nhân dân nuôi giấu bảo vệ cách mạng (~100), tài liệu địch theo dõi (~20)...', '19/08/2022', 'Trang 1'),
('AV010', 'Sách "Bản án chế độ Thực dân Pháp" lưu giữ tại Bảo tàng lịch sử quốc gia', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2022/08/News/Thumb/20220816-113208-K1zJERMx.jpg', 'Cuốn sách hiện trưng bày tại triển lãm "Quan hệ hữu nghị vĩ đại, đoàn kết đặc biệt Việt Nam - Lào, Lào - Việt Nam" chứa đựng câu chuyện thú vị về hành trình về với bảo tàng.', '16/08/2022', 'Trang 1'),
('AV011', 'Vở học bằng mo tre lưu giữ tại BTLSQG', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2022/06/News/Thumb/20220602-094156-KtlwoNhw.jpg', 'Trong trưng bày "Việt Bắc - Thủ đô gió ngàn" (kỷ niệm 75 năm toàn quốc kháng chiến), nổi bật là những quyển vở bằng mo tre của học sinh trường Hàn Thuyên (Bắc Ninh).', '02/06/2022', 'Trang 1'),
('AV012', 'Tuyên ngôn của Ủy ban Dân tộc Giải phóng Việt Nam', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2021/05/News/Thumb/20210510-130158-oy1jXc28.jpg', 'Ủy ban Dân tộc Giải phóng Việt Nam do Hồ Chí Minh làm Chủ tịch, thành lập tại Đại hội quốc dân Tân Trào, tháng 8/1945 – tiền thân của Quốc hội Việt Nam.', '10/05/2021', 'Trang 1'),
('AV013', 'Về bốn số báo Thân Ái do Chủ tịch Hồ Chí Minh sáng lập tại Thái Lan', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2019/06/News/Thumb/20190626-161511-DdcZbUzF.jpg', 'Từ báo Gia Định (1865) đến báo Thanh Niên (1925) do Nguyễn Ái Quốc sáng lập, báo chí cách mạng Việt Nam liên tục phát triển.', '26/06/2019', 'Trang 2'),
('AV014', 'Chiếc gầu Chủ tịch Hồ Chí Minh dùng để tát nước chống hạn lưu giữ tại BTLSQG', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/2019/06/News/Thumb/20190621-090434-rq61gGrb.jpg', 'BTLSQG lưu giữ nhiều tài liệu, hiện vật về Chủ tịch Hồ Chí Minh, mỗi hiện vật là câu chuyện sống động về cuộc đời, sự nghiệp của Người.', '21/06/2019', 'Trang 2'),
('AV015', 'Đôi nét về những Tympan Cấm Mít đang được trưng bày, phát huy giá trị tại Bảo tàng Lịch sử Quốc gia', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/thang_12_nam_2017/doi_net_ve_nhung_tympan_cam_mit/4.jpg', 'BTLSQG phối hợp Bảo tàng Điêu khắc Chăm Đà Nẵng khai quật Cấm Mít (Hòa Vang, Đà Nẵng), phát hiện 03 tympan hiện trưng bày tại bảo tàng.', '25/12/2017', 'Trang 2'),
('AV016', 'Áo, bà Nguyễn Thị Tạo (Phú Thọ)', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/vh1.jpg', 'Áo làm từ vỏ cây sui, mặc trong thời kỳ kháng chiến chống thực dân Pháp.', '08/12/2017', 'Trang 2'),
('AV017', 'Đèn, học sinh trường Hàn Thuyên (Bắc Ninh)', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/de2.jpg', 'Đèn tự chế dùng đi học ban đêm tránh máy bay địch, năm 1951-1954.', '08/12/2017', 'Trang 2'),
('AV018', 'Vở học bằng mo tre', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/de1.jpg', 'Vở học bằng mo tre của học sinh trường Hàn Thuyên (Bắc Ninh) trong kháng chiến chống Pháp.', '08/12/2017', 'Trang 2'),
('AV019', 'Trống đồng Cảnh Thịnh - tiếng vọng ngàn năm', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1_13.jpg', 'Thời Tây Sơn (1778-1802) gắn với vua Quang Trung - Nguyễn Huệ; sau chiến thắng Kỷ Dậu 1789, hoàng đế Quang Trung phục hồi đất nước, phát triển văn hóa dân tộc.', '07/12/2017', 'Trang 2'),
('AV020', 'Ánh sáng từ Đường Kách mệnh', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/2_9.jpg', 'Năm 1927, "Đường Kách mệnh" - tập bài giảng của Nguyễn Ái Quốc đào tạo cán bộ cách mạng (1925-1927) ở Quảng Châu - lần đầu xuất bản.', '07/12/2017', 'Trang 2'),
('AV021', 'Cuốn Đường Kách Mệnh của Nguyễn Ái Quốc: Sự xuất hiện và hành trình (Phần 3 và hết)', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/3_6.jpg', 'Hành trình cuốn Đường Kách Mệnh, cảm nhận số phận và sức sống mãnh liệt của tác phẩm.', '07/12/2017', 'Trang 2'),
('AV022', 'Lá cờ của Việt kiều Paris (Pháp) treo mừng Lễ Độc lập 2-9-1945', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1_9.jpg', 'Ngày 2-9-1945, Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập, khai sinh nước Việt Nam Dân chủ Cộng hòa tại Quảng trường Ba Đình.', '06/12/2017', 'Trang 2'),
('AV023', 'Tìm hiểu về các loại gạch in chữ đang trưng bày ở Bảo tàng Lịch sử quốc gia', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 2 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/2_7.jpg', 'Gạch in chữ là vật liệu kiến trúc phổ biến tại các di tích như thành Hoa Lư, thành Thăng Long, thành Nhà Hồ...', '06/12/2017', 'Trang 2'),
('AV024', 'Về tấm bia đàn Nam Giao thời Lê ở Hà Nội', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 3 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/2_6.jpg', 'Đàn tế trời xây dựng thời Lý (1152) ở An Thọ, Thọ Xương; đến thời Hậu Lê, đàn Nam Giao xây ở Thanh Hoa (nay Thọ Xuân, Thanh Hóa).', '06/12/2017', 'Trang 2'),
('AV025', 'Chiếc ấm sắc thuốc cho lãnh tụ Hồ Chí Minh', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1_6_1.jpg', 'Chiếc ấm đất của đồng bào Chiến khu Việt Bắc dùng sắc thuốc cho Hồ Chí Minh khi Người hoạt động cách mạng ở Thái Nguyên năm 1945.', '06/12/2017', 'Trang 3'),
('AV026', 'Chiếc hòm phiếu bầu cử quốc hội khóa I', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1_5_1.jpg', 'Sau Tuyên ngôn độc lập 2/9/1945, ngày 3-9-1945 Hồ Chí Minh đề nghị tổ chức Tổng tuyển cử với chế độ phổ thông đầu phiếu.', '06/12/2017', 'Trang 3'),
('AV027', 'Sưu tập truyền đơn cách mạng trước tháng 9-1945 hiện lưu giữ tại BTLSQG', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/2_4.jpg', 'Trong 15 năm (1930-1945), truyền đơn cách mạng giữ vai trò quan trọng trong tuyên truyền, vận động quần chúng theo Đảng.', '06/12/2017', 'Trang 3'),
('AV028', 'Đôi lọ lục bình giấu tài liệu bí mật của Đảng', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1_3_1.jpg', 'Đôi lọ gốm sứ Hoa lam Trung Quốc dùng cất giấu tài liệu Đảng chuyển từ nước ngoài về Hải Phòng năm 1932, gắn với đồng chí Nguyễn Lương Bằng.', '06/12/2017', 'Trang 3'),
('AV029', 'Tập chữ ký ủng hộ Việt Nam chống Mỹ cứu nước của nhân dân Bungari', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 2 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1_1_1.jpg', 'Trong kháng chiến chống Mỹ, nhân dân Việt Nam nhận được sự giúp đỡ về tinh thần, vật chất từ nhiều nước như Mỹ, Anh, Pháp, Cuba, Bungari...', '06/12/2017', 'Trang 3'),
('AV030', 'Chiếc đài bán dẫn Sony xác nhận thông tin "miền Nam hoàn toàn giải phóng" – đưa đến quyết định giải phóng Côn Đảo ngày 1/5/1975', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 3 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1_7.jpg', 'Câu chuyện về chiếc radio Sony gắn với vị khách người Pháp André Menras, hé lộ thông tin về hiện vật.', '06/12/2017', 'Trang 3'),
('AV031', 'Sự ra đời bức ảnh "Bác bắt nhịp bài ca Kết đoàn"', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1_2_1.jpg', 'Ảnh do nghệ sĩ Lâm Hồng Long chụp, ghi lại Chủ tịch Hồ Chí Minh bắt nhịp bài Kết đoàn, cùng ảnh "Mẹ con ngày gặp mặt" nổi tiếng.', '06/12/2017', 'Trang 3'),
('AV032', 'Xe ô tô', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/b1_1_1.jpg', 'Xe biển số HN707 do Trung ương Đảng CS Liên Xô tặng Trung ương Đảng CSVN năm 1954.', '04/11/2017', 'Trang 3'),
('AV033', 'Lư sử tử', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5_10.jpg', 'Nhân dân Trung Quốc tặng Chủ tịch Hồ Chí Minh, năm 1959.', '04/11/2017', 'Trang 3'),
('AV034', 'Bức thêu', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_12.jpg', 'Của phụ nữ tỉnh Quảng Trị tặng Đảng Lao động Việt Nam, năm 1960.', '04/11/2017', 'Trang 3'),
('AV035', 'Bộ đồ ăn bằng bạc', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_15.jpg', 'Nhân dân Mông Cổ tặng Chủ tịch Hồ Chí Minh, năm 1955.', '04/11/2017', 'Trang 3'),
('AV036', 'Bộ đồ trà', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_18.jpg', 'Thương binh miền Nam tặng Chủ tịch Hồ Chí Minh nhân kỷ niệm 70 năm ngày sinh (19/5/1890-19/5/1960).', '04/11/2017', 'Trang 3'),
('AV037', 'Tượng phật, nhân dân Ấn Độ tặng', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_16.jpg', 'Nhân dân Ấn Độ tặng Chủ tịch Hồ Chí Minh, năm 1958.', '04/11/2017', 'Trang 4'),
('AV038', 'Chế biến thủy sản đông lạnh xuất khẩu', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a6_9.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV039', 'Sản xuất sứ vệ sinh', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5_9.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV040', 'Đập tràn Nhà máy Thủy điện Hoà Bình', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 1 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_11.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV041', 'Đại hội đại biểu toàn quốc', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_14.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV042', 'Quạt điện, thời kỳ bao cấp', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_17.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV043', 'Tem phiếu mua hàng thời kỳ bao cấp', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_15.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV044', 'Sổ mua lương thực thời kỳ bao cấp', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_16.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV045', 'Xếp hàng mua lương thực', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_16.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV046', 'Quốc hội khóa VI', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 1 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_14.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV047', 'Hội nghị Hiệp thương', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_15.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV048', 'Nhân dân Thủ đô Hà Nội mít tinh', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a9_2.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 4'),
('AV049', 'Xe tăng', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a8_4.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 5'),
('AV050', 'Lễ ký Hiệp định đình chiến', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a7_6.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 5'),
('AV051', 'Băng khẩu hiệu', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 3 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a6_8.jpg', 'Dòng chữ "Việt Nam là lương tâm thời đại", nhân dân Ý dùng trong biểu tình ủng hộ Việt Nam chống Mỹ, năm 1970.', '04/11/2017', 'Trang 5'),
('AV052', 'Băng da', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5_8.jpg', 'Do tổ chức chống chiến tranh ở Việt Nam của Mỹ phát hành, thanh niên Mỹ dùng bịt đầu biểu tình ở Washington, 22/4/1970.', '04/11/2017', 'Trang 5'),
('AV053', 'Mũ của Hội cựu chiến binh Mỹ', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 2 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_10.jpg', 'Đội trong cuộc biểu tình ở Washington ủng hộ Việt Nam chống Mỹ, ngày 20/12/1966.', '04/11/2017', 'Trang 5'),
('AV054', 'Trống của đoàn Phật giáo Nhật Bản', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_13.jpg', 'Dùng đấu tranh ủng hộ nhân dân Việt Nam, thời kỳ 1965-1967.', '04/11/2017', 'Trang 5'),
('AV055', 'Lịch', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 1 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_15.jpg', 'Công nhân dệt ở Berlin (Đức) in và phát hành bán lấy tiền ủng hộ Việt Nam chống Mỹ, năm 1969.', '04/11/2017', 'Trang 5'),
('AV056', 'Xích và khóa', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 2 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_13.jpg', 'Công nhân Australia dùng khóa nhà Quốc hội, đấu tranh ủng hộ Việt Nam chống Mỹ.', '04/11/2017', 'Trang 5'),
('AV057', 'Tranh làm bằng xác máy bay Mỹ', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_12.jpg', 'Đảng bộ Đảng Dân chủ Thành phố Vinh tặng Đảng Cộng sản Việt Nam, năm 1968.', '04/11/2017', 'Trang 5'),
('AV058', 'Cào cỏ', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_14.jpg', 'Anh hùng Lao động Đinh Như Gia cùng xã viên HTX Gia Hồ, Vĩnh Linh, Quảng Trị làm từ xác máy bay Mỹ.', '04/11/2017', 'Trang 5'),
('AV059', 'Ca uống nước', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_12.jpg', 'Chiến sĩ công an Đồn 56 Vĩnh Linh làm từ mảnh xác máy bay Mỹ bị bắn rơi, ngày 28-5-1965.', '04/11/2017', 'Trang 5'),
('AV060', 'Huy hiệu "Sơn La quyết thắng"', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_14.jpg', 'Làm từ mảnh xác máy bay Mỹ bị bắn rơi tại Sơn La, ngày 14-6-1965.', '04/11/2017', 'Trang 5'),
('AV061', 'Đàn măngđôlin', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 1 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a6_7.jpg', 'Anh hùng Liệt sĩ Nguyễn Văn Trỗi dùng khi còn sống.', '04/11/2017', 'Trang 6'),
('AV062', 'Anh hùng liệt sĩ Nguyễn Văn Trỗi', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 2 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5_7.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 6'),
('AV063', 'Cờ "Đi là chiến thắng, đánh là diệt gọn"', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 3 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_9.jpg', 'Có chữ ký của 182 cán bộ, chiến sĩ Sư đoàn II Quân Giải phóng Liên khu V, cắm trên cột cờ TP Đà Nẵng trong Tết Mậu Thân, 10-1-1968.', '04/11/2017', 'Trang 6'),
('AV064', 'Mõ', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_11.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 6'),
('AV065', 'Cưa', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_13.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 6'),
('AV066', 'Súng gỗ', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_11.jpg', 'Nhân dân ấp Định Hưng (Bến Tre) tự tạo, dùng trong Đồng Khởi năm 1960.', '04/11/2017', 'Trang 6'),
('AV067', 'Súng ngựa trời', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_13.jpg', 'Công binh xưởng xã Định Thủy, Mỏ Cày, Bến Tre tự chế, dùng trong phong trào Đồng Khởi 1960.', '04/11/2017', 'Trang 6'),
('AV068', 'Phong trào Đồng khởi', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/b1.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 6'),
('AV069', 'Mũ rơm', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/b_1.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 6'),
('AV070', 'Đơn vị pháo cao xạ', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a9_1.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 6'),
('AV071', 'Hầm trú ẩn', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a8_3.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 6'),
('AV072', 'Dụng cụ làm đường', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a7_5.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 6'),
('AV073', 'Gàu tát nước', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a6_6.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 7'),
('AV074', 'Chủ tịch Hồ Chí Minh tát nước chống hạn', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5_6.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 7'),
('AV075', 'Đũa nhạc trưởng', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_8.jpg', 'Chủ tịch Hồ Chí Minh dùng bắt nhịp bài "Kết đoàn" tại Công viên Bách Thảo Hà Nội, tối 19-9-1960.', '04/11/2017', 'Trang 7'),
('AV076', 'Chủ tịch Hồ Chí Minh bắt nhịp bài "Kết đoàn"', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_10.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 7'),
('AV077', 'Tàu không số', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_12.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 7'),
('AV078', 'Đường Trường Sơn', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_10.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 7'),
('AV079', 'Cầu Hiền Lương', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_12.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 7'),
('AV080', 'Thứ trưởng Bộ Quốc phòng', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a8_2.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 7'),
('AV081', 'Gắn huy hiệu', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a7_4.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 7'),
('AV082', 'Huy hiệu "Chiến sĩ Điện Biên"', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a6_5.jpg', 'Chủ tịch Hồ Chí Minh tặng thưởng cho các chiến sĩ chiến đấu, chiến thắng ở chiến dịch Điện Biên Phủ, năm 1954.', '04/11/2017', 'Trang 7'),
('AV083', 'Súng ĐKZ', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5_5.jpg', 'Anh hùng Trần Đình Hùng sử dụng tấn công địch trong chiến dịch Điện Biên Phủ, năm 1954.', '04/11/2017', 'Trang 7'),
('AV084', 'Mũi khoan', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_7.jpg', 'Bộ đội công binh dùng mở đường tấn công địch ở Điện Biên Phủ, năm 1954.', '04/11/2017', 'Trang 7'),
('AV085', 'Máy vô tuyến điện', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_9.jpg', 'Chiến sĩ thông tin Chu Văn Mùi dùng phục vụ liên lạc trong chiến dịch Điện Biên Phủ.', '04/11/2017', 'Trang 8'),
('AV086', 'Cuốc chim', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_10.jpg', 'Bộ đội dùng đào hầm đánh cứ điểm Him Lam, tháng 3-1954.', '04/11/2017', 'Trang 8'),
('AV087', 'Cờ "Quyết chiến quyết thắng"', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_9.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 8'),
('AV088', 'Cọc tời', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_11.jpg', 'Bộ đội pháo binh dùng kéo pháo ở Điện Biên Phủ, năm 1954.', '04/11/2017', 'Trang 8'),
('AV089', 'Chiến thắng lịch sử Điện Biên Phủ', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a8_1.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 8'),
('AV090', 'Xe đạp thồ', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a7_3.jpg', 'Ông Bùi Tín, dân công tỉnh Thanh Hóa, dùng vận chuyển lương thực phục vụ chiến dịch Điện Biên Phủ, năm 1954.', '04/11/2017', 'Trang 8'),
('AV091', 'Đoàn xe đạp thồ', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a6_4.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 8'),
('AV092', 'Hai bộ phận của Đài Phát thanh', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5_4.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 8'),
('AV093', 'Đài Phát thanh Tiếng nói Nam Bộ', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_6.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 8'),
('AV094', 'Lớp học văn hóa', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_8.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 8'),
('AV095', 'Máy dập thuốc viên', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_9.jpg', 'Cán bộ nhân viên ngành y tế Trung ương dùng dập các loại thuốc, năm 1948.', '04/11/2017', 'Trang 8'),
('AV096', 'Đèn', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_8.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 8'),
('AV097', 'Áo', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_10.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 9'),
('AV098', 'Hũ gạo nuôi quân', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_5.jpg', 'Của gia đình chị Vinh ở thôn Cổ Đô, huyện Quốc Oai, Hà Tây (nay là Hà Nội).', '04/11/2017', 'Trang 9'),
('AV099', 'Chiến sĩ quyết tử', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_7.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 9'),
('AV100', 'Bom ba càng', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_8.jpg', 'Quyết tử quân Hà Nội dùng chống xe tăng Pháp trong những ngày đầu toàn quốc kháng chiến, tháng 12-1946.', '04/11/2017', 'Trang 9'),
('AV101', 'Tranh "Chủ tịch Hồ Chí Minh và thiếu nhi Bắc, Trung, Nam"', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_7.jpg', 'Họa sĩ Diệp Minh Châu vẽ bằng máu trên vải lụa, năm 1947.', '04/11/2017', 'Trang 9'),
('AV102', 'Chủ tịch Hồ Chí Minh tại Kỳ họp thứ Nhất Quốc hội khóa I', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a10.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 9'),
('AV103', 'Chính phủ Lâm thời', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a9.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 9'),
('AV104', 'Bản nhạc "Tiến quân ca"', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a8.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 9'),
('AV105', 'Tượng đồng Chủ tịch Hồ Chí Minh', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a7_2.jpg', 'Tượng đồng Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình, Hà Nội, ngày 2-9-1945.', '04/11/2017', 'Trang 9'),
('AV106', 'Lễ Độc lập tại Quảng trường Ba Đình', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a6_3.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 9'),
('AV107', 'Gậy tầm vông', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5_3.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 9'),
('AV108', 'Mũi lao', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_4.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 9'),
('AV109', 'Mã tấu', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_6.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 10'),
('AV110', 'Kiếm', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_7.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 10'),
('AV111', 'Dao trường', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_6.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 10'),
('AV112', 'Nhân dân Hà Nội đánh chiếm Phủ Khâm sai', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a6_2.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 10'),
('AV113', 'Nhân dân Sài Gòn mít tinh', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5_2.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 10'),
('AV114', 'Cờ đỏ sao vàng', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_3.jpg', 'Treo tại Đại hội Quốc dân Tân Trào, huyện Sơn Dương, Tuyên Quang, tháng 8-1945.', '04/11/2017', 'Trang 10'),
('AV115', 'Đề án Nghị quyết', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_5.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 10'),
('AV116', 'La bàn', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_6.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 10'),
('AV117', 'Áo vét tông', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_5.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 10'),
('AV118', 'Lễ thành lập Đội Việt Nam Tuyên truyền Giải phóng Quân', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 1 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_7.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 10'),
('AV119', 'Bàn đá và rulô', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a7_1.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 10'),
('AV120', 'Báo Việt Nam Độc Lập', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a6_1.jpg', 'Cơ quan tuyên truyền của Việt Minh Cao Bằng do Nguyễn Ái Quốc sáng lập, số 1 (101), ngày 1-8-1941.', '04/11/2017', 'Trang 10'),
('AV121', 'Máy chém', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5_1.jpg', 'Thực dân Pháp đặt tại nhà tù Hòa Lò (Hà Nội), dùng xử tử nhiều người Việt Nam yêu nước thời kỳ trước 1945.', '04/11/2017', 'Trang 11'),
('AV122', 'Trụ sở báo "Tin tức"', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_2.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 11'),
('AV123', 'Báo Lao Động', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_4.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 11'),
('AV124', 'Báo tin học', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_5.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 11'),
('AV125', 'Báo Dân Chúng', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_4.jpg', 'Cơ quan trung ương của Đảng Cộng sản Đông Dương, số 41, ra ngày 3/1/1939.', '04/11/2017', 'Trang 11'),
('AV126', 'Đèn tọa đăng', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1k.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 11'),
('AV127', 'Nguyễn Ái Quốc', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1f.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 11'),
('AV128', 'Tranh "Ba tầng áp bức"', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1e.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 11'),
('AV129', 'Bia Mỹ Sơn 1', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_3.jpg', 'Đá cát, thế kỷ 5, đền Mỹ Sơn A1, huyện Duy Xuyên, tỉnh Quảng Nam.', '04/11/2017', 'Trang 11'),
('AV130', 'Biển "Chính Đông môn", "Tây Nam môn"', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/t1_1.jpg', 'Thế kỷ 19, triều Nguyễn.', '04/11/2017', 'Trang 11'),
('AV131', 'Cây hương, đá', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a5.jpg', 'Dựng vào tháng 10 năm Bính Ngọ, niên hiệu Cảnh Trị thứ 4 (1666), thôn Tứ Kỳ, Thanh Trì, Hà Nội.', '04/11/2017', 'Trang 11'),
('AV132', 'Cổng tam quan', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 3 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4_1.jpg', 'Đá, triều Lê - Nguyễn, cuối thế kỷ 18 - đầu thế kỷ 19, Hải Phòng.', '04/11/2017', 'Trang 11'),
('AV133', 'Tượng hổ', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_4.jpg', 'Đá, dựng năm 1264, lăng Trần Thủ Độ, tỉnh Thái Bình.', '04/11/2017', 'Trang 12'),
('AV134', 'Bia chùa Báo Ân', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_5.jpg', 'Đá, thời Lý, thế kỷ 12, xã An Hoạch, huyện Đông Sơn, tỉnh Thanh Hóa.', '04/11/2017', 'Trang 12'),
('AV135', 'Cặp chân đèn', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a3_2.jpg', 'Gỗ chạm, đầu thế kỷ 20.', '04/11/2017', 'Trang 12'),
('AV136', 'Giá đèn hình tòa Cửu Long', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_3.jpg', 'Sắt, đầu thế kỷ 20.', '04/11/2017', 'Trang 12'),
('AV137', 'Tượng bán thân thiếu nữ Hà Nội', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1_2.jpg', 'Đồng, đầu thế kỷ 20.', '04/11/2017', 'Trang 12'),
('AV138', 'Tượng người nông dân đi cày', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_4.jpg', 'Đồng, đầu thế kỷ 20.', '04/11/2017', 'Trang 12'),
('AV139', 'Phù điêu sư tử', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a2_2.jpg', 'Đá cát, thế kỷ 13, Tháp Mẫm, Bình Định.', '04/11/2017', 'Trang 12'),
('AV140', 'Đài thờ Uroja', 'DM12', 'Đồ vàng bạc & trang sức', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 2 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1.png', 'Bạc, thế kỷ 11-12, văn hóa Champa.', '04/11/2017', 'Trang 12'),
('AV141', 'Phù điêu thần Siva', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 3 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_3.jpg', 'Đá cát, thế kỷ 13, Tháp Mẫm, huyện An Nhơn, tỉnh Bình Định.', '04/11/2017', 'Trang 12'),
('AV142', 'Sưu tập tiền kim loại', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/t6.jpg', 'Thế kỷ 5-6, văn hóa Óc Eo.', '04/11/2017', 'Trang 12'),
('AV143', 'Bình Kendi', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/t4.png', 'Gốm, thế kỷ 5-8, văn hóa Óc Eo.', '04/11/2017', 'Trang 12'),
('AV144', 'Nhẫn', 'DM12', 'Đồ vàng bạc & trang sức', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/rezise-2.jpg', 'Vàng, thế kỷ 5-6, văn hóa Óc Eo.', '04/11/2017', 'Trang 12'),
('AV145', 'Tượng Phật', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/t1.jpg', 'Gỗ, thế kỷ 5-7, văn hóa Óc Eo.', '04/11/2017', 'Trang 13'),
('AV146', 'Tượng thần Visnu', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/t_2.jpg', 'Đá, thế kỷ 7-9, văn hóa Óc Eo.', '04/11/2017', 'Trang 13'),
('AV147', 'Sưu tập lư hương, đỉnh đồng', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/l.jpg', 'Triều Nguyễn, thế kỷ 19 - đầu thế kỷ 20.', '04/11/2017', 'Trang 13'),
('AV148', 'Sưu tập đồ gỗ khảm trai', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/k2.jpg', 'Triều Nguyễn, đầu thế kỷ 20.', '04/11/2017', 'Trang 13'),
('AV149', 'Sưu tập đồ sứ men trắng vẽ lam và đồ pháp lam', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/d1.jpg', '(đồng tráng men), triều Nguyễn, thế kỷ 19 - đầu thế kỷ 20.', '04/11/2017', 'Trang 13'),
('AV150', 'Sưu tập đồ gỗ sơn son thếp vàng', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a4.jpg', 'Triều Nguyễn, thế kỷ 19 - đầu thế kỷ 20.', '04/11/2017', 'Trang 13'),
('AV151', 'Sưu tập gốm Bát Tràng', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/c_2.jpg', 'Triều Nguyễn, thế kỷ 19 - đầu thế kỷ 20.', '04/11/2017', 'Trang 13'),
('AV152', 'Hộp đựng sách, nghiên mài mực', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/rezise.jpg', 'Triều Nguyễn, thế kỷ 19 - đầu thế kỷ 20.', '04/11/2017', 'Trang 13'),
('AV153', 'Thước gỗ, quả cân đồng, đấu đong', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/rezise-1.jpg', 'Triều Nguyễn, thế kỷ 19 - đầu thế kỷ 20.', '04/11/2017', 'Trang 13'),
('AV154', 'Sưu tập chuông', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/2_2.jpg', 'Đồng, triều Nguyễn, thế kỷ 19 - 20.', '04/11/2017', 'Trang 13'),
('AV155', 'Bộ tranh lục Bộ', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1_4.jpg', 'Giấy dó vẽ nhiều màu, năm 1885, triều Nguyễn, tác giả Nguyễn Văn Nhân.', '04/11/2017', 'Trang 13'),
('AV156', 'Đôi bát thờ', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 3 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/b.jpg', 'Gốm hoa lam, niên hiệu Quang Trung, triều Tây Sơn (1789-1792), Bát Tràng, Gia Lâm, Hà Nội.', '04/11/2017', 'Trang 13'),
('AV157', 'Lệnh chỉ', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a_1.jpg', 'Giấy dó, ngày 15 tháng 5 niên hiệu Quang Trung 3, triều Tây Sơn (năm 1790).', '04/11/2017', 'Trang 14'),
('AV158', 'Trống đồng Cảnh Thịnh', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/trg.jpg', 'Đồng, niên hiệu Cảnh Thịnh 8, triều Tây Sơn (năm 1800).', '04/11/2017', 'Trang 14'),
('AV159', 'Sưu tập gốm Phù Lãng', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 3 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/lh.jpg', 'Gốm Phù Lãng (Bắc Ninh) và Thổ Hà (Bắc Giang), thế kỷ 17-18.', '04/11/2017', 'Trang 14'),
('AV160', 'Ấm trang trí chữ Thọ', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/am.jpg', 'Đồng, thời Lê Trung Hưng, thế kỷ 17-18.', '04/11/2017', 'Trang 14'),
('AV161', 'Sưu tập đồ đồng, thế kỉ 15-18', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/t_1.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 14'),
('AV162', 'Sưu tập tranh thờ', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 3 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/tt.jpg', 'Giấy, thời Lê Trung Hưng, thế kỷ 17-18, sưu tầm tại đền Độc Lôi, huyện Nam Đàn, tỉnh Nghệ An, năm 1959.', '04/11/2017', 'Trang 14'),
('AV163', 'Bộ tranh "Thập điện diêm vương"', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/tr.jpg', 'Gỗ sơn son thếp vàng, thời Lê Trung Hưng, thế kỷ 17-18.', '04/11/2017', 'Trang 14'),
('AV164', 'Tượng Phật nhập niết bàn', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 2 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/tg_1.jpg', 'Gỗ sơn son thếp vàng, thời Lê Trung Hưng, thế kỷ 17-18, chùa Chèm, Bắc Từ Liêm, Hà Nội.', '04/11/2017', 'Trang 14'),
('AV165', 'Thuyền thờ', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 3 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/thuyen-tho.jpg', 'Gỗ sơn son thếp vàng, thế kỷ 17, thời Lê Trung Hưng, chùa Keo, huyện Vũ Thư, tỉnh Thái Bình.', '04/11/2017', 'Trang 14'),
('AV166', 'Đôi vẹt thờ', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/doi-vet-tho-2.jpg', 'Gỗ sơn son thếp vàng, thế kỷ 16-17, Thanh Hóa.', '04/11/2017', 'Trang 14'),
('AV167', 'Lư hương', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 2 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/lu-huong.jpg', 'Gốm men nhiều màu, thời Mạc - Lê Trung Hưng, thế kỷ 16-17, Bát Tràng, Hà Nội.', '04/11/2017', 'Trang 14'),
('AV168', 'Đạn đá', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 3 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/dan-da.jpg', 'Triều Hồ, thế kỷ 15.', '04/11/2017', 'Trang 14'),
('AV169', 'Đầu phượng', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/dau-phuong.jpg', 'Đất nung, triều Trần - Hồ, thế kỷ 14-15.', '04/11/2017', 'Trang 15'),
('AV170', 'Cọc Bạch Đằng', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 2 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/c_1.jpg', 'Năm 1288, gỗ lim, phát hiện tại sông Chanh, huyện Yên Hưng, tỉnh Quảng Ninh, năm 1976.', '04/11/2017', 'Trang 15'),
('AV171', 'Mộc bài Đa Bối', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/mac_bAi.jpg', 'Gỗ, dựng năm 1269, phát hiện tại Thụy Anh, Thái Bình.', '04/11/2017', 'Trang 15'),
('AV172', 'Ấn "Môn Hạ sảnh ấn"', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/an.jpg', 'Đồng, niên hiệu Long Khánh 5, Trần Duệ Tông (năm 1337), phát hiện tại Hương Khê, Hà Tĩnh, năm 1962.', '04/11/2017', 'Trang 15'),
('AV173', 'Sưu tập gốm hoa nâu', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/th.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '04/11/2017', 'Trang 15'),
('AV174', 'Sưu tập vật liệu trang trí kiến trúc đất nung', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 3 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/dn1.jpg', 'Thời Trần, thế kỷ 13-14.', '04/11/2017', 'Trang 15'),
('AV175', 'Sưu tập gốm Lý - Trần, thế kỷ 11-14', 'DM13', 'Đồ ngọc & đá quý', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/a1.jpg', 'Thời kỳ Lý-Trần hình thành và phát triển những dòng gốm men nổi tiếng: men ngọc, men ngà, men nâu, hoa nâu...', '04/11/2017', 'Trang 15'),
('AV176', 'Bia Linh Xứng', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/bia-linh-xung.jpg', 'Đá, dựng năm Thiên Phù Duệ Vũ 7 (1126), chùa Linh Xứng, huyện Hà Trung, tỉnh Thanh Hóa.', '04/11/2017', 'Trang 15'),
('AV177', 'Tượng đầu người mình chim đánh trống (Kinnari)', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/03-11-2017_5-30-09_CH.jpg', 'Đá cát, năm 1057, chùa Phật Tích, huyện Tiên Du, tỉnh Bắc Ninh.', '04/11/2017', 'Trang 15'),
('AV178', 'Bệ kê chân cột', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/be-ke-chan-cot.jpg', 'Đá, năm 1057, chùa Phật Tích, huyện Tiên Du, tỉnh Bắc Ninh.', '04/11/2017', 'Trang 15'),
('AV179', 'Cọc đóng móng thành Hoa Lư', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 2 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/cac.jpg', 'Gỗ, thế kỷ 10, phát hiện tại Phủ Đầu Tường, Hoa Lư, Ninh Bình.', '04/11/2017', 'Trang 15'),
('AV180', 'Tượng uyên ương trang trí kiến trúc', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 3 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/tg.jpg', 'Đất nung, thế kỷ 10, Hoa Lư, Ninh Bình.', '04/11/2017', 'Trang 15'),
('AV181', 'Gạch in chữ "Đại Việt quốc quân thành chuyên" / "Giang Tây quân"', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/gach-dai-viet-quoc-quan_1.jpg', 'Đất nung, thế kỷ 10, Hoa Lư, Ninh Bình.', '04/11/2017', 'Trang 16'),
('AV182', 'Bia Trường Xuân', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/bia.jpg', 'Đá, dựng năm Đại Nghiệp thứ 14 triều Tùy (618), thôn Trường Xuân, xã Đông Ninh, huyện Đông Sơn, tỉnh Thanh Hóa.', '04/11/2017', 'Trang 16'),
('AV183', 'Ấm vòi hình đầu gà', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/aasm.jpg', 'Gốm men, thế kỷ 7-8, lò gốm Tam Thọ (Thanh Hóa).', '04/11/2017', 'Trang 16'),
('AV184', 'Khay', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/kh.jpg', 'Gốm, thế kỷ 2, phát hiện ở Lạch Trường, Thanh Hóa.', '04/11/2017', 'Trang 16'),
('AV185', 'Chậu trống', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/ct.jpg', 'Đồng, thế kỷ 2-3, phát hiện ở Lạch Trường, Thanh Hóa.', '04/11/2017', 'Trang 16'),
('AV186', 'Trống Tân Long (loại Heger II)', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/03-11-2017_5-04-11_CH.jpg', 'Đồng, thế kỷ 2-3, phát hiện ở Hòa Bình.', '04/11/2017', 'Trang 16'),
('AV187', 'Bộ phận kết cấu nhà sàn', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/1_2.jpg', 'Gỗ, di chỉ Bưng Thơm (Bà Rịa, Vũng Tàu), khoảng 2.500-2.000 năm cách ngày nay.', '03/11/2017', 'Trang 16'),
('AV188', 'Chuỗi hạt, mã não', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/c.jpg', 'Di chỉ Giồng Cá Vồ (Cần Giờ, TP.HCM).', '03/11/2017', 'Trang 16'),
('AV189', 'Khuyên tai hai đầu thú, đá', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/k.jpg', 'Đá, di chỉ Giồng Cá Vồ (Cần Giờ, TP.HCM).', '03/11/2017', 'Trang 16'),
('AV190', 'Chân đèn', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/cA.jpg', 'Chân đèn gốm dính sắt.', '03/11/2017', 'Trang 16'),
('AV191', 'Nồi', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/n.jpg', 'Gốm, Duy Xuyên, Quảng Nam.', '03/11/2017', 'Trang 16'),
('AV192', 'Hạt chuỗi, thủy tinh', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/vAng.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '03/11/2017', 'Trang 16'),
('AV193', 'Trâm cài', 'DM12', 'Đồ vàng bạc & trang sức', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/trAm.jpg', 'Sưu tập đồ trang sức văn hóa Đông Sơn: trâm cài, vòng tay, vòng chân, khóa thắt lưng...', '03/11/2017', 'Trang 17'),
('AV194', 'Vòng ống tay gắn lục lạc', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/vAng_tay_1.jpg', 'Sưu tập đồ trang sức văn hóa Đông Sơn.', '03/11/2017', 'Trang 17'),
('AV195', 'Vòng tay thủy tinh', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/vAng_tay.jpg', 'Sưu tập đồ trang sức văn hóa Đông Sơn.', '03/11/2017', 'Trang 17'),
('AV196', 'Dấu in (Bàn dập) hoa văn', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/ban-dap.jpg', 'Gốm, văn hóa Hoa Lộc (Thanh Hóa), khoảng 4.000-3.000 năm cách ngày nay.', '03/11/2017', 'Trang 17'),
('AV197', 'Công cụ tra lắp cán', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/cong_cu_tra_can.jpg', 'Khoảng 4.000-3.000 năm cách ngày nay.', '03/11/2017', 'Trang 17'),
('AV198', 'Chuỗi hạt', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/chuai_hat.jpg', 'Vỏ nhuyễn thể, khoảng 4.000-3.000 năm cách ngày nay, di chỉ Xóm Thâm, xã Trung Hóa, huyện Minh Hóa, tỉnh Quảng Bình.', '03/11/2017', 'Trang 17'),
('AV199', 'Xẻng', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/xeng.jpg', 'Sưu tập công cụ đá miền núi phía Bắc, khoảng 4.000-3.000 năm cách ngày nay.', '03/11/2017', 'Trang 17'),
('AV200', 'Rìu bôn', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/riu-bon.jpg', 'Sưu tập công cụ đá miền núi phía Bắc, khoảng 4.000-3.000 năm cách ngày nay.', '03/11/2017', 'Trang 17'),
('AV201', 'Cuốc', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/cuoc.jpg', 'Sưu tập công cụ đá miền núi phía Bắc, khoảng 4.000-3.000 năm cách ngày nay.', '03/11/2017', 'Trang 17'),
('AV202', 'Sưu tập vỏ nhuyễn thể', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/03-11-2017_12-05-41_CH.jpg', 'Văn hóa Đa Bút (Thanh Hóa), văn hóa Quỳnh Văn (Nghệ An), khoảng 7.000-4.500 năm cách ngày nay.', '03/11/2017', 'Trang 17'),
('AV203', 'Gốm đáy nhọn', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/gom-day-nhon.jpg', 'Văn hóa Quỳnh Văn (Nghệ An), khoảng 7.000-5.000 năm cách ngày nay.', '03/11/2017', 'Trang 17'),
('AV204', 'Bàn mài lưỡi công cụ (dấu Bắc Sơn)', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/ban-mai-luoi.jpg', 'Đá Schiste, văn hóa Bắc Sơn, khoảng 11.000-6.000 năm cách ngày nay.', '03/11/2017', 'Trang 17'),
('AV205', 'Rìu tay', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/riu-tay.jpg', 'Đá bazan, khoảng 400.000-300.000 năm cách ngày nay, phát hiện tại Núi Đọ, xã Triệu Khánh, huyện Thiệu Hóa, tỉnh Thanh Hóa, năm 1960.', '03/11/2017', 'Trang 18'),
('AV206', 'Chày và bàn nghiền thức ăn', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/chay-va-ban-nghien-thuc-an.jpg', 'Đá, văn hóa Hòa Bình, khoảng 18.000-7.000 năm cách ngày nay.', '03/11/2017', 'Trang 18'),
('AV207', 'Rìu ngắn', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/riu-ngan.jpg', 'Đá cuội, văn hóa Hòa Bình, khoảng 18.000-7.000 năm cách ngày nay.', '03/11/2017', 'Trang 18'),
('AV208', 'Bộ phận kết cấu nhà sàn', 'DM11', 'Đồ gỗ mỹ nghệ & kiến trúc cổ', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/bo-phan-ket-cau-nha-san.jpg', 'Gỗ, di chỉ Bưng Thơm (Bà Rịa, Vũng Tàu), khoảng 2.500-2.000 năm cách ngày nay.', '20/10/2017', 'Trang 18'),
('AV209', 'Khuyên tai hai đầu thú', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/khuyen-tai-hai-dau-thu-2.jpg', 'Văn hóa Đồng Nai có nhiều đồ trang sức: khuyên tai hai đầu thú...', '20/10/2017', 'Trang 18'),
('AV210', 'Mộ vò', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/m.jpg', 'Văn hóa Đồng Nai, khoảng 2.500-2.000 năm cách ngày nay.', '20/10/2017', 'Trang 18'),
('AV211', 'Nồi', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/n.jpg', 'Cư dân Sa Huỳnh chế tác gốm phong phú, được phát hiện trong mộ táng: bát bồng, nồi, bình, đèn...', '20/10/2017', 'Trang 18'),
('AV212', 'Khuyên tai ba mấu, bốn mấu', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/khuyen-tai-ba-mau-bon-mau.jpg', 'Đồ trang sức văn hóa Sa Huỳnh: hạt chuỗi, khuyên tai, vòng đeo tay...', '20/10/2017', 'Trang 18'),
('AV213', 'Mộ chum', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/mo-chum.jpg', 'Gốm, văn hóa Sa Huỳnh, Gò Dừa, Duy Xuyên, Quảng Nam, khoảng 2.500-2.000 năm cách ngày nay.', '20/10/2017', 'Trang 18'),
('AV214', 'Hộ tâm phiến', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/ho-tam-phien.jpg', 'Đồng, văn hóa Đông Sơn, khoảng 2.500-2.000 năm cách ngày nay.', '20/10/2017', 'Trang 18'),
('AV215', 'Mũi tên', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/mui-ten.jpg', 'Đồng, khoảng 2.500-2.000 năm cách ngày nay, phát hiện ở Cổ Loa, Đông Anh, Hà Nội.', '20/10/2017', 'Trang 18'),
('AV216', 'Vũ khí Đông Sơn', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/quam-riu-giao.jpg', 'Sưu tập vũ khí Đông Sơn phong phú, chia 2 loại: vũ khí tiến công và vũ khí phòng thủ.', '20/10/2017', 'Trang 18'),
('AV217', 'Lưỡi hái', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/luoi-hai.jpg', 'Nông cụ thu hoạch lúa của cư dân Đông Sơn.', '20/10/2017', 'Trang 19'),
('AV218', 'Rìu', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/riu.jpg', 'Đồng, khoảng 2.500-2.000 năm cách ngày nay, phát hiện tại Hà Đông, Hà Nội.', '20/10/2017', 'Trang 19'),
('AV219', 'Thạp Đào Thịnh', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/thap-dao-thinh.jpg', 'Đồng, văn hóa Đông Sơn, khoảng 2.500-2.000 năm cách ngày nay.', '20/10/2017', 'Trang 19'),
('AV220', 'Trống đồng Hoàng Hạ', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/trong-dong-3.jpg', 'Văn hóa Đông Sơn, khoảng 2.500-2.000 năm cách ngày nay.', '20/10/2017', 'Trang 19'),
('AV221', 'Trống đồng Ngọc Lũ', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/trong-dong-1.jpg', 'Văn hóa Đông Sơn, khoảng 2.500-2.000 năm cách ngày nay.', '20/10/2017', 'Trang 19'),
('AV222', 'Lưỡi câu', 'DM08', 'Cổ vật đồng', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/luoi-cau.jpg', 'Đồng, văn hóa Gò Mun, khoảng 3.000-2.500 năm cách ngày nay.', '20/10/2017', 'Trang 19'),
('AV223', 'Chì lưới', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/chi-luoi.jpg', 'Gốm, văn hóa Gò Mun, khoảng 3.000-2.500 năm cách ngày nay.', '20/10/2017', 'Trang 19'),
('AV224', 'Tượng bò, gà', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/tuong-ga.jpg', 'Gốm, văn hóa Đồng Đậu, khoảng 3.500-3.000 năm cách ngày nay.', '20/10/2017', 'Trang 19'),
('AV225', 'Dọi xe sợi', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 3 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/doi-xe-soi.jpg', 'Gốm, văn hóa Phùng Nguyên, khoảng 4.000-3.500 năm cách ngày nay.', '20/10/2017', 'Trang 19'),
('AV226', 'Tượng người đàn ông', 'DM13', 'Đồ ngọc & đá quý', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/tuong-nguoi-dan-ong.jpg', 'Đá ngọc, văn hóa Phùng Nguyên, khoảng 4.000-3.500 năm cách ngày nay, phát hiện ở di chỉ Văn Điển, Thanh Trì, Hà Nội.', '20/10/2017', 'Trang 19'),
('AV227', 'Răng người vượn', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 2 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/asset/upload/hien-vat-va-tu-lieu/rang-tiensu.jpg', 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.', '09/10/2017', 'Trang 19'),
('AV228', 'Chiếc ấm sắc thuốc cho lãnh tụ Hồ Chí Minh', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_20168822h16m49s.jpg', 'Chiếc ấm đất của đồng bào Chiến khu Việt Bắc dùng sắc thuốc cho Hồ Chí Minh khi Người hoạt động cách mạng ở Thái Nguyên năm 1945.', '08/08/2016', 'Trang 19'),
('AV229', 'Về tấm bia đàn Nam Giao thời Lê ở Hà Nội', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_20162818h8m24s.jpg', 'Đàn tế trời xây dựng thời Lý (1152) ở An Thọ, Thọ Xương; thời Hậu Lê, đàn Nam Giao xây ở Thanh Hoa (nay Thọ Xuân, Thanh Hóa).', '08/02/2016', 'Trang 20'),
('AV230', 'Tìm hiểu về các loại gạch in chữ đang trưng bày ở Bảo tàng Lịch sử quốc gia', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 2 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_2015112614h7m47s.jpg', 'Gạch in chữ phổ biến ở thành Hoa Lư, thành Thăng Long, thành Nhà Hồ...', '26/11/2015', 'Trang 20'),
('AV231', 'Lá cờ của Việt kiều Paris (Pháp) treo mừng Lễ Độc lập 2-9-1945', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201581710h3m29s.jpg', 'Ngày 2-9-1945, Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình.', '17/08/2015', 'Trang 20'),
('AV232', 'Sự ra đời bức ảnh "Bác bắt nhịp bài ca Kết đoàn"', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201551215h11m33s.jpg', 'Ảnh do nghệ sĩ Lâm Hồng Long chụp.', '12/05/2015', 'Trang 20'),
('AV233', 'Chiếc đài bán dẫn Sony xác nhận thông tin "miền Nam hoàn toàn giải phóng"', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 2 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201551112h25m18s.jpg', 'Câu chuyện về chiếc radio Sony gắn với vị khách người Pháp André Menras.', '11/05/2015', 'Trang 20'),
('AV234', 'Tập chữ ký ủng hộ Việt Nam chống Mỹ cứu nước của nhân dân Bungari', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 3 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201541516h1m42s.jpg', 'Sự giúp đỡ của các nước anh em, bè bạn với Việt Nam trong kháng chiến chống Mỹ.', '15/04/2015', 'Trang 20'),
('AV235', 'Đôi lọ lục bình giấu tài liệu bí mật của Đảng', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201521111h0m46s.jpg', 'Đôi lọ gốm sứ Hoa lam Trung Quốc dùng giấu tài liệu Đảng chuyển từ nước ngoài về Hải Phòng, 1932.', '11/02/2015', 'Trang 20'),
('AV236', 'Sưu tập truyền đơn cách mạng trước tháng 9-1945 hiện lưu giữ tại BTLSQG', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201512916h27m7s.jpg', 'Truyền đơn giữ vai trò quan trọng trong tuyên truyền cách mạng suốt 15 năm (1930-1945).', '29/01/2015', 'Trang 20'),
('AV237', 'Chiếc hòm phiếu bầu cử quốc hội khóa I', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_20151915h21m12s.jpg', 'Gắn với cuộc Tổng tuyển cử đầu tiên sau Tuyên ngôn độc lập 2/9/1945.', '09/01/2015', 'Trang 20'),
('AV238', 'Kỷ vật của Đội trưởng Đội Việt Nam Tuyên truyền Giải phóng Quân Hoàng Sâm', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 1 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_2014121814h47m53s.jpg', 'Ngày 22-12-1944, đồng chí Võ Nguyên Giáp tuyên bố thành lập Đội VN Tuyên truyền Giải phóng Quân do Hoàng Sâm làm Đội trưởng.', '18/12/2014', 'Trang 20'),
('AV239', 'Những kỷ vật của mẹ Suốt - người chèo thuyền trên sông Nhật Lệ', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 2 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201410278h51m30s.jpg', 'Quảng Bình là tuyến đầu hậu phương miền Bắc, "yết hầu" giao thông chi viện cho miền Nam trong kháng chiến chống Mỹ.', '27/10/2014', 'Trang 20'),
('AV240', 'Sắc màu văn hóa qua sưu tập tặng phẩm của nhân dân Việt Nam, nhân dân thế giới tặng Chủ tịch Hồ Chí Minh và Đảng Cộng sản Việt Nam tại BTLSQG', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_2014101814h4m52s.jpg', 'Tặng quà là hành vi văn hóa, nghệ thuật, thể hiện tấm lòng người tặng.', '18/10/2014', 'Trang 20'),
('AV241', 'Đồ gốm thế kỷ 1-3 sau công nguyên lưu giữ tại Bảo tàng Lịch sử quốc gia', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201541316h37m29s.jpg', '10 thế kỷ đầu công nguyên là thời kỳ chống ách thống trị phong kiến phương Bắc, từ khởi nghĩa Hai Bà Trưng (40 SCN) đến chiến thắng Bạch Đằng của Ngô Quyền (938).', '23/09/2014', 'Trang 21'),
('AV242', 'Cây nhiệt đới - vũ khí trinh sát điện tử Mỹ sử dụng trong chiến tranh Việt Nam', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201491611h39m49s.jpg', 'Quân đội Mỹ dùng hệ thống trinh sát điện tử hiện đại để ngăn chi viện từ miền Bắc vào miền Nam.', '12/09/2014', 'Trang 21'),
('AV243', 'Cờ bình dân học vụ của lớp Sơ cấp Thị trấn Gia Rai tặng Hồ Chí Minh', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_2014949h10m14s.jpg', 'Gắn với sự kiện Tuyên ngôn độc lập 2-9-1945 tại Quảng trường Ba Đình.', '04/09/2014', 'Trang 21'),
('AV244', 'Báo "Hồn Nước" của thanh niên cứu quốc khu Hoàng Diệu năm 1945', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201481515h15m48s.jpg', 'Báo chí cách mạng trước 1945 tập trung đấu tranh chống đế quốc, thực dân, tay sai.', '15/08/2014', 'Trang 21'),
('AV245', 'Thú chơi cổ ngoạn của người Hà Nội xưa', 'DM04', 'Ảnh tư liệu lịch sử', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201451615h52m50s.jpg', 'Người Hà Nội xưa chơi cổ ngoạn theo lối thưởng ngoạn Trung Hoa: sập gụ, tủ chè, bình phong, đại tự, câu đối...', '16/05/2014', 'Trang 21'),
('AV246', 'Sưu tập tranh tuyên truyền, cổ động trong kháng chiến chống thực dân Pháp (1946-1954)', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201451614h28m27s.jpg', 'BTLSQG lưu giữ số lượng lớn tranh tuyên truyền, cổ động, riêng giai đoạn 1946-1954 gần 200 bản.', '16/05/2014', 'Trang 21'),
('AV247', 'Chiếc Va li mây của chủ tịch Hồ Chí Minh', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng D · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201441411h15m37s.jpg', 'Ngày 28/1/1941, Nguyễn Ái Quốc từ Tĩnh Tây (Trung Quốc) về nước lãnh đạo cách mạng, cùng các đồng chí Phùng Chí Kiên, Lê Quảng Ba...', '14/04/2014', 'Trang 21'),
('AV248', 'Về một kỷ vật của Anh hùng liệt sĩ Hoàng Lê Kha', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201481411h32m45s.jpg', 'Chiếc sắc cốt của anh hùng liệt sĩ Hoàng Lê Kha dùng trong những năm 1952-1954.', '25/09/2013', 'Trang 21'),
('AV249', 'Một số thông tin về tranh, tượng đề tài chiến tranh cách mạng đang trưng bày tại Bảo tàng Lịch sử Quốc gia (phần cuối)', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng A · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_2013889h50m22s.JPG', 'Giới thiệu tranh "Trận Tầm Vu" và các tác phẩm khác.', '08/08/2013', 'Trang 21'),
('AV250', 'Đồ gốm men thời Lý-Trần tìm được trong khu vực thành Thăng Long lưu giữ tại Bảo tàng Lịch sử Quốc gia', 'DM10', 'Cổ vật gốm', 'Lịch sử Việt Nam', 'Trung đại', 'Tầng 1 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_20138216h38m9s.jpg', 'Từ cuối thế kỷ 19 đầu 20, hoạt động sưu tầm khảo cổ tại thành Thăng Long thu được nhiều gốm men và đất nung mang đặc điểm nghệ thuật thời Lý-Trần.', '02/08/2013', 'Trang 21'),
('AV251', 'Một số thông tin về tranh, tượng đề tài chiến tranh cách mạng hiện đang trưng bày tại Bảo tàng Lịch sử Quốc gia', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng B · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_20137309h58m12s.JPG', 'BTLSQG lưu giữ nhiều hiện vật lịch sử cổ đại, trung đại và cận hiện đại, gồm sưu tập tranh nghệ thuật đề tài chiến tranh cách mạng.', '30/07/2013', 'Trang 21'),
('AV252', 'Bia Cấm tệ sách nhiễu dân (Thân cấm khử tệ)', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_20137119h21m4s.jpg', 'Bia đá (ký hiệu LSb.23347) khắc "Thân cấm khử tệ", dựng ngày 12 tháng 4 năm Tân Tỵ, niên hiệu Tự Đức thứ 34 (1881).', '11/07/2013', 'Trang 21'),
('AV253', 'Bom ba càng, quyết tử quân Thủ đô dùng đánh xe tăng Pháp trong những ngày đầu toàn quốc kháng chiến, 12/1946', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng C · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_20137414h27m31s.jpg', 'Ngày 18-19/12/1946, Ban Thường vụ Trung ương Đảng họp tại Vạn Phúc - Hà Đông, quyết định phát động toàn quốc kháng chiến vào 20 giờ ngày 19/12/1946.', '04/07/2013', 'Trang 22'),
('AV254', 'Kỷ niệm 88 năm ngày báo chí cách mạng Việt Nam (21/6/1925-21/6/2013) - Một số báo chí cách mạng thời kỳ 1936-1939', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 2 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201362023h5m26s.jpg', 'Báo chí là vũ khí quan trọng trong đấu tranh giải phóng và bảo vệ độc lập dân tộc.', '20/06/2013', 'Trang 22'),
('AV255', 'Bức tranh "Bác Hồ với ba cháu thiếu nhi Trung Nam Bắc" được vẽ bằng máu của họa sĩ Diệp Minh Châu', 'DM07', 'Tranh, tượng & tác phẩm nghệ thuật cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng D · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201361522h37m38s.jpg', 'Họa sĩ, nhà điêu khắc Diệp Minh Châu vẽ, nặn hàng trăm tác phẩm về Bác Hồ.', '15/06/2013', 'Trang 22'),
('AV256', 'Sưu tập báo chí cách mạng Việt Nam trước năm 1945 tại Bảo tàng Lịch sử Quốc gia', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng D · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201361410h4m42s.jpg', 'Hồ Chí Minh: "Báo chí là một mặt trận", "Cây bút là vũ khí sắc bén, bài báo là tờ hịch cách mạng".', '14/06/2013', 'Trang 22'),
('AV257', 'Anh hùng liệt sĩ Bế Văn Đàn (1931-1954)', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng A · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201361321h43m34s.jpg', 'Khẩu súng trung liên anh lấy thân mình làm giá súng trong trận chiến đấu ở Mường Pồn (Lai Châu, nay thuộc Điện Biên), chiến dịch Đông Xuân 1953-1954.', '13/06/2013', 'Trang 22'),
('AV258', 'Sưu tập Báo của Trung Ương Đảng Cộng sản Việt Nam xuất bản trước tháng 12-1945', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng A · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_20136716h2m9s.jpg', 'Báo của Trung ương và các Ban trực thuộc: Công Vận, Nông vận, Tuyên truyền... và các tổ chức tiền thân của Đảng.', '07/06/2013', 'Trang 22'),
('AV259', 'Nội dung bài ký khắc trên bia chùa Báo Ân, hiện vật Bảo tàng Lịch sử quốc gia', 'DM09', 'Cổ vật đá', 'Lịch sử Việt Nam', 'Cổ đại', 'Tầng 1 · Phòng B · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201352316h33m24s.gif', 'Chùa Báo Ân dựng thời Lý ở núi An Hoạch (Đông Sơn, Thanh Hóa), hoàn thành năm 1100 để báo ơn Thái úy Lý Thường Kiệt.', '23/05/2013', 'Trang 22'),
('AV260', '200 lượng vàng mua áo len của Hồ Chủ tịch', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng B · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_20135219h30m13s.jpg', 'Áo len màu be Hồ Chí Minh tặng chiến sĩ mùa đông 1946, được đấu giá 18/12/1946 trong "Tuần lễ vàng".', '21/05/2013', 'Trang 22'),
('AV261', 'Bằng khen của Tổng bộ Việt Minh truy tặng anh Kim Đồng – Người đội trưởng đầu tiên của Đội TNTP HCM', 'DM05', 'Trang phục, huy hiệu & huân huy chương', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 3 · Phòng C · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201352121h24m26s.jpg', 'Kim Đồng (Nông Văn Dền), người Nùng ở Nà Mạ, Hà Quảng, Cao Bằng, đội viên đầu tiên của Đội nhi đồng Cứu quốc (1941).', '16/05/2013', 'Trang 22'),
('AV262', 'Sưu tập Báo Cờ Giải phóng (1943-1945) của Bảo tàng Lịch sử Quốc gia', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng C · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_20135159h21m51s.jpg', 'Cơ quan tuyên truyền cổ động Trung ương Đảng CS Đông Dương, số 1 ra ngày 10-10-1942; Tổng Bí thư Trường Chinh phụ trách.', '15/05/2013', 'Trang 22'),
('AV263', 'Sưu tập Báo Dân chúng (1938-1939) của Bảo tàng Lịch sử Quốc gia', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng D · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201351310h11m0s.jpg', 'Cơ quan ngôn luận Trung ương Đảng CS Đông Dương, xuất bản công khai tại Sài Gòn thời kỳ vận động Dân chủ Đông Dương.', '13/05/2013', 'Trang 22'),
('AV264', 'Sưu tập Báo Việt Nam độc lập (1941-1945) của Bảo tàng Lịch sử Quốc gia', 'DM03', 'Sách, báo & tài liệu cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng D · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201351220h14m21s.jpg', 'Chủ tịch Hồ Chí Minh xuất bản làm cơ quan tuyên truyền cho Việt Minh tỉnh Cao Bằng.', '12/05/2013', 'Trang 22'),
('AV265', 'Địa bàn đội du kích Ba Tơ, tỉnh Quảng Ngãi thu được của Phát xít Nhật năm 1945', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 1 · Phòng A · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201331315h58m5s.gif', 'Đầu năm 1945, Hội nghị Tỉnh ủy Quảng Ngãi quyết định đẩy mạnh công tác chuẩn bị cách mạng lớn hơn.', '13/03/2013', 'Trang 23'),
('AV266', 'Súng trường do Cao Thắng chế tạo trong cuộc khởi nghĩa Hương Khê (1885-1896)', 'DM01', 'Vũ khí & khí tài quân sự', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 2 · Phòng A · Kệ 02', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201352821h17m34s.gif', 'Súng ký hiệu 327/Kl 140, một trong 350 khẩu nghĩa quân Cao Thắng chế tạo, trưng bày tại phòng số 1, 216 Trần Quang Khải, Hà Nội.', '04/03/2013', 'Trang 23'),
('AV267', 'Chiếc đài bán dẫn Sony dùng nghe tin miền Nam hoàn toàn giải phóng', 'DM06', 'Vật dụng sinh hoạt & phương tiện', 'Lịch sử Việt Nam', 'Hiện đại', 'Tầng 3 · Phòng B · Kệ 05', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201322216h24m52s.gif', 'Ký hiệu 6943/Kl 856, trưng bày tại phòng số 24 "Đại thắng mùa xuân 1975".', '22/02/2013', 'Trang 23'),
('AV268', 'Nữ anh hùng Ngô Thị Tuyển trong trận chiến cầu Hàm Rồng', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 1 · Phòng B · Kệ 03', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201481411h29m19s.gif', 'Hòm đựng đạn của nữ anh hùng Ngô Thị Tuyển (ký hiệu 1827/ĐM 152), kích thước 92x36x18,3cm, trưng bày tại phòng số 22, 25 Tông Đản, Hà Nội.', '14/02/2013', 'Trang 23'),
('AV269', 'Cuốn sổ ghi cảm tưởng của quân dân Âu - Phi mừng thọ Bác Hồ', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Lịch sử', 'Tầng 2 · Phòng C · Kệ 01', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_2012122816h35m46s.gif', 'Quân nhân Âu-Phi trong hàng ngũ Việt Nam kính tặng nhân kỷ niệm 60 năm ngày sinh Bác Hồ tại Việt Bắc, năm 1950.', '28/12/2012', 'Trang 23'),
('AV270', 'Tác phẩm "Sửa đổi lối làm việc" của Chủ tịch Hồ Chí Minh (kỷ niệm 65 năm ngày tác phẩm ra đời)', 'DM02', 'Kỷ vật lãnh tụ & anh hùng cách mạng', 'Lịch sử Việt Nam', 'Cận đại', 'Tầng 3 · Phòng C · Kệ 04', 'Đang trưng bày', 'https://baotanglichsu.vn/DataFiles/News/Tintuc_cgs_vn_201211814h34m28s.gif', 'Viết tháng 10/1947 tại ATK Định Hóa, Thái Nguyên, với bút danh X.Y.Z.', '08/11/2012', 'Trang 23')
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    category = EXCLUDED.category,
    culture = EXCLUDED.culture,
    period = EXCLUDED.period,
    location = EXCLUDED.location,
    status = EXCLUDED.status,
    image = EXCLUDED.image,
    description = EXCLUDED.description,
    date_display = EXCLUDED.date_display,
    page_source = EXCLUDED.page_source;

-- Seed Đánh giá
INSERT INTO danh_gia (id, author, user_id, artifact_id, artifact_name, rating, comment, date) VALUES
('REV001', 'Nguyễn Hoàng Nam', 'USR004', 'AV001', 'Những kỷ vật thiêng liêng về thương binh, liệt sĩ tại Bảo tàng Lịch sử quốc gia', 5, 'Kỷ vật lịch sử cực kỳ xúc động và hào hùng!', '2024-08-10'),
('REV002', 'Elena Rostova', 'USR004', 'AV002', 'Hai kỷ vật kể chuyện về Anh hùng, liệt sĩ Lê Thị Riêng', 5, 'Amazing historical heritage! The AI guide provided great English translations.', '2024-08-09'),
('REV003', 'Trần Minh Đức', 'USR004', 'AV019', 'Trống đồng Cảnh Thịnh - tiếng vọng ngàn năm', 5, 'Không gian trưng bày rất trang nghiêm, âm vang trống đồng hào hùng.', '2024-08-05')
ON CONFLICT (id) DO NOTHING;

COMMIT;


-- ==========================================
-- TỪ FILE: migration_phong_trung_bay_chuyen_de.sql
-- ==========================================

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


-- ==========================================
-- TỪ FILE: migration_ensure_user_sync.sql
-- ==========================================

-- ====================================================================
-- BẢO TÀNG QUỐC GIA VIỆT NAM - SUPABASE USER SYNC TRIGGER MIGRATION
-- File: supabase/migration_ensure_user_sync.sql
-- Mục đích: Đảm bảo Trigger tự động đồng bộ từ auth.users sang public.nguoi_dung
-- Bảo mật: Loại bỏ hoàn toàn khả năng tự nâng quyền qua client metadata (raw_user_meta_data)
-- Tính chất: Idempotent (chạy nhiều lần an toàn, không sinh lỗi duplicate)
-- ====================================================================

-- 1. Đảm bảo cột auth_user_id đã tồn tại trong bảng nguoi_dung
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nguoi_dung' AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE public.nguoi_dung ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_nguoi_dung_auth_user_id ON public.nguoi_dung(auth_user_id);
    END IF;
END $$;

-- 2. TẠO HOẶC CẬP NHẬT FUNCTION HANDLE_NEW_USER
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT := 'visitor';
    user_role_label TEXT := 'Khách tham quan';
    user_name TEXT;
BEGIN
    -- Gán vai trò an toàn: chỉ email admin@gmail.com được gán admin mặc định
    -- Tuyệt đối KHÔNG đọc role từ raw_user_meta_data để ngăn chặn leo thang quyền từ client
    IF NEW.email = 'admin@gmail.com' THEN
        user_role := 'admin';
        user_role_label := 'Quản trị viên';
    ELSE
        user_role := 'visitor';
        user_role_label := 'Khách tham quan';
    END IF;

    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

    -- Tự động thêm hoặc cập nhật hồ sơ trong bảng nguoi_dung
    INSERT INTO public.nguoi_dung (
        id,
        auth_user_id,
        email,
        name,
        role,
        role_label,
        status,
        avatar,
        joined_at
    )
    VALUES (
        'USR' || substring(NEW.id::text from 1 for 6),
        NEW.id,
        NEW.email,
        user_name,
        user_role,
        user_role_label,
        'Hoạt động',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        CURRENT_DATE
    )
    ON CONFLICT (email) DO UPDATE
    SET 
        auth_user_id = EXCLUDED.auth_user_id,
        role = CASE WHEN public.nguoi_dung.role = 'admin' THEN 'admin' ELSE EXCLUDED.role END,
        role_label = CASE WHEN public.nguoi_dung.role = 'admin' THEN 'Quản trị viên' ELSE EXCLUDED.role_label END;

    RETURN NEW;
END;
$$;

-- 3. GẮN TRIGGER VÀO AUTH.USERS
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. ĐỒNG BỘ CÁC USER HIỆN CÓ TỪ TRƯỚC SANG NGUOI_DUNG
INSERT INTO public.nguoi_dung (
    id,
    auth_user_id,
    email,
    name,
    role,
    role_label,
    status,
    avatar,
    joined_at
)
SELECT 
    'USR' || substring(u.id::text from 1 for 6),
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    CASE WHEN u.email = 'admin@gmail.com' THEN 'admin' ELSE 'visitor' END,
    CASE WHEN u.email = 'admin@gmail.com' THEN 'Quản trị viên' ELSE 'Khách tham quan' END,
    'Hoạt động',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    CURRENT_DATE
FROM auth.users u
ON CONFLICT (email) DO UPDATE
SET auth_user_id = EXCLUDED.auth_user_id;


-- ==========================================
-- TỪ FILE: migration_fix_roles_and_permissions.sql
-- ==========================================

-- ====================================================================
-- BẢO TÀNG QUỐC GIA VIỆT NAM - MIGRATION XỬ LÝ TRIỆT ĐỂ PHÂN QUYỀN
-- File: supabase/migration_fix_roles_and_permissions.sql
-- Mục đích:
--   1. Khắc phục lỗi đệ quy / chặn nhầm khi phân quyền (Role Assignment).
--   2. Cho phép Quản trị viên đổi quyền (admin / staff / visitor) từ cả Web UI và Supabase Table Editor.
--   3. Cung cấp hàm RPC assign_user_role() thực thi an toàn và đồng bộ App Metadata.
--   4. Bảo vệ chống leo thang quyền (người dùng thường không thể tự gán admin).
-- ====================================================================

-- --------------------------------------------------------------------
-- 1. TỐI ƯU HÀM KIỂM TRA QUYỀN (RBAC HELPER FUNCTIONS)
-- --------------------------------------------------------------------

-- Hàm kiểm tra Quản trị viên (is_admin)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    _jwt_email TEXT;
    _jwt_role TEXT;
    _db_role TEXT;
BEGIN
    -- 1. Nếu thực thi từ Supabase SQL Editor, Table Editor, hoặc Service Role
    IF current_user IN ('postgres', 'supabase_admin', 'service_role') 
       OR (auth.role() = 'service_role') THEN
        RETURN TRUE;
    END IF;

    -- 2. Kiểm tra trực tiếp qua JWT claims (nhanh và không đệ quy)
    _jwt_email := auth.jwt() ->> 'email';
    _jwt_role := COALESCE(
        auth.jwt() -> 'app_metadata' ->> 'role',
        auth.jwt() -> 'user_metadata' ->> 'role'
    );

    IF _jwt_email = 'admin@gmail.com' OR _jwt_role = 'admin' THEN
        RETURN TRUE;
    END IF;

    -- 3. Kiểm tra vai trò trong bảng public.nguoi_dung
    IF auth.uid() IS NOT NULL OR _jwt_email IS NOT NULL THEN
        SELECT role INTO _db_role
        FROM public.nguoi_dung
        WHERE (auth_user_id = auth.uid() OR (_jwt_email IS NOT NULL AND email = _jwt_email))
        LIMIT 1;

        IF _db_role = 'admin' THEN
            RETURN TRUE;
        END IF;
    END IF;

    RETURN FALSE;
END;
$$;

-- Hàm lấy vai trò hiện tại của User
CREATE OR REPLACE FUNCTION public.get_current_user_role()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
DECLARE
    _role TEXT;
BEGIN
    IF is_admin() THEN
        RETURN 'admin';
    END IF;

    -- Kiểm tra Staff từ JWT
    IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
       OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff' THEN
        RETURN 'staff';
    END IF;

    -- Kiểm tra DB
    SELECT role INTO _role
    FROM public.nguoi_dung
    WHERE (auth_user_id = auth.uid() OR (auth.jwt() ->> 'email' IS NOT NULL AND email = (auth.jwt() ->> 'email')))
    LIMIT 1;

    RETURN COALESCE(_role, 'visitor');
END;
$$;

-- Hàm kiểm tra Nhân viên hoặc Admin (is_staff_or_admin)
CREATE OR REPLACE FUNCTION public.is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
BEGIN
    IF is_admin() THEN
        RETURN TRUE;
    END IF;

    IF (auth.jwt() -> 'app_metadata' ->> 'role') = 'staff'
       OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'staff' THEN
        RETURN TRUE;
    END IF;

    IF EXISTS (
        SELECT 1 FROM public.nguoi_dung
        WHERE (auth_user_id = auth.uid() OR (auth.jwt() ->> 'email' IS NOT NULL AND email = (auth.jwt() ->> 'email')))
          AND role IN ('admin', 'staff')
    ) THEN
        RETURN TRUE;
    END IF;

    RETURN FALSE;
END;
$$;


-- --------------------------------------------------------------------
-- 2. ĐIỀU CHỈNH TRIGGER BẢO VỆ LEO THANG QUYỀN (PREVENT SELF ROLE CHANGE)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.prevent_self_role_change()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    -- Nếu người thực hiện là Admin hoặc thao tác trực tiếp từ Supabase Studio / Service Role:
    -- Cho phép cập nhật tất cả mọi trường.
    IF is_admin() THEN
        RETURN NEW;
    END IF;

    -- Nếu KHÔNG PHẢI Admin:
    -- Khóa việc tự thay đổi role, role_label, status, auth_user_id, email
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        NEW.role := OLD.role;
    END IF;

    IF NEW.role_label IS DISTINCT FROM OLD.role_label THEN
        NEW.role_label := OLD.role_label;
    END IF;

    IF NEW.status IS DISTINCT FROM OLD.status THEN
        NEW.status := OLD.status;
    END IF;

    IF NEW.auth_user_id IS DISTINCT FROM OLD.auth_user_id THEN
        NEW.auth_user_id := OLD.auth_user_id;
    END IF;

    IF NEW.email IS DISTINCT FROM OLD.email THEN
        NEW.email := OLD.email;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_self_role_change ON public.nguoi_dung;
CREATE TRIGGER trg_prevent_self_role_change
    BEFORE UPDATE ON public.nguoi_dung
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_self_role_change();


-- --------------------------------------------------------------------
-- 3. CẬP NHẬT CHÍNH SÁCH ROW LEVEL SECURITY (RLS) CHO BẢNG NGUOI_DUNG
-- --------------------------------------------------------------------
ALTER TABLE public.nguoi_dung ENABLE ROW LEVEL SECURITY;

-- 3.1 SELECT: Cho phép hiển thị danh sách người dùng
DROP POLICY IF EXISTS "allow_select_nguoi_dung" ON public.nguoi_dung;
CREATE POLICY "allow_select_nguoi_dung" ON public.nguoi_dung FOR SELECT
    USING (true);

-- 3.2 INSERT: Cho phép đăng ký mới & tạo người dùng từ Admin
DROP POLICY IF EXISTS "allow_insert_nguoi_dung" ON public.nguoi_dung;
CREATE POLICY "allow_insert_nguoi_dung" ON public.nguoi_dung FOR INSERT
    WITH CHECK (
        is_admin()
        OR auth_user_id = auth.uid()
        OR email = (auth.jwt() ->> 'email')
        OR auth.role() = 'authenticated'
    );

-- 3.3 UPDATE: Admin được sửa mọi dòng, User thường chỉ sửa thông tin cá nhân của mình
DROP POLICY IF EXISTS "allow_update_nguoi_dung" ON public.nguoi_dung;
CREATE POLICY "allow_update_nguoi_dung" ON public.nguoi_dung FOR UPDATE
    USING (
        is_admin()
        OR auth_user_id = auth.uid()
        OR email = (auth.jwt() ->> 'email')
    )
    WITH CHECK (
        is_admin()
        OR auth_user_id = auth.uid()
        OR email = (auth.jwt() ->> 'email')
    );

-- 3.4 DELETE: Chỉ Admin mới có quyền xóa người dùng
DROP POLICY IF EXISTS "allow_admin_delete_nguoi_dung" ON public.nguoi_dung;
DROP POLICY IF EXISTS "allow_delete_nguoi_dung" ON public.nguoi_dung;
CREATE POLICY "allow_delete_nguoi_dung" ON public.nguoi_dung FOR DELETE
    USING (is_admin());


-- --------------------------------------------------------------------
-- 4. HÀM RPC ĐỔI QUYỀN (ASSIGN USER ROLE) CHUYÊN DỤNG
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.assign_user_role(
    target_user_id TEXT,
    new_role TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_label TEXT;
    v_auth_id UUID;
    v_result JSON;
BEGIN
    -- Kiểm tra quyền Admin
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Từ chối truy cập: Chỉ Quản trị viên (Admin) mới có quyền đổi vai trò người dùng.';
    END IF;

    -- Chuẩn hóa role
    new_role := lower(trim(new_role));
    IF new_role NOT IN ('admin', 'staff', 'visitor') THEN
        RAISE EXCEPTION 'Vai trò "%" không hợp lệ. Chỉ chấp nhận: admin, staff, visitor.', new_role;
    END IF;

    IF new_role = 'admin' THEN
        v_label := 'Quản trị viên';
    ELSIF new_role = 'staff' THEN
        v_label := 'Nhân viên';
    ELSE
        v_label := 'Khách tham quan';
    END IF;

    -- Cập nhật bảng public.nguoi_dung
    UPDATE public.nguoi_dung
    SET 
        role = new_role,
        role_label = v_label
    WHERE id = target_user_id OR email = target_user_id
    RETURNING auth_user_id INTO v_auth_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy người dùng với mã / email: %', target_user_id;
    END IF;

    -- Đồng bộ vai trò sang auth.users.raw_app_meta_data (nếu có tài khoản auth tương ứng)
    IF v_auth_id IS NOT NULL THEN
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', new_role)
        WHERE id = v_auth_id;
    END IF;

    SELECT row_to_json(u) INTO v_result
    FROM public.nguoi_dung u
    WHERE id = target_user_id OR email = target_user_id
    LIMIT 1;

    RETURN v_result;
END;
$$;


-- --------------------------------------------------------------------
-- 5. HÀM RPC KHÓA / MỞ KHÓA TÀI KHOẢN (TOGGLE USER STATUS)
-- --------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.toggle_user_status(
    target_user_id TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_curr_status TEXT;
    v_new_status TEXT;
    v_result JSON;
BEGIN
    IF NOT is_admin() THEN
        RAISE EXCEPTION 'Từ chối truy cập: Chỉ Quản trị viên mới có quyền đổi trạng thái tài khoản.';
    END IF;

    SELECT status INTO v_curr_status
    FROM public.nguoi_dung
    WHERE id = target_user_id OR email = target_user_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Không tìm thấy người dùng: %', target_user_id;
    END IF;

    IF v_curr_status = 'Hoạt động' THEN
        v_new_status := 'Tạm khóa';
    ELSE
        v_new_status := 'Hoạt động';
    END IF;

    UPDATE public.nguoi_dung
    SET status = v_new_status
    WHERE id = target_user_id OR email = target_user_id;

    SELECT row_to_json(u) INTO v_result
    FROM public.nguoi_dung u
    WHERE id = target_user_id OR email = target_user_id
    LIMIT 1;

    RETURN v_result;
END;
$$;


-- --------------------------------------------------------------------
-- 6. ĐẢM BẢO TÀI KHOẢN QUẢN TRỊ VIÊN MẶC ĐỊNH LUÔN CÓ QUYỀN ADMIN
-- --------------------------------------------------------------------
UPDATE public.nguoi_dung
SET 
    role = 'admin',
    role_label = 'Quản trị viên',
    status = 'Hoạt động'
WHERE email = 'admin@gmail.com';

-- Cập nhật metadata trong auth.users cho admin@gmail.com nếu tồn tại
UPDATE auth.users
SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', 'admin')
WHERE email = 'admin@gmail.com';


-- ==========================================
-- TỪ FILE: migration_fix_role_escalation.sql
-- ==========================================

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


-- ==========================================
-- TỪ FILE: migration_security_hardening.sql
-- ==========================================

-- ====================================================================
-- BẢO TÀNG QUỐC GIA VIỆT NAM - SECURITY HARDENING MIGRATION SCRIPT
-- File: supabase/migration_security_hardening.sql
-- Mục đích:
--   1. Thêm liên kết auth.users (auth_user_id) vào bảng nguoi_dung
--   2. Tạo bảng audit_logs lưu vết tập trung (Postgres) với tính bất biến
--   3. Tạo các hàm SQL Helper phân quyền vai trò (Role-Based Access Control)
--   4. Viết lại toàn bộ Row Level Security (RLS) theo vai trò thật
-- ====================================================================

-- 1. CẬP NHẬT BẢNG NGUOI_DUNG ĐỂ LIÊN KẾT SUPABASE AUTH (auth.users)
-- Thêm cột auth_user_id kiểu UUID trỏ tới auth.users(id)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'nguoi_dung' AND column_name = 'auth_user_id'
    ) THEN
        ALTER TABLE nguoi_dung ADD COLUMN auth_user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE;
        CREATE UNIQUE INDEX IF NOT EXISTS idx_nguoi_dung_auth_user_id ON nguoi_dung(auth_user_id);
    END IF;
END $$;

-- 1.1 TỰ ĐỘNG ĐỒNG BỘ MỌI TÀI KHOẢN TẠO TỪ AUTH.USERS SANG PUBLIC.NGUOI_DUNG
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    user_role TEXT := 'visitor';
    user_role_label TEXT := 'Khách tham quan';
    user_name TEXT;
BEGIN
    -- Xác định vai trò dựa trên email hoặc metadata
    IF NEW.email = 'admin@gmail.com' OR (NEW.raw_user_meta_data->>'role') = 'admin' THEN
        user_role := 'admin';
        user_role_label := 'Quản trị viên';
    ELSIF (NEW.raw_user_meta_data->>'role') = 'staff' THEN
        user_role := 'staff';
        user_role_label := 'Nhân viên';
    END IF;

    user_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

    -- Tự động thêm hoặc cập nhật hồ sơ trong bảng nguoi_dung
    INSERT INTO public.nguoi_dung (
        id,
        auth_user_id,
        email,
        name,
        role,
        role_label,
        status,
        avatar,
        joined_at
    )
    VALUES (
        'USR' || substring(NEW.id::text from 1 for 6),
        NEW.id,
        NEW.email,
        user_name,
        user_role,
        user_role_label,
        'Hoạt động',
        'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        CURRENT_DATE
    )
    ON CONFLICT (email) DO UPDATE
    SET 
        auth_user_id = EXCLUDED.auth_user_id,
        role = CASE WHEN public.nguoi_dung.role = 'admin' THEN 'admin' ELSE EXCLUDED.role END,
        role_label = CASE WHEN public.nguoi_dung.role = 'admin' THEN 'Quản trị viên' ELSE EXCLUDED.role_label END;

    RETURN NEW;
END;
$$;

-- Gắn Trigger lắng nghe sự kiện tạo user mới trong auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Đồng bộ ngay lập tức toàn bộ các user hiện đang có trong auth.users sang bảng nguoi_dung
INSERT INTO public.nguoi_dung (
    id,
    auth_user_id,
    email,
    name,
    role,
    role_label,
    status,
    avatar,
    joined_at
)
SELECT 
    'USR' || substring(u.id::text from 1 for 6),
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)),
    CASE WHEN u.email = 'admin@gmail.com' THEN 'admin' ELSE 'visitor' END,
    CASE WHEN u.email = 'admin@gmail.com' THEN 'Quản trị viên' ELSE 'Khách tham quan' END,
    'Hoạt động',
    'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    CURRENT_DATE
FROM auth.users u
ON CONFLICT (email) DO UPDATE
SET auth_user_id = EXCLUDED.auth_user_id;

-- 2. TẠO BẢNG AUDIT_LOGS LƯU NHẬT KÝ BẤT BIẾN TRÊN POSTGRESQL
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(100) REFERENCES nguoi_dung(id) ON DELETE SET NULL,
    auth_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    user_email TEXT,
    user_name TEXT,
    action VARCHAR(100) NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index tối ưu truy vấn logs theo thời gian và người dùng
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_auth_user ON audit_logs(auth_user_id);

-- 3. CÁC HÀM HELPER XÁC THỰC VAI TRÒ (RBAC FUNCTIONS)
-- Hàm lấy role thật của user đang thực hiện request (admin / staff / visitor)
CREATE OR REPLACE FUNCTION get_current_user_role()
RETURNS TEXT
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT COALESCE(
        (
            SELECT role 
            FROM nguoi_dung 
            WHERE auth_user_id = auth.uid() 
               OR email = (auth.jwt() ->> 'email')
            LIMIT 1
        ),
        'visitor'
    );
$$;

-- Hàm kiểm tra xem user hiện tại có phải là Quản trị viên (Admin) hay không
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT get_current_user_role() = 'admin';
$$;

-- Hàm kiểm tra xem user hiện tại có phải là Nhân viên soát vé / Quản trị viên hay không
CREATE OR REPLACE FUNCTION is_staff_or_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT get_current_user_role() IN ('admin', 'staff');
$$;

-- 4. VIẾT LẠI ROW LEVEL SECURITY (RLS) THEO PHÂN QUYỀN CHẶT CHẼ
-- Bật RLS trên toàn bộ các bảng
ALTER TABLE danh_muc ENABLE ROW LEVEL SECURITY;
ALTER TABLE phong_trung_bay ENABLE ROW LEVEL SECURITY;
ALTER TABLE hien_vat ENABLE ROW LEVEL SECURITY;
ALTER TABLE trien_lam ENABLE ROW LEVEL SECURITY;
ALTER TABLE su_kien ENABLE ROW LEVEL SECURITY;
ALTER TABLE ve_tham_quan ENABLE ROW LEVEL SECURITY;
ALTER TABLE bai_viet ENABLE ROW LEVEL SECURITY;
ALTER TABLE nguoi_dung ENABLE ROW LEVEL SECURITY;
ALTER TABLE dat_ve ENABLE ROW LEVEL SECURITY;
ALTER TABLE dang_ky_su_kien ENABLE ROW LEVEL SECURITY;
ALTER TABLE danh_gia ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- 4.1 Xóa sạch các policy cũ mở toang (FOR ALL USING true)
DROP POLICY IF EXISTS "Public read danh_muc" ON danh_muc;
DROP POLICY IF EXISTS "Public read phong_trung_bay" ON phong_trung_bay;
DROP POLICY IF EXISTS "Public read hien_vat" ON hien_vat;
DROP POLICY IF EXISTS "Public read trien_lam" ON trien_lam;
DROP POLICY IF EXISTS "Public read su_kien" ON su_kien;
DROP POLICY IF EXISTS "Public read ve_tham_quan" ON ve_tham_quan;
DROP POLICY IF EXISTS "Public read bai_viet" ON bai_viet;
DROP POLICY IF EXISTS "Public read danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "Public read nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "Public read dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "Public read dang_ky_su_kien" ON dang_ky_su_kien;

DROP POLICY IF EXISTS "Public insert/update hien_vat" ON hien_vat;
DROP POLICY IF EXISTS "Public insert/update danh_muc" ON danh_muc;
DROP POLICY IF EXISTS "Public insert/update trien_lam" ON trien_lam;
DROP POLICY IF EXISTS "Public insert/update su_kien" ON su_kien;
DROP POLICY IF EXISTS "Public insert/update ve_tham_quan" ON ve_tham_quan;
DROP POLICY IF EXISTS "Public insert/update nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "Public insert/update danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "Public insert/update dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "Public insert/update dang_ky_su_kien" ON dang_ky_su_kien;
DROP POLICY IF EXISTS "Public insert/update bai_viet" ON bai_viet;

-- Xóa các policy của đợt hardening trước (nếu chạy lại)
DROP POLICY IF EXISTS "allow_public_select_danh_muc" ON danh_muc;
DROP POLICY IF EXISTS "allow_admin_modify_danh_muc" ON danh_muc;

DROP POLICY IF EXISTS "allow_public_select_phong_trung_bay" ON phong_trung_bay;
DROP POLICY IF EXISTS "allow_admin_modify_phong_trung_bay" ON phong_trung_bay;

DROP POLICY IF EXISTS "allow_public_select_hien_vat" ON hien_vat;
DROP POLICY IF EXISTS "allow_admin_modify_hien_vat" ON hien_vat;

DROP POLICY IF EXISTS "allow_public_select_trien_lam" ON trien_lam;
DROP POLICY IF EXISTS "allow_admin_modify_trien_lam" ON trien_lam;

DROP POLICY IF EXISTS "allow_public_select_su_kien" ON su_kien;
DROP POLICY IF EXISTS "allow_admin_modify_su_kien" ON su_kien;

DROP POLICY IF EXISTS "allow_public_select_ve_tham_quan" ON ve_tham_quan;
DROP POLICY IF EXISTS "allow_admin_modify_ve_tham_quan" ON ve_tham_quan;

DROP POLICY IF EXISTS "allow_public_select_bai_viet" ON bai_viet;
DROP POLICY IF EXISTS "allow_admin_modify_bai_viet" ON bai_viet;

DROP POLICY IF EXISTS "allow_select_nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "allow_insert_nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "allow_update_nguoi_dung" ON nguoi_dung;
DROP POLICY IF EXISTS "allow_admin_delete_nguoi_dung" ON nguoi_dung;

DROP POLICY IF EXISTS "allow_select_dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "allow_insert_dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "allow_update_dat_ve" ON dat_ve;
DROP POLICY IF EXISTS "allow_delete_dat_ve" ON dat_ve;

DROP POLICY IF EXISTS "allow_select_dang_ky_su_kien" ON dang_ky_su_kien;
DROP POLICY IF EXISTS "allow_insert_dang_ky_su_kien" ON dang_ky_su_kien;
DROP POLICY IF EXISTS "allow_admin_modify_dang_ky_su_kien" ON dang_ky_su_kien;

DROP POLICY IF EXISTS "allow_public_select_danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "allow_insert_danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "allow_author_or_admin_modify_danh_gia" ON danh_gia;
DROP POLICY IF EXISTS "allow_author_or_admin_delete_danh_gia" ON danh_gia;

DROP POLICY IF EXISTS "allow_admin_select_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "allow_authenticated_insert_audit_logs" ON audit_logs;
DROP POLICY IF EXISTS "allow_insert_audit_logs" ON audit_logs;

-- ====================================================================
-- 4.2 THIẾT LẬP CÁC POLICY CHẶT CHẼ THEO ĐÚNG TỪNG NHÓM BẢNG
-- ====================================================================

-- [NHÓM 1: CÁC BẢNG NỘI DUNG CÔNG KHAI] (danh_muc, phong_trung_bay, hien_vat, trien_lam, su_kien, ve_tham_quan, bai_viet)
-- Nguyên tắc: Mọi người (kể cả khách chưa đăng nhập) được SELECT. Chỉ Admin mới được INSERT / UPDATE / DELETE.

-- Danh mục
DROP POLICY IF EXISTS "allow_public_select_danh_muc" ON danh_muc;
CREATE POLICY "allow_public_select_danh_muc" ON danh_muc FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_danh_muc" ON danh_muc;
CREATE POLICY "allow_admin_modify_danh_muc" ON danh_muc FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Phòng trưng bày
DROP POLICY IF EXISTS "allow_public_select_phong_trung_bay" ON phong_trung_bay;
CREATE POLICY "allow_public_select_phong_trung_bay" ON phong_trung_bay FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_phong_trung_bay" ON phong_trung_bay;
CREATE POLICY "allow_admin_modify_phong_trung_bay" ON phong_trung_bay FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Hiện vật (Cực kỳ quan trọng: Ngăn chặn tuyệt đối việc Visitor thêm/sửa/xóa cổ vật)
DROP POLICY IF EXISTS "allow_public_select_hien_vat" ON hien_vat;
CREATE POLICY "allow_public_select_hien_vat" ON hien_vat FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_hien_vat" ON hien_vat;
CREATE POLICY "allow_admin_modify_hien_vat" ON hien_vat FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Triển lãm
DROP POLICY IF EXISTS "allow_public_select_trien_lam" ON trien_lam;
CREATE POLICY "allow_public_select_trien_lam" ON trien_lam FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_trien_lam" ON trien_lam;
CREATE POLICY "allow_admin_modify_trien_lam" ON trien_lam FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Sự kiện
DROP POLICY IF EXISTS "allow_public_select_su_kien" ON su_kien;
CREATE POLICY "allow_public_select_su_kien" ON su_kien FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_su_kien" ON su_kien;
CREATE POLICY "allow_admin_modify_su_kien" ON su_kien FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Loại vé tham quan
DROP POLICY IF EXISTS "allow_public_select_ve_tham_quan" ON ve_tham_quan;
CREATE POLICY "allow_public_select_ve_tham_quan" ON ve_tham_quan FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_ve_tham_quan" ON ve_tham_quan;
CREATE POLICY "allow_admin_modify_ve_tham_quan" ON ve_tham_quan FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());

-- Bài viết tin tức
DROP POLICY IF EXISTS "allow_public_select_bai_viet" ON bai_viet;
CREATE POLICY "allow_public_select_bai_viet" ON bai_viet FOR SELECT USING (true);
DROP POLICY IF EXISTS "allow_admin_modify_bai_viet" ON bai_viet;
CREATE POLICY "allow_admin_modify_bai_viet" ON bai_viet FOR ALL 
    USING (is_admin()) WITH CHECK (is_admin());


-- [NHÓM 2: BẢNG NGƯỜI DÙNG (nguoi_dung)]
-- Nguyên tắc: 
-- - User chỉ xem/sửa hồ sơ của chính mình (auth_user_id = auth.uid() hoặc email trùng JWT).
-- - Admin được xem và chỉnh sửa tất cả.
-- - Chỉ Admin mới có quyền xóa tài khoản.
-- - Cho phép INSERT khi đăng ký tài khoản mới.
DROP POLICY IF EXISTS "allow_select_nguoi_dung" ON nguoi_dung;
CREATE POLICY "allow_select_nguoi_dung" ON nguoi_dung FOR SELECT
    USING (
        auth_user_id = auth.uid() 
        OR email = (auth.jwt() ->> 'email')
        OR is_admin()
    );

DROP POLICY IF EXISTS "allow_insert_nguoi_dung" ON nguoi_dung;
CREATE POLICY "allow_insert_nguoi_dung" ON nguoi_dung FOR INSERT
    WITH CHECK (
        auth_user_id = auth.uid()
        OR email = (auth.jwt() ->> 'email')
        OR is_admin()
        
    );

DROP POLICY IF EXISTS "allow_update_nguoi_dung" ON nguoi_dung;
CREATE POLICY "allow_update_nguoi_dung" ON nguoi_dung FOR UPDATE
    USING (
        auth_user_id = auth.uid() 
        OR email = (auth.jwt() ->> 'email')
        OR is_admin()
    )
    WITH CHECK (
        auth_user_id = auth.uid() 
        OR email = (auth.jwt() ->> 'email')
        OR is_admin()
    );

DROP POLICY IF EXISTS "allow_admin_delete_nguoi_dung" ON nguoi_dung;
CREATE POLICY "allow_admin_delete_nguoi_dung" ON nguoi_dung FOR DELETE
    USING (is_admin());


-- [NHÓM 3: BẢNG ĐẶT VÉ (dat_ve)]
-- Nguyên tắc:
-- - User xem vé của chính mình (theo email hoặc user_id).
-- - Staff và Admin xem được toàn bộ danh sách vé để quét QR và soát vé.
-- - Bất kỳ ai (Khách vãng lai lẫn User đã đăng nhập) đều được tạo đơn đặt vé mới.
-- - Staff và Admin được cập nhật trạng thái (checkin, xác nhận thu tiền).
DROP POLICY IF EXISTS "allow_select_dat_ve" ON dat_ve;
CREATE POLICY "allow_select_dat_ve" ON dat_ve FOR SELECT
    USING (
        email = (auth.jwt() ->> 'email')
        OR user_id IN (SELECT id FROM nguoi_dung WHERE auth_user_id = auth.uid())
        OR is_staff_or_admin()
    );

DROP POLICY IF EXISTS "allow_insert_dat_ve" ON dat_ve;
CREATE POLICY "allow_insert_dat_ve" ON dat_ve FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "allow_update_dat_ve" ON dat_ve;
CREATE POLICY "allow_update_dat_ve" ON dat_ve FOR UPDATE
    USING (is_staff_or_admin())
    WITH CHECK (is_staff_or_admin());

DROP POLICY IF EXISTS "allow_delete_dat_ve" ON dat_ve;
CREATE POLICY "allow_delete_dat_ve" ON dat_ve FOR DELETE
    USING (is_admin());


-- [NHÓM 4: BẢNG ĐĂNG KÝ SỰ KIỆN (dang_ky_su_kien)]
DROP POLICY IF EXISTS "allow_select_dang_ky_su_kien" ON dang_ky_su_kien;
CREATE POLICY "allow_select_dang_ky_su_kien" ON dang_ky_su_kien FOR SELECT
    USING (
        email = (auth.jwt() ->> 'email')
        OR user_id IN (SELECT id FROM nguoi_dung WHERE auth_user_id = auth.uid())
        OR is_staff_or_admin()
    );

DROP POLICY IF EXISTS "allow_insert_dang_ky_su_kien" ON dang_ky_su_kien;
CREATE POLICY "allow_insert_dang_ky_su_kien" ON dang_ky_su_kien FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "allow_admin_modify_dang_ky_su_kien" ON dang_ky_su_kien;
CREATE POLICY "allow_admin_modify_dang_ky_su_kien" ON dang_ky_su_kien FOR ALL
    USING (is_admin()) WITH CHECK (is_admin());


-- [NHÓM 5: BẢNG ĐÁNH GIÁ (danh_gia)]
-- Nguyên tắc: Mọi người xem được bình luận công khai. Tạo bình luận tự do. Chỉ người viết hoặc Admin mới được sửa/xóa.
DROP POLICY IF EXISTS "allow_public_select_danh_gia" ON danh_gia;
CREATE POLICY "allow_public_select_danh_gia" ON danh_gia FOR SELECT
    USING (true);

DROP POLICY IF EXISTS "allow_insert_danh_gia" ON danh_gia;
CREATE POLICY "allow_insert_danh_gia" ON danh_gia FOR INSERT
    WITH CHECK (true);

DROP POLICY IF EXISTS "allow_author_or_admin_modify_danh_gia" ON danh_gia;
CREATE POLICY "allow_author_or_admin_modify_danh_gia" ON danh_gia FOR UPDATE
    USING (
        user_id IN (SELECT id FROM nguoi_dung WHERE auth_user_id = auth.uid())
        OR is_admin()
    )
    WITH CHECK (
        user_id IN (SELECT id FROM nguoi_dung WHERE auth_user_id = auth.uid())
        OR is_admin()
    );

DROP POLICY IF EXISTS "allow_author_or_admin_delete_danh_gia" ON danh_gia;
CREATE POLICY "allow_author_or_admin_delete_danh_gia" ON danh_gia FOR DELETE
    USING (
        user_id IN (SELECT id FROM nguoi_dung WHERE auth_user_id = auth.uid())
        OR is_admin()
    );


-- [NHÓM 6: BẢNG AUDIT LOGS (audit_logs) - BẤT BIẾN]
-- Nguyên tắc: 
-- - Chỉ Admin mới có quyền SELECT đọc log hệ thống.
-- - Cho phép ghi INSERT nhật ký hoạt động.
-- - TUYỆT ĐỐI CẤM UPDATE VÀ DELETE (Bảo đảm tính toàn vẹn và bất biến của nhật ký an ninh).
DROP POLICY IF EXISTS "allow_admin_select_audit_logs" ON audit_logs;
CREATE POLICY "allow_admin_select_audit_logs" ON audit_logs FOR SELECT
    USING (is_admin());

DROP POLICY IF EXISTS "allow_insert_audit_logs" ON audit_logs;
CREATE POLICY "allow_insert_audit_logs" ON audit_logs FOR INSERT
    WITH CHECK (true);



-- ==========================================
-- BỔ SUNG: VÁ LỖ HỔNG INSERT ROLE ADMIN (ENFORCE DEFAULT ROLE)
-- ==========================================
CREATE OR REPLACE FUNCTION public.enforce_default_role()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF NOT is_admin() THEN
    NEW.role := 'visitor';
    NEW.role_label := 'Khách tham quan';
    NEW.status := 'active';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_default_role ON public.nguoi_dung;
CREATE TRIGGER trg_enforce_default_role
  BEFORE INSERT ON public.nguoi_dung
  FOR EACH ROW EXECUTE FUNCTION public.enforce_default_role();
