import { removeVietnameseTones, searchArtifacts } from './artifactSearch';

export function detectIntent(text, artifacts = []) {
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
  
  // Kiểm tra xem có khớp hiện vật nào không (ngưỡng tương tự searchArtifacts)
  const searchResult = searchArtifacts(artifacts, text);
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
