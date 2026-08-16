import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const sqlPath = path.join(__dirname, 'migration_fixed.sql');
const sql = fs.readFileSync(sqlPath, 'utf8');

// Extract sections
// 1. DDL (lines 1 to ~249) - everything before "6. SEED DATA"
const seedMarker = '-- ====================================================================\n-- 6. SEED DATA';
const ddlEnd = sql.indexOf(seedMarker);
const ddlSection = sql.substring(0, ddlEnd).trim();

// 2. Extract each INSERT block
function extractInsert(tableName) {
  // Find the INSERT INTO tableName block
  const pattern = new RegExp(`-- Seed[^\\n]*\\n\\s*INSERT INTO ${tableName}[\\s\\S]*?(?:ON CONFLICT[^;]*;|;)`, 'i');
  // Also try with DELETE before
  const deletePattern = new RegExp(`-- Xóa[^\\n]*\\n\\s*DELETE FROM ${tableName}[^;]*;`, 'i');
  
  let result = '';
  const delMatch = sql.match(deletePattern);
  if (delMatch) result += delMatch[0] + '\n\n';
  
  const match = sql.match(pattern);
  if (match) result += match[0];
  return result.trim();
}

// Extract all INSERT blocks manually by finding them in the text
const sections = {};

// danh_muc: includes DELETE + INSERT
const dmDeleteStart = sql.indexOf('-- Xóa các danh mục cũ');
const dmInsertEnd = sql.indexOf('ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, count = EXCLUDED.count');
sections.danh_muc = sql.substring(dmDeleteStart, dmInsertEnd + 'ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, count = EXCLUDED.count, description = EXCLUDED.description;'.length);

// phong_trung_bay
const ptbStart = sql.indexOf('-- Seed Phòng trưng bày');
const ptbEnd = sql.indexOf("ON CONFLICT (id) DO NOTHING;", ptbStart);
sections.phong_trung_bay = sql.substring(ptbStart, ptbEnd + "ON CONFLICT (id) DO NOTHING;".length);

// trien_lam
const tlStart = sql.indexOf('-- Seed Triển lãm');
const tlEnd = sql.indexOf("ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, description = EXCLUDED.description;");
sections.trien_lam = sql.substring(tlStart, tlEnd + "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, status = EXCLUDED.status, description = EXCLUDED.description;".length);

// su_kien
const skStart = sql.indexOf('-- Seed Sự kiện');
const skEnd = sql.indexOf("ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, registered = EXCLUDED.registered;");
sections.su_kien = sql.substring(skStart, skEnd + "ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, registered = EXCLUDED.registered;".length);

// ve_tham_quan
const vtStart = sql.indexOf('-- Seed Vé tham quan');
const vtEnd = sql.indexOf("ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;");
sections.ve_tham_quan = sql.substring(vtStart, vtEnd + "ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, price = EXCLUDED.price;".length);

// nguoi_dung
const ndStart = sql.indexOf('-- Seed Người dùng');
const ndEnd = sql.indexOf("ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash;");
sections.nguoi_dung = sql.substring(ndStart, ndEnd + "ON CONFLICT (id) DO UPDATE SET role = EXCLUDED.role, password_hash = EXCLUDED.password_hash;".length);

// bai_viet
const bvStart = sql.indexOf('-- Seed Bài viết');
const bvEnd = sql.indexOf("ON CONFLICT (id) DO NOTHING;", bvStart);
sections.bai_viet = sql.substring(bvStart, bvEnd + "ON CONFLICT (id) DO NOTHING;".length);

// hien_vat (270 artifacts - the big block)
const hvStart = sql.indexOf("-- Seed 270 Hiện vật");
const hvEnd = sql.indexOf("    page_source = EXCLUDED.page_source;");
sections.hien_vat = sql.substring(hvStart, hvEnd + "    page_source = EXCLUDED.page_source;".length);

// danh_gia (references nguoi_dung + hien_vat)
const dgStart = sql.indexOf("-- Seed Đánh giá");
const dgEnd = sql.indexOf("ON CONFLICT (id) DO NOTHING;", dgStart);
sections.danh_gia = sql.substring(dgStart, dgEnd + "ON CONFLICT (id) DO NOTHING;".length);

// Verify extraction
console.log('Extracted sections:');
for (const [key, val] of Object.entries(sections)) {
  console.log(`  ${key}: ${val.length} chars, starts with: "${val.substring(0, 50)}..."`);
}

// Build the new file with correct FK order:
// 1. danh_muc (no FK)
// 2. phong_trung_bay (no FK)
// 3. trien_lam (no FK)
// 4. su_kien (no FK)
// 5. ve_tham_quan (no FK)
// 6. nguoi_dung (no FK)
// 7. bai_viet (no FK)
// 8. hien_vat (FK → danh_muc) ← MOVED UP
// 9. danh_gia (FK → nguoi_dung + hien_vat) ← LAST

const newSql = `${ddlSection}

-- ====================================================================
-- 6. SEED DATA (DỮ LIỆU KHỞI TẠO MẪU CHUẨN)
-- Thứ tự INSERT đảm bảo khóa ngoại: danh_muc → hien_vat → danh_gia
-- ====================================================================

${sections.danh_muc}

${sections.phong_trung_bay}

${sections.trien_lam}

${sections.su_kien}

${sections.ve_tham_quan}

${sections.nguoi_dung}

${sections.bai_viet}

${sections.hien_vat}

${sections.danh_gia}

COMMIT;
`;

fs.writeFileSync(sqlPath, newSql, 'utf8');

// Verify the order
const newContent = fs.readFileSync(sqlPath, 'utf8');
const insertOrder = [];
const insertRegex = /INSERT INTO (\w+)/g;
let m;
while ((m = insertRegex.exec(newContent)) !== null) {
  if (!insertOrder.includes(m[1])) insertOrder.push(m[1]);
}

console.log('\n✓ File migration_fixed.sql đã được sắp xếp lại!');
console.log(`  Tổng: ${newContent.length} bytes, ${newContent.split('\n').length} dòng`);
console.log('\n📋 Thứ tự INSERT mới (đúng FK dependencies):');
insertOrder.forEach((t, i) => console.log(`  ${i + 1}. ${t}`));

// Verify danh_gia comes AFTER hien_vat
const hvPos = newContent.indexOf('INSERT INTO hien_vat');
const dgPos = newContent.indexOf('INSERT INTO danh_gia');
console.log(`\n✓ hien_vat position: ${hvPos}`);
console.log(`✓ danh_gia position: ${dgPos}`);
console.log(`✓ danh_gia sau hien_vat: ${dgPos > hvPos ? 'ĐÚNG ✓' : 'SAI ✗'}`);
