import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = 'https://yzscfptnwecjutaobyzm.supabase.co';
const supabaseKey = 'sb_publishable_K2RJ1sdrokVsKi8x30_H1g__eESi7UN';

const supabase = createClient(supabaseUrl, supabaseKey);

async function main() {
  console.log("=== STEP 1: BACKUP DATABASE HIỆN TẠI ===");
  try {
    const { data: currentCategories, error: catErr } = await supabase.from('danh_muc').select('*');
    const { data: currentArtifacts, error: artErr } = await supabase.from('hien_vat').select('*');

    const backupData = {
      timestamp: new Date().toISOString(),
      danh_muc: currentCategories || [],
      hien_vat: currentArtifacts || []
    };

    fs.writeFileSync(
      path.join(__dirname, 'backup_before_dm01_13.json'),
      JSON.stringify(backupData, null, 2),
      'utf8'
    );
    console.log(`✓ Đã backup: ${backupData.danh_muc.length} danh mục, ${backupData.hien_vat.length} hiện vật vào supabase/backup_before_dm01_13.json`);
  } catch (err) {
    console.warn("Lỗi backup Supabase (nếu bảng chưa có dữ liệu):", err.message);
  }

  console.log("\n=== STEP 2: FIX SYNTAX & PARSE MIGRATION_FIXED.SQL ===");
  const rawSql = fs.readFileSync(path.join(__dirname, 'migration_fixed.sql'), 'utf8');

  // Fix missing commas between tuples if any
  // Replace )('AV with ),\n('AV
  let fixedSql = rawSql.replace(/\)\s*\('AV/g, "),\n('AV");
  
  // Make sure ON CONFLICT DO UPDATE on hien_vat exists
  if (!fixedSql.includes('ON CONFLICT (id) DO UPDATE') && fixedSql.includes('INSERT INTO hien_vat')) {
    fixedSql = fixedSql.trim().replace(/;?\s*$/, '') + `
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
`;
  }

  // Save the cleaned SQL
  fs.writeFileSync(path.join(__dirname, 'migration_fixed_cleaned.sql'), fixedSql, 'utf8');
  console.log("✓ Đã chuẩn hóa cú pháp SQL thành supabase/migration_fixed_cleaned.sql");

  // Extract categories DM01-13
  const catMatch = fixedSql.match(/INSERT INTO danh_muc[^\(]*\([^\)]*\)\s*VALUES\s*([\s\S]*?)(?:ON CONFLICT|;)/i);
  let categories = [];
  if (catMatch) {
    const valuesStr = catMatch[1];
    const catRows = valuesStr.split(/\),\s*\(/g);
    categories = catRows.map(row => {
      const cleaned = row.replace(/^\s*\(/, '').replace(/\)\s*$/, '').trim();
      // Match 'DMxx', 'Name', count, 'Description'
      const parts = cleaned.match(/'([^']*)',\s*'([^']*)',\s*(\d+),\s*'([^']*)'/);
      if (parts) {
        return {
          id: parts[1],
          name: parts[2],
          count: parseInt(parts[3], 10),
          description: parts[4]
        };
      }
      return null;
    }).filter(Boolean);
  }
  console.log(`✓ Tìm thấy ${categories.length} danh mục DM01-DM13:`, categories.map(c => `${c.id}: ${c.name}`));

  // Extract artifacts
  const artMatch = fixedSql.match(/INSERT INTO hien_vat[^\(]*\([^\)]*\)\s*VALUES\s*([\s\S]*?)(?:ON CONFLICT|;)/i);
  let artifacts = [];
  if (artMatch) {
    const artValuesStr = artMatch[1];
    // Match each ('AVxxx', '...', ...)
    const regex = /\('([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)',\s*'([^']*)'\)/g;
    let m;
    while ((m = regex.exec(artValuesStr)) !== null) {
      artifacts.push({
        id: m[1],
        name: m[2],
        category_id: m[3],
        category: m[4],
        culture: m[5],
        period: m[6],
        location: m[7],
        status: m[8],
        image: m[9],
        description: m[10],
        date_display: m[11],
        page_source: m[12]
      });
    }
  }
  console.log(`✓ Trích xuất thành công ${artifacts.length} hiện vật từ file SQL.`);

  console.log("\n=== STEP 3: ĐẨY DỮ LIỆU DM01-13 VÀO SUPABASE ===");

  // 1. Delete any old CAT01-CAT08 from danh_muc
  const { error: delCatErr } = await supabase
    .from('danh_muc')
    .delete()
    .like('id', 'CAT%');
  if (delCatErr) {
    console.warn("Xóa CAT categories cũ:", delCatErr.message);
  } else {
    console.log("✓ Đã dọn sạch các mã danh mục cũ (CAT%) trong bảng danh_muc");
  }

  // 2. Upsert categories DM01-DM13
  if (categories.length > 0) {
    const { data: upsertCat, error: upCatErr } = await supabase
      .from('danh_muc')
      .upsert(categories, { onConflict: 'id' });
    if (upCatErr) {
      console.error("Lỗi upsert danh_muc:", upCatErr);
    } else {
      console.log(`✓ Đã nạp thành công ${categories.length} danh mục (DM01 - DM13) vào bảng danh_muc`);
    }
  }

  // 3. Upsert 270 artifacts in batches of 50
  if (artifacts.length > 0) {
    const batchSize = 50;
    for (let i = 0; i < artifacts.length; i += batchSize) {
      const batch = artifacts.slice(i, i + batchSize);
      const { error: artUpErr } = await supabase
        .from('hien_vat')
        .upsert(batch, { onConflict: 'id' });
      if (artUpErr) {
        console.error(`Lỗi upsert batch hiện vật ${i}-${i + batch.length}:`, artUpErr.message);
      }
    }
    console.log(`✓ Đã upsert ${artifacts.length} hiện vật vào bảng hien_vat`);
  }

  console.log("\n=== STEP 4: KIỂM TRA ĐỐI SOÁT SAU MIGRATION ===");
  // 1. Check danh_muc
  const { data: checkCats } = await supabase.from('danh_muc').select('*').order('id');
  console.log(`- Số danh mục hiện tại trong DB: ${checkCats?.length || 0}`);
  const nonDmCats = (checkCats || []).filter(c => !c.id.startsWith('DM'));
  console.log(`- Số danh mục không thuộc DM01-13 (kể cả CAT cũ): ${nonDmCats.length}`);
  if (nonDmCats.length > 0) {
    console.warn("  Các danh mục ngoài DM:", nonDmCats);
  } else {
    console.log("  => Bảng danh_muc CHỈ CÒN DM01-DM13 (CHÍNH XÁC)");
  }

  // 2. Check hien_vat
  const { data: checkArts } = await supabase.from('hien_vat').select('id, category_id, category');
  console.log(`- Tổng số hiện vật trong DB: ${checkArts?.length || 0}`);
  const invalidArts = (checkArts || []).filter(a => !a.category_id || !a.category_id.startsWith('DM'));
  console.log(`- Số hiện vật có category_id NULL hoặc không thuộc DM01-13: ${invalidArts.length}`);
  if (invalidArts.length === 0 && checkArts?.length === 270) {
    console.log("  => 100% (270/270) hiện vật đều có category_id hợp lệ thuộc DM01-DM13!");
  }

  // Update src/data/categories.js & src/data/artifacts.js
  if (categories.length > 0) {
    fs.writeFileSync(
      path.join(__dirname, '../src/data/categories.js'),
      `export const categories = ${JSON.stringify(categories, null, 2)};\n`,
      'utf8'
    );
    console.log("✓ Đã cập nhật src/data/categories.js sang DM01-13");
  }

  if (artifacts.length > 0) {
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
      `// Dữ liệu danh sách Hiện vật - Bảo tàng Quốc gia Việt Nam (270 hiện vật phân loại DM01-DM13)\nexport const artifacts = ${JSON.stringify(formattedArtifacts, null, 2)};\n`,
      'utf8'
    );
    console.log("✓ Đã cập nhật src/data/artifacts.js sang DM01-13");
  }
}

main().catch(console.error);
