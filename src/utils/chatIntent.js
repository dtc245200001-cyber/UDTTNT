import { removeVietnameseTones, searchArtifacts, hasMuseumSignal } from './artifactSearch';

export function detectIntent(text, artifacts = [], priorArtifacts = []) {
  const clean = removeVietnameseTones(String(text || '').toLowerCase());

  if (
    clean.includes('dat ve') ||
    clean.includes('mua ve') ||
    clean.includes('book ve') ||
    clean.includes('muon ve') ||
    clean.includes('dang ky ve') ||
    clean.includes('booking')
  ) {
    return 'book_ticket';
  }

  if (
    clean.includes('gia ve') ||
    clean.includes('ve bao nhieu') ||
    clean.includes('gio mo cua') ||
    clean.includes('mo cua luc may gio') ||
    clean.includes('gia tien')
  ) {
    return 'ticket_info';
  }

  // L1: cau khong dau hieu bao tang -> "other" ngay, khong chay local search
  // (chong rac kieu "hang dien thoai" -> "Dai Phat thanh Tieng noi").
  if (!hasMuseumSignal(clean) && !(priorArtifacts && priorArtifacts.length > 0)) {
    return 'other';
  }

  // Kiểm tra xem có khớp hiện vật nào không (ngưỡng tương tự searchArtifacts)
  const searchResult = searchArtifacts(artifacts, text, {}, { priorArtifacts });
  if (
    searchResult &&
    searchResult.matchedArtifacts &&
    searchResult.matchedArtifacts.length > 0
  ) {
    return 'artifact_search';
  }

  if (
    clean.includes('hien vat') || 
    clean.includes('bao vat') || 
    clean.includes('trong dong') || 
    clean.includes('gom') || 
    clean.includes('tuong')
  ) {
    return 'artifact_search';
  }
  
  return 'other';
}
