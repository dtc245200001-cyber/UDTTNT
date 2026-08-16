/**
 * Advanced RAG Utility helper for searching museum data (Artifacts, Events, Exhibitions, Tickets)
 * with Vietnamese accent-insensitive matching, validation, and structured AI response generation.
 * 100% PUBLIC - No authentication or login required.
 */

export function removeVietnameseTones(str) {
  if (!str) return '';
  str = str.toLowerCase();
  str = str.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g, 'a');
  str = str.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g, 'e');
  str = str.replace(/ì|í|ị|ỉ|ĩ/g, 'i');
  str = str.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g, 'o');
  str = str.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g, 'u');
  str = str.replace(/ỳ|ý|ỵ|ỷ|ỹ/g, 'y');
  str = str.replace(/đ/g, 'd');
  str = str.replace(/\u0300|\u0301|\u0303|\u0309|\u0323/g, '');
  return str.trim();
}

/**
 * Validate user prompt text
 */
export function validateInput(query) {
  if (!query || typeof query !== 'string') {
    return { valid: false, message: 'Vui lòng nhập nội dung câu hỏi!' };
  }
  const clean = query.trim();
  if (clean.length === 0) {
    return { valid: false, message: 'Câu hỏi không được để trống.' };
  }
  if (clean.length < 2) {
    return { valid: false, message: 'Câu hỏi quá ngắn. Vui lòng nhập từ 2 ký tự trở lên.' };
  }
  return { valid: true, clean };
}

/**
 * Search artifacts, events, tickets in dataset based on user query string.
 * @param {Array} artifactsList - List of artifact objects
 * @param {string} query - User search prompt/question
 * @param {Object} extraData - Optional extra data (events, tickets, exhibitions)
 * @returns {Object} Search result containing matched artifacts & generated answer
 */
export function searchArtifacts(artifactsList = [], query = '', extraData = {}) {
  const validation = validateInput(query);
  if (!validation.valid) {
    return {
      success: false,
      message: validation.message,
      matchedArtifacts: [],
    };
  }

  const cleanQuery = removeVietnameseTones(validation.clean);
  const eventsList = extraData.events || [];
  const ticketsList = extraData.tickets || [];

  // Check 1: Intent regarding Ticket Price or Opening Hours
  if (
    cleanQuery.includes('gia ve') ||
    cleanQuery.includes('mua ve') ||
    cleanQuery.includes('ve tham quan') ||
    cleanQuery.includes('bao nhieu tien') ||
    cleanQuery.includes('gio mo cua') ||
    cleanQuery.includes('thoi gian mo cua')
  ) {
    return {
      success: true,
      message: `🎟️ Thông tin vé tham quan & Giờ mở cửa Bảo tàng:\n• Giờ mở cửa: 08:00 - 17:00 hàng ngày (Tất cả các ngày trong tuần).\n• Vé Người lớn: 50.000đ/vé.\n• Vé Học sinh - Sinh viên: 20.000đ/vé.\n• Trẻ em dưới 6 tuổi & Người cao tuổi: Miễn phí.\n• Vé Khách quốc tế: 100.000đ/vé.\nBạn có thể nhấn nút "Đặt vé tham quan" để mua vé trực tuyến ngay!`,
      matchedArtifacts: [],
    };
  }

  // Check 2: Intent regarding Events / Exhibitions
  if (
    cleanQuery.includes('su kien') ||
    cleanQuery.includes('toa dam') ||
    cleanQuery.includes('trien lam') ||
    cleanQuery.includes('lich trinh')
  ) {
    const matchedEvents = eventsList.filter((e) => {
      const titleClean = removeVietnameseTones(e.title || '');
      const descClean = removeVietnameseTones(e.description || '');
      return titleClean.includes(cleanQuery) || descClean.includes(cleanQuery);
    });

    if (matchedEvents.length > 0) {
      const topEv = matchedEvents[0];
      return {
        success: true,
        message: `📅 Sự kiện nổi bật: "${topEv.title}".\n• Thời gian: ${topEv.date} (${topEv.time}).\n• Địa điểm: ${topEv.location}.\n• Diễn giả: ${topEv.speaker}.\n• Mô tả: ${topEv.description}`,
        matchedArtifacts: [],
      };
    }
  }

  // Check 3: Query Artifacts Database
  const stopWords = ['co', 'nhung', 'hien', 'vat', 'nao', 'cho', 'toi', 'biet', 've', 'la', 'gi', 'y', 'nghia', 'nhu', 'the', 'nao', 'tim', 'lay', 'xem'];
  const queryTokens = cleanQuery
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.includes(word));

  const scoredResults = artifactsList.map((item) => {
    let score = 0;
    const nameClean = removeVietnameseTones(item.name || '');
    const descClean = removeVietnameseTones(item.description || '');
    const periodClean = removeVietnameseTones(item.period || item.culture || '');

    if (nameClean.includes(cleanQuery)) score += 100;

    queryTokens.forEach((token) => {
      if (nameClean.includes(token)) score += 30;
      if (descClean.includes(token)) score += 10;
      if (periodClean.includes(token)) score += 20;
    });

    if (cleanQuery.includes('tay son') && (nameClean.includes('tay son') || descClean.includes('tay son') || periodClean.includes('tay son'))) {
      score += 50;
    }
    if (cleanQuery.includes('dien bien phu') && (nameClean.includes('dien bien phu') || descClean.includes('dien bien phu'))) {
      score += 50;
    }
    if (cleanQuery.includes('canh thinh') && (nameClean.includes('canh thinh') || descClean.includes('canh thinh'))) {
      score += 50;
    }
    if (cleanQuery.includes('dong son') && (nameClean.includes('dong son') || descClean.includes('dong son'))) {
      score += 50;
    }

    return { artifact: item, score };
  });

  const matches = scoredResults
    .filter((res) => res.score >= 15)
    .sort((a, b) => b.score - a.score)
    .map((res) => res.artifact);

  // If NO data found -> Requirement 12 explicit notice
  if (matches.length === 0) {
    return {
      success: false,
      message: '❌ Xin lỗi, hệ thống AI chưa tìm thấy thông tin hoặc hiện vật phù hợp với câu hỏi của bạn trong CSDL bảo tàng. Vui lòng thử lại với tên hiện vật hoặc chủ đề khác (ví dụ: Trống đồng Cảnh Thịnh, Bảo vật thời Tây Sơn, Vé tham quan...).',
      matchedArtifacts: [],
    };
  }

  const primary = matches[0];
  let answerText = '';

  const isAskingLocation =
    cleanQuery.includes('o dau') ||
    cleanQuery.includes('trung bay o dau') ||
    cleanQuery.includes('vi tri') ||
    cleanQuery.includes('phong trung bay') ||
    cleanQuery.includes('cho nao');

  const locStr = primary.location || 'Tầng 1 · Phòng A · Kệ 01';

  if (isAskingLocation) {
    answerText = `📍 Hiện vật "${primary.name}" đang được trưng bày tại: ${locStr}. (Thời kỳ: ${primary.culture || primary.period}).`;
  } else if (matches.length === 1 || primary.name.toLowerCase().includes(validation.clean.toLowerCase())) {
    answerText = `🏛️ "${primary.name}" là bảo vật quốc gia tiêu biểu. ${primary.date ? `(Niên đại: ${primary.date}). ` : ''}${primary.description} 📍 Vị trí trưng bày: ${locStr}.`;
  } else {
    answerText = `💡 AI đã tra cứu CSDL và tìm thấy ${matches.length} hiện vật liên quan. Tiêu biểu nhất là "${primary.name}"${primary.date ? ` (Niên đại: ${primary.date})` : ''} — trưng bày tại: ${locStr}.`;
  }

  return {
    success: true,
    message: answerText,
    matchedArtifacts: matches.slice(0, 3),
  };
}
