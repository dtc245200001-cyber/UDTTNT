import { artifacts as defaultArtifacts } from '../data/artifacts.js';
import { categories as defaultCategories } from '../data/categories.js';

/**
 * Remove Vietnamese accents and diacritics, lowercase, and trim
 */
export function removeVietnameseTones(str) {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .trim();
}

/**
 * Compute Levenshtein distance between two strings
 */
export function levenshteinDistance(a, b) {
  if (a === b) return 0;
  if (!a) return b ? b.length : 0;
  if (!b) return a.length;

  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));

  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;

  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1, // deletion
        dp[i][j - 1] + 1, // insertion
        dp[i - 1][j - 1] + cost // substitution
      );
    }
  }

  return dp[m][n];
}

/**
 * Check if word1 matches word2 with tolerance:
 * If length >= 4, allows Levenshtein distance <= 1 (handles "chong" ~ "trong", etc.)
 * If length < 4, requires exact match.
 */
export function isFuzzyWordMatch(w1, w2) {
  if (w1 === w2) return true;
  if (w1.length >= 4 && w2.length >= 4) {
    if (Math.abs(w1.length - w2.length) <= 1) {
      return levenshteinDistance(w1, w2) <= 1;
    }
  }
  return false;
}

/**
 * Command prefixes and filler words to strip
 * Sorted by length descending for accurate phrase matching
 */
const COMMAND_FILLERS = [
  'cho toi xem cac hien vat co nien dai',
  'cho toi xem cac hien vat ve',
  'cho toi xem cac hien vat bang',
  'cho toi xem cac hien vat',
  'cho toi xem nhung hien vat co nien dai',
  'cho toi xem nhung hien vat bang',
  'cho toi xem nhung hien vat',
  'cho toi xem hien vat ve',
  'cho toi xem hien vat co nien dai',
  'cho toi xem hien vat bang',
  'cho toi xem hien vat',
  'cho toi xem',
  'cho minh xem',
  'cho em xem',
  'cho toi biet',
  'toi muon xem cac hien vat co nien dai',
  'toi muon xem cac hien vat ve',
  'toi muon xem cac hien vat bang',
  'toi muon xem cac hien vat',
  'toi muon xem nhung hien vat',
  'toi muon xem hien vat ve',
  'toi muon xem hien vat bang',
  'toi muon xem hien vat',
  'toi muon xem',
  'muon xem cac hien vat',
  'muon xem hien vat',
  'muon xem',
  'tim giup toi hien vat ve',
  'tim giup toi hien vat',
  'tim giup toi cac hien vat',
  'tim giup toi',
  'tim ho toi',
  'tim cho toi',
  'tim nhung hien vat co nien dai',
  'tim nhung hien vat bang',
  'tim nhung hien vat ve',
  'tim nhung hien vat',
  'tim cac hien vat co nien dai',
  'tim cac hien vat bang',
  'tim cac hien vat ve',
  'tim cac hien vat',
  'tim kiem hien vat ve',
  'tim kiem hien vat',
  'tim hien vat ve',
  'tim kiem ve',
  'tim hien vat',
  'tim kiem',
  'hay tim kiem',
  'hay tim',
  'chay tim',
  'cac hien vat co nien dai',
  'nhung hien vat co nien dai',
  'hien vat co nien dai',
  'cac hien vat bang',
  'nhung hien vat bang',
  'hien vat bang',
  'do vat bang',
  'co nien dai',
  'nien dai',
  'hien vat ve',
  'nhung hien vat ve',
  'cac hien vat ve',
  'nhung hien vat',
  'cac hien vat',
  'hien vat',
  'bao vat',
  'co vat',
  'cho xem',
  'cho toi',
  'giup toi',
  'ho toi',
  'xem mo',
  'mo xem',
  'xem nhung',
  'xem cac',
  'xem',
  'mo',
  'nhung cai',
  'nhung chiec',
  'nhung thu',
  'nhung',
  'cac cai',
  'cac chiec',
  'cac',
  'cai nao',
  'cai gi',
  'cai',
  'chiec',
  'bang',
  'tim',
  've',
  'o trong bao tang',
  'trong bao tang',
  'o tai',
  'tai',
  'bao tang',
  'di san',
];

/**
 * Synonyms and variants table
 */
export const SYNONYM_GROUPS = [
  {
    key: 'trong_dong',
    canonical: 'trống đồng',
    variants: ['trong dong', 'trong dong son', 'ngoc lu', 'hoang ha', 'canh thinh', 'heger', 'thap dao thinh'],
    categoryId: 'DM08',
  },
  {
    key: 'do_da',
    canonical: 'cổ vật đá',
    variants: ['do da', 'co vat da', 'riu da', 'cong cu da', 'bia da', 'tuong da', 'hoa thach', 'bac son', 'bang da'],
    categoryId: 'DM09',
  },
  {
    key: 'gom',
    canonical: 'cổ vật gốm',
    variants: ['gom', 'do gom', 'su', 'do su', 'bat trang', 'men lam', 'hoa nau', 'gom men', 'gom ly tran', 'bang gom', 'gom thoi ly'],
    categoryId: 'DM10',
  },
  {
    key: 'bac_ho',
    canonical: 'Bác Hồ',
    variants: ['bac ho', 'ho chi minh', 'chu tich ho chi minh', 'nguyen ai quoc', 'nguyen tat thanh', 'lanh tu ho chi minh'],
    categoryId: 'DM02',
  },
  {
    key: 'dien_bien_phu',
    canonical: 'Điện Biên Phủ',
    variants: ['dien bien', 'dien bien phu', 'muong phang', 'de castries'],
  },
  {
    key: 'vu_khi',
    canonical: 'vũ khí',
    variants: ['vu khi', 'khi tai', 'sung', 'bom', 'dan', 'kiem', 'ma tau', 'giao mac', 'xe tang', 'tau khong so', 'phao'],
    categoryId: 'DM01',
  },
  {
    key: 'co_vat_dong',
    canonical: 'cổ vật đồng',
    variants: ['co vat dong', 'do dong', 'dong son', 'an tin', 'mon ha sanh an', 'dinh dong', 'lu huong', 'bang dong'],
    categoryId: 'DM08',
  },
  {
    key: 'do_go',
    canonical: 'đồ gỗ mỹ nghệ',
    variants: ['do go', 'go my nghe', 'kham trai', 'tuong go', 'kien truc co', 'bang go'],
    categoryId: 'DM11',
  },
  {
    key: 'vang_bac',
    canonical: 'đồ vàng bạc',
    variants: ['vang bac', 'trang suc', 'an kim bao', 'vang', 'bac', 'bang vang', 'bang bac'],
    categoryId: 'DM12',
  },
  {
    key: 'da_quy',
    canonical: 'đồ ngọc & đá quý',
    variants: ['do ngoc', 'da quy', 'ngoc', 'thach anh', 'bang ngoc'],
    categoryId: 'DM13',
  },
];

/**
 * Historical periods mapping
 */
const PERIOD_MAPPINGS = [
  { keywords: ['thoi ly', 'nha ly', 'trieu ly', 'doi ly', 'ly tran', 'ly - tran'], label: 'Thời Lý', filterValue: 'Lý' },
  { keywords: ['thoi tran', 'nha tran', 'trieu tran', 'doi tran'], label: 'Thời Trần', filterValue: 'Trần' },
  { keywords: ['hung vuong', 'thoi hung vuong', 'thoi ky hung vuong', 'vua hung'], label: 'Thời Hùng Vương', filterValue: 'Hùng Vương' },
  { keywords: ['co dai', 'thoi co dai'], label: 'Thời Cổ đại', filterValue: 'Cổ đại' },
  { keywords: ['thoi nguyen', 'nha nguyen', 'trieu nguyen', 'doi nguyen'], label: 'Thời Nguyễn', filterValue: 'Nguyễn' },
  { keywords: ['thoi le', 'nha le', 'hau le', 'trieu le'], label: 'Thời Lê', filterValue: 'Lê' },
  { keywords: ['tien su', 'thoi tien su', 'so khai'], label: 'Tiền sử', filterValue: 'Tiền sử' },
  { keywords: ['dong son', 'van hoa dong son'], label: 'Đông Sơn', filterValue: 'Đông Sơn' },
  { keywords: ['khang chien', 'chong phap', 'chong my'], label: 'Kháng chiến', filterValue: 'Hiện đại' },
];

/**
 * Location mappings
 */
const LOCATION_MAPPINGS = [
  { keywords: ['tang 1', 'tang mot'], label: 'Tầng 1', filterValue: 'Tầng 1' },
  { keywords: ['tang 2', 'tang hai'], label: 'Tầng 2', filterValue: 'Tầng 2' },
  { keywords: ['tang 3', 'tang ba'], label: 'Tầng 3', filterValue: 'Tầng 3' },
  { keywords: ['phong a'], label: 'Phòng A', filterValue: 'Phòng A' },
  { keywords: ['phong b'], label: 'Phòng B', filterValue: 'Phòng B' },
  { keywords: ['phong c'], label: 'Phòng C', filterValue: 'Phòng C' },
  { keywords: ['phong d'], label: 'Phòng D', filterValue: 'Phòng D' },
];

/**
 * Strip command and filler words from raw query
 */
export function stripCommandFillers(rawQuery) {
  let cleaned = removeVietnameseTones(rawQuery);
  // Remove punctuation
  cleaned = cleaned.replace(/[.,?!;:()[\]{}"'\\/`~@#$%^&*+=<>_-]/g, ' ');

  // Repeatedly strip matching filler phrases
  let changed = true;
  while (changed) {
    changed = false;
    const tokens = cleaned.split(/\s+/).filter(Boolean);
    const joined = tokens.join(' ');

    for (const filler of COMMAND_FILLERS) {
      if (joined === filler) {
        // If query is ONLY the filler word, leave the filler as query
        return joined;
      }
      if (joined.startsWith(filler + ' ')) {
        cleaned = joined.slice(filler.length).trim();
        changed = true;
        break;
      }
      if (joined.endsWith(' ' + filler)) {
        cleaned = joined.slice(0, joined.length - filler.length).trim();
        changed = true;
        break;
      }
      const midRegex = new RegExp(`\\b${filler}\\b`, 'g');
      if (midRegex.test(cleaned)) {
        cleaned = cleaned.replace(midRegex, ' ').replace(/\s+/g, ' ').trim();
        changed = true;
        break;
      }
    }
  }

  const finalTokens = cleaned.split(/\s+/).filter(Boolean);
  return finalTokens.join(' ');
}

export const STOP_WORDS = new Set([
  'co', 'khong', 'la', 'va', 'cua', 'trong', 'cho', 'duoc', 'nhu', 'voi', 'de',
  'theo', 'tai', 'ra', 'lai', 'mot', 'nhieu', 'it', 'den', 'tu', 'da', 'se', 'dang',
  'cau', 'chu', 'tu', 'loai', 'phan', 'thi', 'ma', 'neu', 'vi', 'do', 'nay', 'kia',
  'nhung', 'cac', 'cai', 'chiec', 'vo', 'nghia'
]);

/**
 * Smart museum artifact search
 * Shared across text search, voice search, and AI assistant
 *
 * @param {string} rawQuery - User speech or typed query
 * @param {Array} [artifactsList=artifacts] - Artifacts dataset
 * @param {Array} [categoriesList=categories] - Categories dataset
 * @param {Object} [options={}] - Options (e.g. forcedCategory)
 * @returns {{ results: Array, interpretedQuery: string, usedFilters: Object, suggestions: Array }}
 */
export function searchArtifacts(
  rawQuery = '',
  artifactsList = defaultArtifacts,
  categoriesList = defaultCategories,
  options = {}
) {
  if (!rawQuery || typeof rawQuery !== 'string' || !rawQuery.trim()) {
    return {
      results: artifactsList,
      interpretedQuery: '',
      usedFilters: {},
      suggestions: [],
    };
  }

  const normalizedRaw = removeVietnameseTones(rawQuery);
  const strippedQuery = stripCommandFillers(rawQuery) || normalizedRaw;

  const usedFilters = {};
  let interpretedLabels = [];

  // Check if speech had misrecognition like "chống đồng" -> fuzzy map to "trống đồng"
  let effectiveQuery = strippedQuery;
  const strippedWords = strippedQuery.split(/\s+/).filter(Boolean);

  // Check for common misrecognitions
  if (
    (strippedQuery.includes('chong dong') || (strippedWords.length === 2 && isFuzzyWordMatch(strippedWords[0], 'trong') && isFuzzyWordMatch(strippedWords[1], 'dong')))
  ) {
    effectiveQuery = 'trong dong';
  }

  // 1. Detect Category Intent
  // Match category names or synonym categories
  for (const cat of categoriesList) {
    const catNorm = removeVietnameseTones(cat.name);
    const catShort = catNorm.split('&')[0].trim();
    if (
      normalizedRaw.includes(catNorm) ||
      strippedQuery.includes(catNorm) ||
      (catShort && strippedQuery.includes(catShort))
    ) {
      usedFilters.categoryId = cat.id;
      usedFilters.categoryName = cat.name;
      interpretedLabels.push(cat.name);
      break;
    }
  }

  // Check synonym groups for category or canonical terms
  let matchedSynonyms = [];
  for (const group of SYNONYM_GROUPS) {
    for (const v of group.variants) {
      if (
        normalizedRaw.includes(v) ||
        effectiveQuery.includes(v) ||
        (v.length >= 4 && isFuzzyWordMatch(effectiveQuery, v))
      ) {
        matchedSynonyms.push(group);
        if (group.categoryId && !usedFilters.categoryId) {
          const cat = categoriesList.find((c) => c.id === group.categoryId);
          if (cat) {
            usedFilters.categoryId = cat.id;
            usedFilters.categoryName = cat.name;
            interpretedLabels.push(cat.name);
          }
        }
        if (!interpretedLabels.includes(group.canonical)) {
          interpretedLabels.unshift(group.canonical);
        }
        break;
      }
    }
  }

  // 2. Detect Period Intent
  for (const p of PERIOD_MAPPINGS) {
    if (p.keywords.some((kw) => normalizedRaw.includes(kw) || effectiveQuery.includes(kw))) {
      usedFilters.period = p.filterValue;
      interpretedLabels.push(p.label);
      break;
    }
  }

  // 3. Detect Location Intent
  for (const loc of LOCATION_MAPPINGS) {
    if (loc.keywords.some((kw) => normalizedRaw.includes(kw) || effectiveQuery.includes(kw))) {
      usedFilters.location = loc.filterValue;
      interpretedLabels.push(loc.label);
      break;
    }
  }

  // Override with options category if user explicitly chose tab
  if (options.forcedCategory && options.forcedCategory !== 'Tất cả') {
    const forcedCat = categoriesList.find(
      (c) => c.name === options.forcedCategory || c.id === options.forcedCategory
    );
    if (forcedCat) {
      usedFilters.categoryId = forcedCat.id;
      usedFilters.categoryName = forcedCat.name;
    }
  }

  // Formulate interpreted query string
  let interpretedQuery = effectiveQuery;
  if (interpretedLabels.length > 0) {
    interpretedQuery = interpretedLabels.join(' • ');
  } else if (rawQuery.trim()) {
    interpretedQuery = strippedQuery;
  }


  // 4. Scoring Artifacts
  const allTokens = effectiveQuery.split(/\s+/).filter((w) => w.length > 1);
  const meaningfulTokens = allTokens.filter((w) => !STOP_WORDS.has(w));
  const queryTokens = meaningfulTokens.length > 0 ? meaningfulTokens : allTokens;
  const scoredArtifacts = [];

  for (const art of artifactsList) {
    let score = 0;
    const nameNorm = removeVietnameseTones(art.name);
    const descNorm = removeVietnameseTones(art.description);
    const cultureNorm = removeVietnameseTones(art.culture || '');
    const periodNorm = removeVietnameseTones(art.period || '');
    const catNorm = removeVietnameseTones(art.category || '');
    const locNorm = removeVietnameseTones(art.location || '');

    // Category match
    if (usedFilters.categoryId) {
      if (art.categoryId === usedFilters.categoryId || art.category === usedFilters.categoryName) {
        score += 35;
      } else if (!options.forcedCategory) {
        // Soft penalty if category was explicitly detected from query but doesn't match
        score -= 15;
      } else {
        // Hard filter if forced by UI tab
        continue;
      }
    }

    // Period match
    if (usedFilters.period) {
      if (usedFilters.period === 'Hùng Vương') {
        if (
          cultureNorm.includes('dong son') ||
          periodNorm.includes('co dai') ||
          nameNorm.includes('dong son') ||
          nameNorm.includes('ngoc lu') ||
          nameNorm.includes('hoang ha') ||
          nameNorm.includes('dao thinh') ||
          descNorm.includes('dong son') ||
          descNorm.includes('hung vuong')
        ) {
          score += 70;
        }
      } else if (usedFilters.period === 'Lý') {
        if (
          nameNorm.includes('ly') ||
          nameNorm.includes('ly-tran') ||
          nameNorm.includes('ly - tran') ||
          descNorm.includes('thoi ly') ||
          descNorm.includes('ly - tran') ||
          descNorm.includes('ly-tran') ||
          descNorm.includes('trieu ly') ||
          periodNorm.includes('ly')
        ) {
          score += 70;
        }
      } else if (
        periodNorm.includes(removeVietnameseTones(usedFilters.period)) ||
        nameNorm.includes(removeVietnameseTones(usedFilters.period)) ||
        descNorm.includes(removeVietnameseTones(usedFilters.period))
      ) {
        score += 35;
      }
    }

    // Location match
    if (usedFilters.location) {
      if (locNorm.includes(removeVietnameseTones(usedFilters.location))) {
        score += 25;
      }
    }

    // Exact full query match in Name (highest weight)
    if (effectiveQuery && nameNorm.includes(effectiveQuery)) {
      score += 120;
    }

    // Compound boost for "trống đồng Đông Sơn"
    if (effectiveQuery.includes('trong dong') && effectiveQuery.includes('dong son')) {
      if (nameNorm.includes('trong dong') && (descNorm.includes('dong son') || cultureNorm.includes('dong son') || nameNorm.includes('dong son'))) {
        score += 100;
      }
    }

    // Synonym exact phrase in Name
    for (const syn of matchedSynonyms) {
      for (const v of syn.variants) {
        if (nameNorm.includes(v)) {
          score += 90;
          break;
        }
      }
    }

    // Query in category / culture / period
    if (effectiveQuery) {
      if (catNorm.includes(effectiveQuery)) score += 30;
      if (cultureNorm.includes(effectiveQuery)) score += 25;
      if (periodNorm.includes(effectiveQuery)) score += 25;
      if (descNorm.includes(effectiveQuery)) score += 20;
    }

    // Token-by-token scoring with Levenshtein tolerance
    const artNameTokens = nameNorm.split(/\s+/).filter(Boolean);
    const artDescTokens = descNorm.split(/\s+/).filter(Boolean);

    let matchedWordCount = 0;
    for (const qToken of queryTokens) {
      let wordMatched = false;

      // In Name
      for (const aToken of artNameTokens) {
        if (qToken === aToken) {
          score += 25;
          wordMatched = true;
          break;
        } else if (isFuzzyWordMatch(qToken, aToken)) {
          score += 18;
          wordMatched = true;
          break;
        }
      }

      // In Category / Culture / Period
      if (!wordMatched) {
        if (catNorm.includes(qToken) || cultureNorm.includes(qToken) || periodNorm.includes(qToken)) {
          score += 12;
          wordMatched = true;
        }
      }

      // In Description
      if (!wordMatched) {
        for (const dToken of artDescTokens.slice(0, 80)) {
          if (qToken === dToken) {
            score += 6;
            wordMatched = true;
            break;
          } else if (isFuzzyWordMatch(qToken, dToken)) {
            score += 4;
            wordMatched = true;
            break;
          }
        }
      }

      if (wordMatched) matchedWordCount++;
    }

    // Bonus for matching all words in query
    if (queryTokens.length > 1 && matchedWordCount === queryTokens.length) {
      score += 40;
    }

    if (score > 0) {
      scoredArtifacts.push({
        ...art,
        _searchScore: score,
      });
    }
  }

  // Sort descending by score
  scoredArtifacts.sort((a, b) => b._searchScore - a._searchScore);

  // 5. Generate Suggestions if results are empty
  let suggestions = [];
  if (scoredArtifacts.length === 0) {
    // Pick 3 popular/relevant suggestions using Levenshtein distance on artifact titles
    const candidatePool = [
      'Trống đồng Ngọc Lũ',
      'Trống đồng Hoàng Hạ',
      'Đồ gốm men thời Lý-Trần',
      'Rìu đá',
      'Chiến dịch Điện Biên Phủ',
      'Kỷ vật Chủ tịch Hồ Chí Minh',
      'Súng ngựa trời',
      'Thạp Đào Thịnh',
    ];

    const scoredCandidates = candidatePool.map((c) => {
      const cNorm = removeVietnameseTones(c);
      const dist = levenshteinDistance(effectiveQuery, cNorm);
      return { text: c, dist };
    });

    scoredCandidates.sort((a, b) => a.dist - b.dist);
    suggestions = scoredCandidates.slice(0, 3).map((item) => item.text);
  }

  return {
    results: scoredArtifacts,
    interpretedQuery,
    usedFilters,
    suggestions,
  };
}

export default searchArtifacts;
