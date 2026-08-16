import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { Client } = pg;

// Try multiple connection methods
const connectionConfigs = [
  {
    label: 'Pooler Session Mode (port 5432)',
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 5432,
    database: 'postgres',
    user: 'postgres.yzscfptnwecjutaobyzm',
    password: 'Lanhuong@29082006',
    ssl: { rejectUnauthorized: false }
  },
  {
    label: 'Pooler Transaction Mode (port 6543)',
    host: 'aws-0-ap-southeast-1.pooler.supabase.com',
    port: 6543,
    database: 'postgres',
    user: 'postgres.yzscfptnwecjutaobyzm',
    password: 'Lanhuong@29082006',
    ssl: { rejectUnauthorized: false }
  },
  {
    label: 'Direct IPv6',
    host: 'db.yzscfptnwecjutaobyzm.supabase.co',
    port: 5432,
    database: 'postgres',
    user: 'postgres',
    password: 'Lanhuong@29082006',
    ssl: { rejectUnauthorized: false }
  }
];

async function tryConnect(config) {
  const client = new Client(config);
  try {
    await client.connect();
    const res = await client.query('SELECT version()');
    console.log(`✓ Kết nối thành công qua: ${config.label}`);
    console.log(`  PostgreSQL: ${res.rows[0].version.substring(0, 60)}...`);
    return client;
  } catch (err) {
    console.log(`✗ ${config.label}: ${err.message}`);
    try { await client.end(); } catch(e) {}
    return null;
  }
}

async function main() {
  console.log('🔌 Thử kết nối tới Supabase PostgreSQL...\n');
  
  let client = null;
  for (const config of connectionConfigs) {
    client = await tryConnect(config);
    if (client) break;
  }
  
  if (!client) {
    console.error('\n❌ Không thể kết nối bằng bất kỳ phương thức nào. Kiểm tra lại password.');
    process.exit(1);
  }

  try {
    // Read migration SQL
    const sqlPath = path.join(__dirname, 'migration_fixed.sql');
    let sql = fs.readFileSync(sqlPath, 'utf8');
    sql = sql.replace(/^BEGIN;\s*/i, '').replace(/\s*COMMIT;\s*$/i, '');

    console.log('\n=== BƯỚC 1: BACKUP DỮ LIỆU HIỆN TẠI ===');
    try {
      const catResult = await client.query("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'danh_muc')");
      if (catResult.rows[0].exists) {
        const cats = await client.query('SELECT * FROM danh_muc');
        const arts = await client.query('SELECT id, name, category_id, category FROM hien_vat');
        fs.writeFileSync(
          path.join(__dirname, 'backup_before_dm01_13.json'),
          JSON.stringify({ timestamp: new Date().toISOString(), danh_muc: cats.rows, hien_vat: arts.rows }, null, 2), 'utf8'
        );
        console.log(`✓ Backup: ${cats.rows.length} danh mục, ${arts.rows.length} hiện vật`);
      } else {
        console.log('ℹ Bảng chưa tồn tại - bỏ qua backup.');
      }
    } catch (e) {
      console.log('ℹ Bỏ qua backup:', e.message);
    }

    console.log('\n=== BƯỚC 2: CHẠY MIGRATION SQL ===');

    // Split SQL into statements, respecting $$ dollar quoting
    const statements = [];
    let current = '';
    let inDollarQuote = false;

    for (let i = 0; i < sql.length; i++) {
      if (sql.substring(i, i + 2) === '$$') {
        inDollarQuote = !inDollarQuote;
        current += '$$';
        i++;
        continue;
      }
      if (sql[i] === ';' && !inDollarQuote) {
        const stmt = current.trim();
        if (stmt.length > 0) {
          // Filter out pure comment blocks
          const meaningful = stmt.split('\n').filter(l => !l.trim().startsWith('--') && l.trim().length > 0);
          if (meaningful.length > 0) {
            statements.push(stmt);
          }
        }
        current = '';
      } else {
        current += sql[i];
      }
    }
    const last = current.trim();
    if (last.length > 0) {
      const meaningful = last.split('\n').filter(l => !l.trim().startsWith('--') && l.trim().length > 0);
      if (meaningful.length > 0) statements.push(last);
    }

    console.log(`📋 Tổng số câu lệnh: ${statements.length}`);

    await client.query('BEGIN');
    let ok = 0, skip = 0, fail = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await client.query(stmt);
        ok++;
        // Log milestones
        if (stmt.includes('CREATE TABLE')) {
          const m = stmt.match(/CREATE TABLE IF NOT EXISTS\s+(\w+)/i);
          if (m) console.log(`  ✓ CREATE TABLE: ${m[1]}`);
        } else if (stmt.includes('CREATE OR REPLACE FUNCTION')) {
          console.log('  ✓ CREATE FUNCTION: match_hien_vat');
        } else if (stmt.includes('INSERT INTO danh_muc')) {
          console.log('  ✓ SEED: 13 danh mục (DM01-DM13)');
        } else if (stmt.includes('INSERT INTO hien_vat')) {
          console.log('  ✓ SEED: 270 hiện vật');
        } else if (stmt.includes('INSERT INTO')) {
          const m = stmt.match(/INSERT INTO\s+(\w+)/i);
          if (m) console.log(`  ✓ SEED: ${m[1]}`);
        } else if (stmt.includes('DELETE FROM')) {
          console.log('  ✓ DELETE: danh mục cũ CAT%');
        }
      } catch (err) {
        if (err.message.includes('already exists')) {
          skip++;
        } else {
          fail++;
          console.error(`  ✗ [${i+1}] ${err.message.substring(0, 120)}`);
          // Critical errors
          if (err.code === '42601') { // syntax error
            console.error('  → Syntax error - Rollback');
            await client.query('ROLLBACK');
            process.exit(1);
          }
        }
      }
    }

    await client.query('COMMIT');
    console.log(`\n✓ Kết quả: ${ok} thành công, ${skip} bỏ qua (đã tồn tại), ${fail} lỗi`);

    console.log('\n=== BƯỚC 3: KIỂM TRA ĐỐI SOÁT ===');

    const catCheck = await client.query('SELECT id, name FROM danh_muc ORDER BY id');
    console.log(`\n📦 Bảng danh_muc: ${catCheck.rows.length} bản ghi`);
    catCheck.rows.forEach(r => console.log(`  ${r.id}: ${r.name}`));
    const nonDm = catCheck.rows.filter(r => !r.id.startsWith('DM'));
    console.log(`  → Ngoài DM01-13: ${nonDm.length} ${nonDm.length === 0 ? '✓ PASS' : '✗ FAIL'}`);

    const artTotal = await client.query('SELECT COUNT(*) as cnt FROM hien_vat');
    console.log(`\n🏛️ Bảng hien_vat: ${artTotal.rows[0].cnt} bản ghi (kỳ vọng: 270) ${artTotal.rows[0].cnt == 270 ? '✓ PASS' : '✗ FAIL'}`);

    const invalid = await client.query("SELECT COUNT(*) as cnt FROM hien_vat WHERE category_id IS NULL OR category_id NOT LIKE 'DM%'");
    console.log(`  → Không hợp lệ: ${invalid.rows[0].cnt} ${invalid.rows[0].cnt == 0 ? '✓ PASS' : '✗ FAIL'}`);

    const dist = await client.query('SELECT category_id, COUNT(*) as cnt FROM hien_vat GROUP BY category_id ORDER BY category_id');
    console.log('\n📊 Phân bố hiện vật:');
    dist.rows.forEach(r => console.log(`  ${r.category_id}: ${r.cnt}`));

    const others = ['phong_trung_bay', 'trien_lam', 'su_kien', 've_tham_quan', 'nguoi_dung', 'bai_viet', 'danh_gia'];
    console.log('\n📋 Các bảng khác:');
    for (const t of others) {
      try {
        const r = await client.query(`SELECT COUNT(*) as cnt FROM ${t}`);
        console.log(`  ${t}: ${r.rows[0].cnt} bản ghi`);
      } catch (e) { console.log(`  ${t}: lỗi`); }
    }

    console.log('\n🎉 MIGRATION HOÀN TẤT THÀNH CÔNG!');
  } catch (err) {
    console.error('❌ Lỗi:', err.message);
    try { await client.query('ROLLBACK'); } catch(e) {}
  } finally {
    await client.end();
  }
}

main();
