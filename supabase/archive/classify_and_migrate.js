import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read artifacts.js as raw text to parse
const artifactsRaw = fs.readFileSync(path.join(__dirname, '../src/data/artifacts.js'), 'utf8');
const artifactsMatch = artifactsRaw.match(/export const artifacts = (\[[\s\S]*?\]);/);
if (!artifactsMatch) {
  console.error("Could not parse artifacts.js");
  process.exit(1);
}

const rawList = JSON.parse(artifactsMatch[1]);
console.log(`Loaded ${rawList.length} artifacts.`);

const categories = [
  { id: 'CAT01', name: 'Đồ đồng', slug: 'do-dong' },
  { id: 'CAT02', name: 'Đồ đá', slug: 'do-da' },
  { id: 'CAT03', name: 'Đồ gốm', slug: 'do-gom' },
  { id: 'CAT04', name: 'Đồ gỗ', slug: 'do-go' },
  { id: 'CAT05', name: 'Đồ vàng bạc', slug: 'do-vang-bac' },
  { id: 'CAT06', name: 'Đồ ngọc', slug: 'do-ngoc' },
  { id: 'CAT07', name: 'Trang phục cổ', slug: 'trang-phuc-co' },
  { id: 'CAT08', name: 'Tài liệu văn bản', slug: 'tai-lieu-van-ban' },
];

function classifyArtifact(item) {
  const text = `${item.name || ''} ${item.description || ''} ${item.culture || ''}`.toLowerCase();

  // 1. Đồ ngọc
  if (text.includes('ngọc') || text.includes('khánh ngọc') || text.includes('ngọc bội') || text.includes('ngọc quý') || text.includes('bích ngọc')) {
    return categories[5]; // CAT06 Đồ ngọc
  }

  // 2. Đồ vàng bạc
  if (text.includes('vàng') || text.includes('kim ấn') || text.includes('kim bảo') || text.includes('kim sách') || text.includes('bạc') || text.includes('mạ vàng') || text.includes('dát vàng') || text.includes('hoàng gia') || text.includes('trâm cài') || text.includes('nhẫn')) {
    return categories[4]; // CAT05 Đồ vàng bạc
  }

  // 3. Trang phục cổ
  if (text.includes('áo') || text.includes('quần') || text.includes('long bào') || text.includes('nhật bình') || text.includes('trang phục') || text.includes('mũ') || text.includes('mão') || text.includes('khăn') || text.includes('hài') || text.includes('dệt') || text.includes('vải') || text.includes('lụa') || text.includes('quân phục') || text.includes('cà sa') || text.includes('áo trấn thủ') || text.includes('kẹp tóc') || text.includes('thắt lưng')) {
    return categories[6]; // CAT07 Trang phục cổ
  }

  // 4. Đồ gốm (gốm, sứ, đất nung, bình, đĩa, bát, thạp gốm, ấm, chén, bình vôi, ngói, gạch cổ)
  if (text.includes('gốm') || text.includes('sứ') || text.includes('men lam') || text.includes('men ngọc') || text.includes('men rạn') || text.includes('men nâu') || text.includes('đất nung') || text.includes('bát') || text.includes('đĩa gốm') || text.includes('chén') || text.includes('bình gốm') || text.includes('bình vôi') || text.includes('chu đậu') || text.includes('bát tràng') || text.includes('lư hương gốm') || text.includes('thạp gốm') || text.includes('gạch cổ') || text.includes('ngói')) {
    return categories[2]; // CAT03 Đồ gốm
  }

  // 5. Đồ đá (đá, bia đá, tượng đá, rìu đá, sa thạch, đá vôi, cối đá, thạch anh)
  if (text.includes('đá') || text.includes('bia đá') || text.includes('tượng đá') || text.includes('rìu đá') || text.includes('sa thạch') || text.includes('bàn mài') || text.includes('chày đá') || text.includes('công cụ đá') || text.includes('khoáng thạch')) {
    return categories[1]; // CAT02 Đồ đá
  }

  // 6. Đồ gỗ (gỗ, khám thờ, ngai vàng gỗ, tượng gỗ, mộc, phù điêu gỗ, sập, tủ, rương gỗ)
  if (text.includes('gỗ') || text.includes('khám thờ') || text.includes('tượng gỗ') || text.includes('sơn son thếp vàng') || text.includes('mộc') || text.includes('khắc gỗ') || text.includes('thuyền độc mộc') || text.includes('ván in')) {
    return categories[3]; // CAT04 Đồ gỗ
  }

  // 7. Đồ đồng (đồng, trống đồng, chuông đồng, thạp đồng, kiếm đồng, giáo đồng, tượng đồng, đỉnh đồng, dao găm đồng, khóa đồng, nồi đồng, lư hương đồng, ca uống nước xác máy bay/kim loại)
  if (text.includes('đồng') || text.includes('trống đồng') || text.includes('chuông') || text.includes('thạp đồng') || text.includes('đỉnh đồng') || text.includes('lư đồng') || text.includes('vũ khí') || text.includes('dao găm') || text.includes('giáo') || text.includes('kiếm') || text.includes('xác máy bay') || text.includes('mảnh bom') || text.includes('vỏ đạn') || text.includes('huy hiệu') || text.includes('kim loại') || text.includes('sắt') || text.includes('thau') || text.includes('nồi đồng') || text.includes('chạc đồng')) {
    return categories[0]; // CAT01 Đồ đồng
  }

  // 8. Tài liệu văn bản (chiếu chỉ, sắc phong, sách, thư, bản đồ, nhật ký, báo, tài liệu, sổ tay, truyền đơn, ảnh tư liệu, bản thảo...)
  return categories[7]; // CAT08 Tài liệu văn bản
}

const classifiedArtifacts = rawList.map((item, index) => {
  const cat = classifyArtifact(item);
  return {
    ...item,
    categoryId: cat.id,
    category: cat.name,
  };
});

// Calculate counts
const categoryCounts = {};
categories.forEach(c => categoryCounts[c.name] = 0);
classifiedArtifacts.forEach(a => {
  categoryCounts[a.category] = (categoryCounts[a.category] || 0) + 1;
});

console.log("Phân loại 270 hiện vật thành công:");
console.table(categoryCounts);

// Write updated artifacts.js
const newArtifactsJsContent = `// Dữ liệu danh sách Hiện vật - Bảo tàng Quốc gia Việt Nam (${classifiedArtifacts.length} hiện vật đã phân loại)
export const artifacts = ${JSON.stringify(classifiedArtifacts, null, 2)};
`;
fs.writeFileSync(path.join(__dirname, '../src/data/artifacts.js'), newArtifactsJsContent, 'utf8');
console.log("Updated src/data/artifacts.js");

// Write updated categories.js
const updatedCategories = [
  { id: 'CAT01', name: 'Đồ đồng', count: categoryCounts['Đồ đồng'] || 0, description: 'Các hiện vật đúc đồng cổ xưa như trống đồng, vũ khí, chuông, đỉnh, đồ ngự dụng kim khí' },
  { id: 'CAT02', name: 'Đồ đá', count: categoryCounts['Đồ đá'] || 0, description: 'Bia đá, tượng đá, công cụ lao động và bảo vật bằng đá sa thạch qua các thời kỳ' },
  { id: 'CAT03', name: 'Đồ gốm', count: categoryCounts['Đồ gốm'] || 0, description: 'Bình, đĩa, tượng gốm men lam, gốm hoa nâu, gốm Chu Đậu, Bát Tràng qua các triều đại' },
  { id: 'CAT04', name: 'Đồ gỗ', count: categoryCounts['Đồ gỗ'] || 0, description: 'Khám thờ, ngai vàng, tượng gỗ sơn son thếp vàng và chạm khắc mỹ nghệ cổ truyền' },
  { id: 'CAT05', name: 'Đồ vàng bạc', count: categoryCounts['Đồ vàng bạc'] || 0, description: 'Kim ấn, kim bảo, kim sách, đồ trang sức và bảo vật cung đình hoàng gia' },
  { id: 'CAT06', name: 'Đồ ngọc', count: categoryCounts['Đồ ngọc'] || 0, description: 'Khánh ngọc, ngọc bội, vật phẩm cung tiến và vật báu tạc từ ngọc quý' },
  { id: 'CAT07', name: 'Trang phục cổ', count: categoryCounts['Trang phục cổ'] || 0, description: 'Long bào, áo nhật bình, trang phục triều đình, quân phục và kỷ vật lịch sử' },
  { id: 'CAT08', name: 'Tài liệu văn bản', count: categoryCounts['Tài liệu văn bản'] || 0, description: 'Mộc bản, sắc phong, chiếu chỉ, nhật ký chiến trường và tài liệu văn bản lịch sử' },
];

const newCategoriesJsContent = `export const categories = ${JSON.stringify(updatedCategories, null, 2)};\n`;
fs.writeFileSync(path.join(__dirname, '../src/data/categories.js'), newCategoriesJsContent, 'utf8');
console.log("Updated src/data/categories.js");

// Now generate supabase/migration.sql
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

let sql = `-- ====================================================================
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
CREATE POLICY "Public insert/update hien_vat" ON hien_vat FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update danh_muc" ON danh_muc FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update trien_lam" ON trien_lam FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update su_kien" ON su_kien FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update ve_tham_quan" ON ve_tham_quan FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update nguoi_dung" ON nguoi_dung FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update danh_gia" ON danh_gia FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update dat_ve" ON dat_ve FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update dang_ky_su_kien" ON dang_ky_su_kien FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Public insert/update bai_viet" ON bai_viet FOR ALL USING (true) WITH CHECK (true);

-- ====================================================================
-- 6. SEED DATA (DỮ LIỆU KHỞI TẠO MẪU CHUẨN)
-- ====================================================================

-- Seed Danh mục (8 danh mục với số lượng count thực tế)
INSERT INTO danh_muc (id, name, count, description) VALUES
${updatedCategories.map(c => `(${escapeSql(c.id)}, ${escapeSql(c.name)}, ${c.count}, ${escapeSql(c.description)})`).join(',\n')}
ON CONFLICT (id) DO UPDATE SET count = EXCLUDED.count, description = EXCLUDED.description;

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

-- Seed Đánh giá
INSERT INTO danh_gia (id, author, user_id, artifact_id, artifact_name, rating, comment, date) VALUES
('REV001', 'Nguyễn Hoàng Nam', 'USR004', 'AV001', 'Trống đồng Đông Sơn', 5, 'Trống đồng đúc cực kỳ sắc nét, góc thuyết minh thuyết phục!', '2024-08-10'),
('REV002', 'Elena Rostova', 'USR004', 'AV002', 'Bia Tiến sĩ Văn Miếu', 5, 'Amazing historical heritage! The AI guide provided great English translations.', '2024-08-09'),
('REV003', 'Trần Minh Đức', 'USR004', 'AV003', 'Tượng Phật A Di Đà', 4, 'Không gian trưng bày Phật giáo rất thanh tĩnh, ánh sáng tôn lên vẻ đẹp di sản.', '2024-08-05')
ON CONFLICT (id) DO NOTHING;

-- Seed 270 Hiện vật đã phân loại chuẩn
INSERT INTO hien_vat (id, name, category_id, category, culture, period, location, status, image, description, date_display, page_source) VALUES
${classifiedArtifacts.map(a => `(${escapeSql(a.id)}, ${escapeSql(a.name)}, ${escapeSql(a.categoryId)}, ${escapeSql(a.category)}, ${escapeSql(a.culture || 'Lịch sử Việt Nam')}, ${escapeSql(a.period || 'Hiện đại')}, ${escapeSql(a.location || 'Tầng 1')}, ${escapeSql(a.status || 'Đang trưng bày')}, ${escapeSql(a.image)}, ${escapeSql(a.description)}, ${escapeSql(a.date)}, ${escapeSql(a.page)})`).join(',\n')}
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    category_id = EXCLUDED.category_id,
    category = EXCLUDED.category,
    description = EXCLUDED.description,
    image = EXCLUDED.image;
`;

fs.mkdirSync(path.join(__dirname, '../supabase'), { recursive: true });
fs.writeFileSync(path.join(__dirname, '../supabase/migration.sql'), sql, 'utf8');
console.log("Successfully generated supabase/migration.sql!");
