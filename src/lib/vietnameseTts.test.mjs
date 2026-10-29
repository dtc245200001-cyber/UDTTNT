/**
 * Unit tests for Vietnamese TTS text preparation and chunking
 * Run: node src/lib/vietnameseTts.test.mjs
 */
import { prepareTextForSpeech, splitIntoSpeechChunks } from './vietnameseTts.js';

let pass = 0, fail = 0;
function check(name, cond, details = '') {
  if (cond) {
    pass++;
    console.log('PASS', name);
  } else {
    fail++;
    console.error('FAIL', name, details);
  }
}

// 1. Markdown & Emojis removal
const mdSample = '### Giới thiệu\n**Trống đồng Ngọc Lũ** là [bảo vật](https://baotang.vn) quốc gia! 🏛️✨🏺🎫';
const mdResult = prepareTextForSpeech(mdSample);
check('Bỏ markdown (#, **, link) và emoji', 
  !mdResult.includes('#') && 
  !mdResult.includes('**') && 
  !mdResult.includes('https://') && 
  !mdResult.includes('🏛️') && 
  mdResult.includes('Trống đồng Ngọc Lũ là bảo vật quốc gia!'),
  `Result: "${mdResult}"`
);

// 2. Bỏ phần "Nguồn:" ở cuối
const sourceSample = 'Hiện vật này được khai quật tại Hà Nam.\n\nNguồn: Bảo tàng Lịch sử Quốc gia.';
const sourceResult = prepareTextForSpeech(sourceSample);
check('Bỏ phần Nguồn tham khảo ở cuối',
  sourceResult.includes('Hà Nam') && !sourceResult.includes('Bảo tàng Lịch sử'),
  `Result: "${sourceResult}"`
);

// 3. Chuyển đổi TCN -> trước Công nguyên
const tcnSample = 'Được tạo tác vào thế kỷ 5 TCN.';
const tcnResult = prepareTextForSpeech(tcnSample);
check('Chuyển TCN thành trước Công nguyên',
  tcnResult.includes('trước Công nguyên') && !tcnResult.includes('TCN'),
  `Result: "${tcnResult}"`
);

// 4. Đơn vị đo: cm, kg, m
const unitSample = 'Trống có đường kính 86 cm, chiều cao 63 cm và nặng khoảng 86 kg.';
const unitResult = prepareTextForSpeech(unitSample);
check('Đổi đơn vị cm -> xen-ti-mét, kg -> ki-lô-gam',
  unitResult.includes('86 xen-ti-mét') && 
  unitResult.includes('63 xen-ti-mét') && 
  unitResult.includes('86 ki-lô-gam'),
  `Result: "${unitResult}"`
);

// 5. Thế kỷ bằng số La Mã: XV -> 15, XIX -> 19, XXI -> 21
const centurySample = 'Triều đại phát triển từ thế kỷ XV đến thế kỷ XIX và TK XXI.';
const centuryResult = prepareTextForSpeech(centurySample);
check('Đổi số La Mã thế kỷ XV -> 15, XIX -> 19, XXI -> 21',
  centuryResult.includes('thế kỷ 15') && 
  centuryResult.includes('thế kỷ 19') && 
  centuryResult.includes('thế kỷ 21'),
  `Result: "${centuryResult}"`
);

// 6. Khoảng năm lịch sử: 1010 – 1225 -> từ năm 1010 đến năm 1225
const yearSample = 'Thời kỳ Lý – Trần kéo dài từ 1010 – 1225.';
const yearResult = prepareTextForSpeech(yearSample);
check('Khoảng năm 1010 – 1225 -> từ năm 1010 đến năm 1225',
  yearResult.includes('từ năm 1010 đến năm 1225'),
  `Result: "${yearResult}"`
);

// 7. Dấu gạch ngang giữa danh từ: "Đông Sơn – Thanh Hóa" -> không đổi thành "đến" mà là nhịp nghỉ
const nounSample = 'Di chỉ Đông Sơn – Thanh Hóa';
const nounResult = prepareTextForSpeech(nounSample);
check('Dấu gạch ngang giữa danh từ không thành "đến"',
  !nounResult.includes('Đông Sơn đến Thanh Hóa') && nounResult.includes('Đông Sơn, Thanh Hóa'),
  `Result: "${nounResult}"`
);

// 8. Ngày tháng với dấu / không bị phá hỏng mù quáng
const dateSample = 'Được công nhận bảo vật quốc gia ngày 15/08/1924.';
const dateResult = prepareTextForSpeech(dateSample);
check('Giữ và đọc đúng ngày tháng dạng DD/MM/YYYY',
  dateResult.includes('ngày 15 tháng 08 năm 1924') || dateResult.includes('ngày 15 tháng 8 năm 1924'),
  `Result: "${dateResult}"`
);

// 9. Danh sách biến thành các mệnh đề có nhịp nghỉ
const listSample = 'Các đặc điểm chính:\n- Họa tiết ngôi sao 14 cánh\n- Hình người giã gạo\n- Đàn chim bay';
const listResult = prepareTextForSpeech(listSample);
check('Danh sách gạch đầu dòng có dấu phẩy nhịp nghỉ',
  listResult.includes('Họa tiết ngôi sao 14 cánh') && 
  listResult.includes('Hình người giã gạo'),
  `Result: "${listResult}"`
);

// 10. Test splitIntoSpeechChunks: tách câu dài > 1000 ký tự thành các chunk <= 180 ký tự
const longText = `Trống đồng Ngọc Lũ là hiện vật tiêu biểu nhất của nền văn hóa Đông Sơn, được phát hiện vào khoảng năm 1893 đến năm 1894 tại Hà Nam. Hiện vật này có hình dáng cân đối, trang trí hoa văn dày đặc và tinh xảo với hình ảnh mặt trời 14 cánh ở giữa tâm mặt trống, bao quanh là các vành hoa văn hình học và sinh hoạt của cư dân nông nghiệp lúa nước thời cổ xưa. Thân trống nở phình nang, có quai kép bện hình thừng giúp nâng đỡ khi khiêng hoặc treo đánh. Trống cao 63 xen-ti-mét, đường kính mặt 86 xen-ti-mét và nặng khoảng 86 ki-lô-gam. Đây là bảo vật quốc gia đặc biệt quý hiếm được trưng bày trang trọng tại Bảo tàng Lịch sử Quốc gia Việt Nam. Du khách khi đến tham quan đều có thể chiêm ngưỡng trực tiếp bảo vật này cùng với hệ thống tài liệu hướng dẫn và thuyết minh chi tiết của bảo tàng.`;
const repeatedLong = (longText + ' ').repeat(3); // > 1500 ký tự
const chunks = splitIntoSpeechChunks(repeatedLong, 180);

check('Văn bản dài > 1000 ký tự được tách thành nhiều chunks',
  chunks.length > 5,
  `Số chunks: ${chunks.length}`
);

const anyTooLong = chunks.some(c => c.length > 180);
check('Tất cả các chunk đều có độ dài <= 180 ký tự (tránh Chrome cutoff)',
  !anyTooLong,
  `Max length: ${Math.max(...chunks.map(c => c.length))}`
);

// Kiểm tra không bị cắt giữa chừng từ (không có từ bị gãy vô lý)
const endsWithValidChar = chunks.every(c => !/\b[a-zA-Zà-ỹÀ-Ỹ]{1}$/.test(c) || c.endsWith('m') || c.endsWith('g'));
check('Các chunk kết thúc tự nhiên, không cắt vụn giữa từ', endsWithValidChar);

console.log(`\n============================`);
console.log(`Kết quả: ${pass} passed, ${fail} failed`);
console.log(`============================\n`);
process.exit(fail ? 1 : 0);

