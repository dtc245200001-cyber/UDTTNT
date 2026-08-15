/**
 * Utility helper for searching museum artifacts with Vietnamese accent-insensitive matching,
 * keyword searching, and accurate structured AI responses.
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
 * Search artifacts in dataset based on user query string.
 * @param {Array} artifactsList - List of artifact objects
 * @param {string} query - User search prompt/question
 * @returns {Object} Search result containing matched artifacts & generated answer
 */
export function searchArtifacts(artifactsList, query) {
  if (!query || !query.trim() || !Array.isArray(artifactsList)) {
    return {
      success: false,
      message: 'Vui lòng nhập câu hỏi hoặc tên hiện vật cần tìm kiếm.',
      matchedArtifacts: [],
    };
  }

  const cleanQuery = removeVietnameseTones(query);

  const stopWords = ['co', 'nhung', 'hien', 'vat', 'nao', 'cho', 'toi', 'biet', 've', 'la', 'gi', 'y', 'nghia', 'nhu', 'the', 'nao', 'tim', 'lay', 'xem'];
  const queryTokens = cleanQuery
    .split(/\s+/)
    .filter((word) => word.length > 1 && !stopWords.includes(word));

  const scoredResults = artifactsList.map((item) => {
    let score = 0;
    const nameClean = removeVietnameseTones(item.name || '');
    const descClean = removeVietnameseTones(item.description || '');
    const periodClean = removeVietnameseTones(item.period || item.culture || '');

    if (nameClean.includes(cleanQuery)) {
      score += 100;
    }

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
    if (cleanQuery.includes('nguyen ai quoc') && (nameClean.includes('nguyen ai quoc') || descClean.includes('nguyen ai quoc') || descClean.includes('ho chi minh'))) {
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

  if (matches.length === 0) {
    return {
      success: false,
      message: 'Xin lỗi, tôi chưa tìm thấy thông tin về hiện vật này trong dữ liệu của bảo tàng.',
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
    answerText = `"${primary.name}" hiện đang được trưng bày tại vị trí: ${locStr}. (Lưu ý: Đây là thông tin vị trí trưng bày trên hệ thống bảo tàng demo).`;
  } else if (matches.length === 1 || primary.name.toLowerCase().includes(query.toLowerCase())) {
    answerText = `"${primary.name}" là hiện vật thuộc bộ sưu tập Bảo tàng Lịch sử Quốc gia Việt Nam. ${primary.date ? `(Niên đại: ${primary.date}). ` : ''}${primary.description} 📍 Vị trí trưng bày: ${locStr}.`;
  } else {
    answerText = `Tôi đã tìm thấy ${matches.length} hiện vật phù hợp. Hiện vật tiêu biểu nhất là "${primary.name}"${primary.date ? ` (Niên đại: ${primary.date})` : ''} được đặt tại: ${locStr}.`;
  }

  return {
    success: true,
    message: answerText,
    matchedArtifacts: matches.slice(0, 3),
  };
}
