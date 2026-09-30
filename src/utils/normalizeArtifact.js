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
