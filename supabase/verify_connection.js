import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://yzscfptnwecjutaobyzm.supabase.co';
const supabaseKey = 'sb_publishable_K2RJ1sdrokVsKi8x30_H1g__eESi7UN';
const supabase = createClient(supabaseUrl, supabaseKey);

async function verify() {
  console.log('🔌 Kiểm tra kết nối App → Supabase...\n');

  // 1. danh_muc
  const { data: cats, error: catErr } = await supabase.from('danh_muc').select('*').order('id');
  if (catErr) { console.error('❌ danh_muc:', catErr.message); return; }
  console.log(`✅ danh_muc: ${cats.length} bản ghi (kỳ vọng 13)`);
  cats.forEach(c => console.log(`   ${c.id}: ${c.name} (${c.count} hiện vật)`));

  // 2. hien_vat
  const { data: arts, error: artErr, count: artCount } = await supabase.from('hien_vat').select('id, name, category_id, category', { count: 'exact' });
  if (artErr) { console.error('❌ hien_vat:', artErr.message); return; }
  console.log(`\n✅ hien_vat: ${arts.length} bản ghi (kỳ vọng 270)`);
  
  // Check category distribution
  const dist = {};
  let invalid = 0;
  arts.forEach(a => {
    dist[a.category_id] = (dist[a.category_id] || 0) + 1;
    if (!a.category_id || !a.category_id.startsWith('DM')) invalid++;
  });
  console.log('   Phân bố theo danh mục:');
  Object.entries(dist).sort().forEach(([k, v]) => console.log(`   ${k}: ${v}`));
  console.log(`   Không hợp lệ (NULL/không DM): ${invalid} ${invalid === 0 ? '✅' : '❌'}`);

  // 3. nguoi_dung
  const { data: users, error: userErr } = await supabase.from('nguoi_dung').select('*');
  if (userErr) { console.error('❌ nguoi_dung:', userErr.message); return; }
  console.log(`\n✅ nguoi_dung: ${users.length} bản ghi`);
  users.forEach(u => console.log(`   ${u.id}: ${u.name} (${u.role})`));

  // 4. Other tables
  const tables = ['phong_trung_bay', 'trien_lam', 'su_kien', 've_tham_quan', 'bai_viet', 'danh_gia'];
  console.log('\n📋 Các bảng khác:');
  for (const t of tables) {
    const { data, error } = await supabase.from(t).select('*');
    if (error) {
      console.log(`   ❌ ${t}: ${error.message}`);
    } else {
      console.log(`   ✅ ${t}: ${data.length} bản ghi`);
    }
  }

  // 5. Test a specific query (join danh_muc + hien_vat)
  console.log('\n🔍 Test truy vấn hiện vật theo danh mục DM08 (Cổ vật đồng):');
  const { data: bronzes } = await supabase.from('hien_vat').select('id, name').eq('category_id', 'DM08').limit(5);
  if (bronzes) bronzes.forEach(b => console.log(`   ${b.id}: ${b.name}`));

  console.log('\n🎉 KẾT NỐI APP → SUPABASE THÀNH CÔNG!');
}

verify().catch(console.error);
