export function normalizeArtifact(item) {
  if (!item) {
    return {
      id: `unknown-${Date.now()}`,
      name: 'Hiện vật chưa đặt tên',
      description: '',
      period: '',
      culture: '',
      date: '',
      location: 'Đang cập nhật vị trí',
      image: './images/museum-hero.jpg',
      category: 'Khác',
    };
  }

  return {
    ...item,
    id: String(item.id ?? `unknown-${Date.now()}`),
    name: String(item.name ?? 'Hiện vật chưa đặt tên'),
    description: String(item.description ?? ''),
    period: String(item.period ?? ''),
    culture: String(item.culture ?? ''),
    date: String(item.date ?? ''),
    location: String(item.location ?? 'Đang cập nhật vị trí'),
    image: String(item.image ?? './images/museum-hero.jpg'),
    category: String(item.category ?? 'Khác'),
  };
}

/**
 * Map artifact_ids từ backend sang thẻ hiển thị.
 * - Ưu tiên object đầy đủ trong danh sách client (có ảnh, vị trí...).
 * - Nếu id không có trong client list: dựng thẻ dự phòng từ sources RAG
 *   (title/period/snippet) thay vì drop im lặng như trước đây.
 * - Cuối cùng vẫn normalize để ChatArtifactCards luôn render được.
 */
export function resolveChatArtifacts(artifactIds, clientArtifacts, sources = []) {
  const list = Array.isArray(clientArtifacts) ? clientArtifacts : [];
  const srcs = Array.isArray(sources) ? sources : [];

  return (artifactIds || []).map((id) => {
    const sid = String(id);
    const found = list.find((a) => a && String(a.id) === sid);
    if (found) return normalizeArtifact(found);

    const src = srcs.find((s) => s && String(s.source_id) === sid);
    if (src) {
      return normalizeArtifact({
        id: sid,
        name: src.title || `Hiện vật ${sid}`,
        period: src.period || '',
        description: src.snippet || '',
        category: src.category || '',
      });
    }

    return normalizeArtifact({ id: sid, name: `Hiện vật ${sid}` });
  });
}
