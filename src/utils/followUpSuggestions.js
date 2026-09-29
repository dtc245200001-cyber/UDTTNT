import { removeVietnameseTones } from './artifactSearch';

const DEFAULT_SUGGESTIONS = [
  'Gợi ý lộ trình tham quan bảo tàng',
  'Khám phá Trống đồng Ngọc Lũ',
  'Giá vé & thời gian mở cửa',
  'Sự kiện đang diễn ra'
];

function shortenArtifactName(name) {
  if (!name) return 'Hiện vật này';
  let shortName = name.split(/[,-]/)[0].trim();
  const words = shortName.split(/\s+/);
  if (words.length > 5) {
    shortName = words.slice(0, 5).join(' ');
  }
  return shortName;
}

export function getFollowUps({ userText, aiText, artifacts, history = [] }) {
  const cleanUserText = removeVietnameseTones(String(userText || '').toLowerCase());
  const historyText = history.map(h => h.text ? removeVietnameseTones(String(h.text).toLowerCase()) : '').join(' | ');

  let suggestions = [];

  // Có artifacts -> Gợi ý về artifacts
  if (artifacts && artifacts.length > 0) {
    const art = artifacts[0];
    const name = shortenArtifactName(art.name);
    const period = art.period || 'cùng thời kỳ';
    
    suggestions = [
      `${name} ở đâu trong bảo tàng?`,
      `Ý nghĩa và câu chuyện của hiện vật này`,
      `Xem hiện vật cùng thời kỳ (${period})`
    ];
  }
  // Vé / Giờ mở cửa
  else if (cleanUserText.includes('ve') || cleanUserText.includes('gia ve') || cleanUserText.includes('mo cua')) {
    suggestions = [
      'Đặt vé ngay',
      'Có sự kiện nào đang diễn ra không?',
      'Gợi ý lộ trình 1 ngày'
    ];
  }
  // Sự kiện / Triển lãm
  else if (cleanUserText.includes('su kien') || cleanUserText.includes('trien lam') || cleanUserText.includes('workshop')) {
    suggestions = [
      'Triển lãm nào đang diễn ra?',
      'Sự kiện tuần này',
      'Giá vé bao nhiêu?'
    ];
  }
  // Lộ trình
  else if (cleanUserText.includes('lo trinh') || cleanUserText.includes('tham quan') || cleanUserText.includes('goi y')) {
    suggestions = [
      'Lộ trình cho trẻ em',
      'Lộ trình 2 tiếng',
      'Hiện vật không thể bỏ qua'
    ];
  }
  // Mặc định
  else {
    suggestions = [...DEFAULT_SUGGESTIONS];
  }

  // Filter out suggestions that match exactly the user's prompt or history
  suggestions = suggestions.filter(s => {
    const cleanS = removeVietnameseTones(String(s).toLowerCase());
    if (cleanS === cleanUserText) return false;
    if (historyText.includes(cleanS)) return false; // simple anti-duplication
    return true;
  });

  // Nếu bị lọc hết, lấy mặc định
  if (suggestions.length === 0) {
    suggestions = [...DEFAULT_SUGGESTIONS];
  }

  return suggestions.slice(0, 3);
}
