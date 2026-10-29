import { searchArtifacts, removeVietnameseTones, levenshteinDistance, stripCommandFillers } from '../src/lib/searchArtifacts.js';
import { artifacts } from '../src/data/artifacts.js';
import { categories } from '../src/data/categories.js';

console.log('====================================================');
console.log('🧪 RUNNING UNIT TESTS FOR searchArtifacts.js');
console.log('====================================================\n');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

// 1. "tìm trống đồng"
{
  const res = searchArtifacts('tìm trống đồng', artifacts, categories);
  const foundNames = res.results.map(r => r.name).join('; ');
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.name.toLowerCase().includes('trống đồng')),
    `Test 1: "tìm trống đồng" ra Trống đồng (Tìm thấy: ${res.results.length} hiện vật, top 1: ${res.results[0]?.name})`
  );
}

// 2. "cho tôi xem đồ gốm thời Lý"
{
  const res = searchArtifacts('cho tôi xem đồ gốm thời Lý', artifacts, categories);
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.name.toLowerCase().includes('gốm')),
    `Test 2: "cho tôi xem đồ gốm thời Lý" ra đồ gốm (top: ${res.results[0]?.name})`
  );
}

// 3. "hiện vật về Bác Hồ"
{
  const res = searchArtifacts('hiện vật về Bác Hồ', artifacts, categories);
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.categoryId === 'DM02' || r.description.includes('Hồ Chí Minh') || r.description.includes('Nguyễn Ái Quốc')),
    `Test 3: "hiện vật về Bác Hồ" ra kỷ vật Bác Hồ (Tìm thấy: ${res.results.length}, top: ${res.results[0]?.name})`
  );
}

// 4. "điện biên phủ"
{
  const res = searchArtifacts('điện biên phủ', artifacts, categories);
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.name.includes('Điện Biên Phủ') || r.description.includes('Điện Biên Phủ')),
    `Test 4: "điện biên phủ" ra hiện vật chiến dịch Điện Biên Phủ (top: ${res.results[0]?.name})`
  );
}

// 5. "chống đồng" (nhận nhầm âm Web Speech)
{
  const res = searchArtifacts('chống đồng', artifacts, categories);
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.name.toLowerCase().includes('trống đồng')),
    `Test 5: "chống đồng" (nhận nhầm) vẫn ra Trống đồng nhờ Levenshtein (top: ${res.results[0]?.name})`
  );
}

// 6. "vũ khí"
{
  const res = searchArtifacts('vũ khí', artifacts, categories);
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.categoryId === 'DM01'),
    `Test 6: "vũ khí" ra nhóm DM01 (Tìm thấy: ${res.results.length}, top: ${res.results[0]?.name})`
  );
}

// 7. "rìu đá"
{
  const res = searchArtifacts('rìu đá', artifacts, categories);
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.categoryId === 'DM09' || r.name.toLowerCase().includes('rìu') || r.name.toLowerCase().includes('đá')),
    `Test 7: "rìu đá" ra cổ vật đá / rìu (top: ${res.results[0]?.name})`
  );
}

// 8. "súng"
{
  const res = searchArtifacts('súng', artifacts, categories);
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.name.toLowerCase().includes('súng')),
    `Test 8: "súng" ra súng trong vũ khí (top: ${res.results[0]?.name})`
  );
}

// 9. "thời tiền sử"
{
  const res = searchArtifacts('thời tiền sử', artifacts, categories);
  assert(
    res.results.length > 0,
    `Test 9: "thời tiền sử" nhận diện được niên đại (Tìm thấy: ${res.results.length}, top: ${res.results[0]?.name})`
  );
}

// 10. "bảo vật quốc gia"
{
  const res = searchArtifacts('bảo vật quốc gia', artifacts, categories);
  assert(
    res.results.length > 0,
    `Test 10: "bảo vật quốc gia" ra kết quả bảo vật (Tìm thấy: ${res.results.length}, top: ${res.results[0]?.name})`
  );
}

// 11. "tầng 1"
{
  const res = searchArtifacts('tầng 1', artifacts, categories);
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.location?.includes('Tầng 1')),
    `Test 11: "tầng 1" nhận diện vị trí trưng bày (Tìm thấy: ${res.results.length})`
  );
}

// 12. "kiếm"
{
  const res = searchArtifacts('kiếm', artifacts, categories);
  assert(
    res.results.length > 0,
    `Test 12: "kiếm" map tới vũ khí & cổ vật (Tìm thấy: ${res.results.length}, top: ${res.results[0]?.name})`
  );
}

// 13. "đồ sứ thời Nguyễn"
{
  const res = searchArtifacts('đồ sứ thời Nguyễn', artifacts, categories);
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.name.toLowerCase().includes('sứ') || r.description.toLowerCase().includes('nguyễn')),
    `Test 13: "đồ sứ thời Nguyễn" ra đồ sứ (top: ${res.results[0]?.name})`
  );
}

// 14. "câu vô nghĩa không có xyz12345"
{
  const res = searchArtifacts('câu vô nghĩa không có xyz12345', artifacts, categories);
  assert(
    res.results.length === 0 &&
    Array.isArray(res.suggestions) &&
    res.suggestions.length === 3,
    `Test 14: Câu vô nghĩa trả về 0 kết quả và đúng 3 gợi ý từ khóa (Gợi ý: ${res.suggestions.join(', ')})`
  );
}

// 15. "xem mở những cái hiện vật về nguyễn ái quốc"
{
  const res = searchArtifacts('xem mở những cái hiện vật về nguyễn ái quốc', artifacts, categories);
  assert(
    res.results.length > 0 &&
    res.results.some(r => r.name.includes('Nguyễn Ái Quốc') || r.description.includes('Nguyễn Ái Quốc')),
    `Test 15: Lọc bỏ toàn bộ từ đệm ("xem mở những cái hiện vật về") chỉ giữ "Nguyễn Ái Quốc" (top: ${res.results[0]?.name})`
  );
}

console.log('\n====================================================');
console.log(`TOTAL: ${passed + failed} tests | PASSED: ${passed} | FAILED: ${failed}`);
console.log('====================================================\n');

if (failed > 0) {
  process.exit(1);
}
