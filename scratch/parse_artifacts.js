import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const mdPath = path.resolve(__dirname, '../hien_vat_bao_tang.md');
const outputPath = path.resolve(__dirname, '../src/data/artifacts.js');

const mdContent = fs.readFileSync(mdPath, 'utf-8');
const lines = mdContent.split('\n');

const artifacts = [];
let currentItem = null;
let currentTrang = 'Trang 1';

for (let i = 0; i < lines.length; i++) {
  const line = lines[i].trim();

  const trangMatch = line.match(/^##\s+(Trang\s+\d+)/i);
  if (trangMatch) {
    currentTrang = trangMatch[1];
    continue;
  }

  const itemMatch = line.match(/^\d+\.\s+\*\*(.*?)\*\*\s*\((.*?)\)/);
  if (itemMatch) {
    if (currentItem) {
      artifacts.push(currentItem);
    }
    currentItem = {
      id: `AV${String(artifacts.length + 1).padStart(3, '0')}`,
      name: itemMatch[1].trim(),
      date: itemMatch[2].trim(),
      image: '',
      description: '',
      page: currentTrang,
      category: 'Tư liệu lịch sử',
      culture: 'Lịch sử Việt Nam',
      period: 'Lịch sử',
      status: 'Đang trưng bày',
    };
    continue;
  }

  const imgMatch = line.match(/!\[img\]\((.*?)\)/);
  if (imgMatch && currentItem) {
    currentItem.image = imgMatch[1].trim();
    continue;
  }

  const noteMatch = line.match(/^Ghi chú:\s*(.*)/i);
  if (noteMatch && currentItem) {
    let desc = noteMatch[1].trim();
    if (desc === '(không có ghi chú chi tiết)') {
      desc = 'Hiện vật thuộc sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam.';
    }
    currentItem.description = desc;
    continue;
  }
}

if (currentItem) {
  artifacts.push(currentItem);
}

function determinePeriod(item) {
  const text = (item.name + ' ' + item.description).toLowerCase();
  
  if (text.includes('cách ngày nay') || text.includes('tcn') || text.includes('đông sơn') || text.includes('phùng nguyên') || text.includes('đồng đậu') || text.includes('gò mun') || text.includes('sa huỳnh') || text.includes('đồng nai') || text.includes('hòa bình') || text.includes('bắc sơn') || text.includes('đa bút') || text.includes('quỳnh văn') || text.includes('núi đọ') || text.includes('vượn') || text.includes('thế kỷ 1-3') || text.includes('thế kỷ 2') || text.includes('thế kỷ 3') || text.includes('óc eo')) {
    return 'Cổ đại';
  }
  if (text.includes('thời lý') || text.includes('thời trần') || text.includes('thời lê') || text.includes('thời mạc') || text.includes('thời tây sơn') || text.includes('thế kỷ 10') || text.includes('thế kỷ 11') || text.includes('thế kỷ 12') || text.includes('thế kỷ 13') || text.includes('thế kỷ 14') || text.includes('thế kỷ 15') || text.includes('thế kỷ 16') || text.includes('thế kỷ 17') || text.includes('thế kỷ 18') || text.includes('hoa lư') || text.includes('bạch đằng') || text.includes('champa') || text.includes('lý thường kiệt') || text.includes('nguyễn huệ') || text.includes('quang trung') || text.includes('trần hưng đạo') || text.includes('lê lợi')) {
    return 'Trung đại';
  }
  if (text.includes('thời nguyễn') || text.includes('triều nguyễn') || text.includes('kháng chiến chống pháp') || text.includes('1945') || text.includes('1946') || text.includes('1954') || text.includes('điện biên phủ') || text.includes('đường kách mệnh') || text.includes('hồ chí minh') || text.includes('nguyễn ái quốc') || text.includes('bình dân học vụ') || text.includes('tuyên ngôn') || text.includes('thế kỷ 19') || text.includes('thế kỷ xx') || text.includes('đầu thế kỷ 20') || text.includes('bao cấp') || text.includes('thực dân pháp') || text.includes('cao thắng')) {
    return 'Cận đại';
  }
  if (text.includes('chống mỹ') || text.includes('1975') || text.includes('giải phóng') || text.includes('mậu thân') || text.includes('côn đảo') || text.includes('nhà máy thủy điện') || text.includes('quốc hội') || text.includes('thương binh') || text.includes('liệt sĩ')) {
    return 'Hiện đại';
  }
  return 'Lịch sử';
}

const floors = ['Tầng 1', 'Tầng 2', 'Tầng 3'];
const rooms = ['Phòng A', 'Phòng B', 'Phòng C', 'Phòng D'];
const shelves = ['Kệ 01', 'Kệ 02', 'Kệ 03', 'Kệ 04', 'Kệ 05'];

artifacts.forEach((art, idx) => {
  art.period = determinePeriod(art);

  const floorIndex = idx % 3; // 0: Tầng 1, 1: Tầng 2, 2: Tầng 3
  const roomIndex = Math.floor(idx / 2) % 4; // Phòng A, B, C, D
  const shelfIndex = (idx * 3 + 1) % 5; // Kệ 01, 02, 03, 04, 05

  const floorStr = floors[floorIndex];
  const roomStr = rooms[roomIndex];
  const shelfStr = shelves[shelfIndex];

  art.displayLocation = {
    floor: floorStr,
    room: roomStr,
    shelf: shelfStr,
  };
  art.location = `${floorStr} · ${roomStr} · ${shelfStr}`;
});

console.log(`Parsed ${artifacts.length} artifacts with varied display locations.`);

const fileContent = `// Dữ liệu danh sách Hiện vật - Tư liệu Bảo tàng Lịch sử Quốc gia (Tổng cộng ${artifacts.length} hiện vật)
export const artifacts = ${JSON.stringify(artifacts, null, 2)};
`;

fs.writeFileSync(outputPath, fileContent, 'utf-8');
console.log(`Saved artifacts data to ${outputPath}`);
