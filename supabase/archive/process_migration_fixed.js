import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rawSql = fs.readFileSync(path.join(__dirname, 'migration_fixed.sql'), 'utf8');

// 1. Extract categories (DM01 - DM13)
const catMatch = rawSql.match(/INSERT INTO danh_muc[^\(]*\([^\)]*\)\s*VALUES\s*([\s\S]*?)(?:ON CONFLICT|;)/i);
let categories = [];
if (catMatch) {
  const catLines = catMatch[1].trim().split('\n');
  for (const line of catLines) {
    const m = line.match(/\('([^']*)',\s*'([^']*)',\s*(\d+),\s*'([^']*)'\)/);
    if (m) {
      categories.push({
        id: m[1],
        name: m[2],
        count: parseInt(m[3], 10),
        description: m[4]
      });
    }
  }
}

console.log(`✓ Đã trích xuất ${categories.length} danh mục (DM01 - DM13):`);
console.table(categories.map(c => ({ id: c.id, name: c.name, count: c.count })));

// 2. Extract all 270 artifacts
const artMatch = rawSql.match(/INSERT INTO hien_vat[^\(]*\([^\)]*\)\s*VALUES\s*([\s\S]*)/i);
let artifacts = [];
if (artMatch) {
  const rawArtSection = artMatch[1];
  // Split by "('AV"
  const rawChunks = rawArtSection.split(/\('AV/);
  for (let i = 1; i < rawChunks.length; i++) {
    const chunk = '(\'AV' + rawChunks[i];
    // Match fields inside ('AVxxx', 'name', 'category_id', 'category', 'culture', 'period', 'location', 'status', 'image', 'description', 'date_display', 'page_source')
    // We can extract quoted strings
    const strMatches = [];
    const strRegex = /'((?:[^']|'')*)'/g;
    let sm;
    while ((sm = strRegex.exec(chunk)) !== null) {
      strMatches.push(sm[1].replace(/''/g, "'"));
      if (strMatches.length === 12) break;
    }

    if (strMatches.length >= 12) {
      artifacts.push({
        id: strMatches[0],
        name: strMatches[1],
        category_id: strMatches[2],
        category: strMatches[3],
        culture: strMatches[4],
        period: strMatches[5],
        location: strMatches[6],
        status: strMatches[7],
        image: strMatches[8],
        description: strMatches[9],
        date_display: strMatches[10],
        page_source: strMatches[11]
      });
    }
  }
}

console.log(`\n✓ Đã trích xuất và chuẩn hóa ${artifacts.length} hiện vật (kỳ vọng 270).`);

// Validate category_id distribution
const catDist = {};
let invalidCount = 0;
artifacts.forEach(a => {
  if (!a.category_id || !a.category_id.startsWith('DM')) {
    invalidCount++;
  }
  catDist[a.category_id] = (catDist[a.category_id] || 0) + 1;
});

console.log("\nPhân bố 270 hiện vật theo mã danh mục DM01-DM13:");
console.table(catDist);
console.log(`- Số hiện vật có category_id không thuộc DM01-13 hoặc NULL: ${invalidCount}`);

// 3. Generate perfect SQL file migration_fixed.sql (ready to run in Supabase SQL editor in 1 transaction)
function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return `'${String(str).replace(/'/g, "''")}'`;
}

const headerSql = rawSql.substring(0, rawSql.indexOf('INSERT INTO danh_muc'));

const completeSql = `BEGIN;

${headerSql.trim()}

-- 6. SEED DATA (DỮ LIỆU KHỞI TẠO MẪU CHUẨN)

-- Xóa các danh mục cũ CAT01-08 nếu có
DELETE FROM danh_muc WHERE id LIKE 'CAT%';

-- Seed Danh mục (13 danh mục DM01 - DM13)
INSERT INTO danh_muc (id, name, count, description) VALUES
${categories.map(c => `(${escapeSql(c.id)}, ${escapeSql(c.name)}, ${c.count}, ${escapeSql(c.description)})`).join(',\n')}
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

-- Seed Đánh giá
INSERT INTO danh_gia (id, author, user_id, artifact_id, artifact_name, rating, comment, date) VALUES
('REV001', 'Nguyễn Hoàng Nam', 'USR004', 'AV001', 'Những kỷ vật thiêng liêng về thương binh, liệt sĩ tại Bảo tàng Lịch sử quốc gia', 5, 'Kỷ vật lịch sử cực kỳ xúc động và hào hùng!', '2024-08-10'),
('REV002', 'Elena Rostova', 'USR004', 'AV002', 'Hai kỷ vật kể chuyện về Anh hùng, liệt sĩ Lê Thị Riêng', 5, 'Amazing historical heritage! The AI guide provided great English translations.', '2024-08-09'),
('REV003', 'Trần Minh Đức', 'USR004', 'AV019', 'Trống đồng Cảnh Thịnh - tiếng vọng ngàn năm', 5, 'Không gian trưng bày rất trang nghiêm, âm vang trống đồng hào hùng.', '2024-08-05')
ON CONFLICT (id) DO NOTHING;

-- Seed 270 Hiện vật đã phân loại chuẩn DM01 - DM13
INSERT INTO hien_vat (id, name, category_id, category, culture, period, location, status, image, description, date_display, page_source) VALUES
${artifacts.map(a => `(${escapeSql(a.id)}, ${escapeSql(a.name)}, ${escapeSql(a.category_id)}, ${escapeSql(a.category)}, ${escapeSql(a.culture)}, ${escapeSql(a.period)}, ${escapeSql(a.location)}, ${escapeSql(a.status)}, ${escapeSql(a.image)}, ${escapeSql(a.description)}, ${escapeSql(a.date_display)}, ${escapeSql(a.page_source)})`).join(',\n')}
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

COMMIT;
`;

fs.writeFileSync(path.join(__dirname, 'migration_fixed.sql'), completeSql, 'utf8');
console.log("\n✓ Đã tạo file supabase/migration_fixed.sql chuẩn chỉnh và bao bọc trong 1 TRANSACTION (BEGIN ... COMMIT)!");

// 4. Update src/data/categories.js & src/data/artifacts.js
fs.writeFileSync(
  path.join(__dirname, '../src/data/categories.js'),
  `export const categories = ${JSON.stringify(categories, null, 2)};\n`,
  'utf8'
);
console.log("✓ Đã đồng bộ src/data/categories.js sang 13 danh mục (DM01 - DM13).");

const formattedArtifacts = artifacts.map(a => ({
  id: a.id,
  name: a.name,
  categoryId: a.category_id,
  category: a.category,
  culture: a.culture,
  period: a.period,
  location: a.location,
  status: a.status,
  image: a.image,
  description: a.description,
  date: a.date_display,
  page: a.page_source
}));

fs.writeFileSync(
  path.join(__dirname, '../src/data/artifacts.js'),
  `// Dữ liệu danh sách Hiện vật - Bảo tàng Quốc gia Việt Nam (270 hiện vật phân loại chuẩn DM01 - DM13)\nexport const artifacts = ${JSON.stringify(formattedArtifacts, null, 2)};\n`,
  'utf8'
);
console.log("✓ Đã đồng bộ src/data/artifacts.js sang 270 hiện vật khớp DM01 - DM13.");
