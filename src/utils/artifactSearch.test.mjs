/**
 * Test hoi quy L1: local searchArtifacts KHONG sinh rac cho cau kien thuc chung,
 * van tim dung hien vat bao tang.
 * Chay:  node src/utils/artifactSearch.test.mjs   (tu repo root)
 */
import { searchArtifacts, hasMuseumSignal } from './artifactSearch.js';

const ARTIFACTS = [
  { id: 'A1', name: 'Dai Phat thanh Tieng noi Nam Bo', description: 'Dai phat thanh co tu thoi khang chien', period: 'Khang chien', location: 'Tang 3' },
  { id: 'A2', name: 'Trong dong Dong Son', description: 'Trong dong van hoa Dong Son', period: 'Dong Son', location: 'Tang 1' },
  { id: 'A3', name: 'Trong dong Ngoc Lu', description: 'Bao vat quoc gia', period: 'Dong Son', location: 'Tang 1' },
];

let pass = 0, fail = 0;
function check(name, cond) {
  if (cond) { pass++; console.log('PASS', name); }
  else { fail++; console.log('FAIL', name); }
}

// 1. Cau gay loi trong anh: phai KHONG ra ket qua
let r = searchArtifacts(ARTIFACTS, 'Ban biet cac hang dien thoai noi tieng ko');
check('dien-thoai: gated hoac rong', r.matchedArtifacts.length === 0);
check('dien-thoai: khong phai A1', !r.matchedArtifacts.some((a) => String(a.id) === 'A1'));

// 2. Cac cau kien thuc chung khac
for (const q of ['2+2 bang may?', 'Thu do cua Phap la gi?', 'Thoi tiet hom nay the nao?']) {
  const rr = searchArtifacts(ARTIFACTS, q);
  check(`kienthucchung [${q}]: rong`, rr.matchedArtifacts.length === 0);
}

// 3. Cau bao tang that: phai ra dung hien vat
r = searchArtifacts(ARTIFACTS, 'Trong dong Dong Son trung bay o dau?');
check('trong-dong: co ket qua', r.matchedArtifacts.length > 0);
check('trong-dong: dung A2', r.matchedArtifacts.some((a) => String(a.id) === 'A2'));
check('trong-dong: A1 khong chen ngang top1', String(r.matchedArtifacts[0].id) !== 'A1');

// 4. hasMuseumSignal gate
check('gate: dien thoai -> false', hasMuseumSignal('ban biet cac hang dien thoai noi tieng ko') === false);
check('gate: trong dong -> true', hasMuseumSignal('trong dong dong son trung bay o dau') === true);
check('gate: cau noi tiep -> true', hasMuseumSignal('no o dau') === true);

// 5. Cau noi tiep co prior: duoc phep chay scoring
r = searchArtifacts(ARTIFACTS, 'no o dau?', {}, { priorArtifacts: [ARTIFACTS[1]] });
check('noitiep: khong bi gated', r.gated !== true);

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
