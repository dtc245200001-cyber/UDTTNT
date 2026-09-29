import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// 1. Import data
import { artifacts } from './src/data/artifacts.js';
import { exhibitions } from './src/data/exhibitions.js';
import { events } from './src/data/events.js';
import { initialGalleries as galleries } from './src/data/galleries.js';
import { ticketTypes } from './src/data/tickets.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const KNOWLEDGE_BASE_DIR = path.join(__dirname, 'backend', 'data', 'knowledge_base');

console.log('🔄 Đang đồng bộ TOÀN BỘ dữ liệu Frontend sang Backend (JSON)...');

// 2. Map Artifacts
const artifactsJson = artifacts.map(a => ({
    id: a.id,
    name: a.name,
    category: a.category || '',
    period: a.period || '',
    date: a.date || '',
    location: a.location || '',
    content: a.description || ''
}));

fs.writeFileSync(
    path.join(KNOWLEDGE_BASE_DIR, 'artifacts.json'),
    JSON.stringify(artifactsJson, null, 2),
    'utf-8'
);
console.log(`✅ Đã xuất ${artifactsJson.length} hiện vật ra artifacts.json`);

// 3. Map Exhibitions, Events, Galleries, Tours, Tickets
const exhibitionsEventsJson = [];

exhibitions.forEach(ex => {
    exhibitionsEventsJson.push({
        id: ex.id,
        category: 'Triển lãm',
        title: ex.name,
        date: `${ex.startDate || ''} đến ${ex.endDate || ''}`,
        location: ex.location || '',
        content: `Trạng thái: ${ex.status || ''}. Nội dung: ${ex.description || ''}. Số lượng hiện vật: ${ex.artifactsCount || 0}.`
    });
});

events.forEach(ev => {
    exhibitionsEventsJson.push({
        id: ev.id,
        category: 'Sự kiện',
        title: ev.name,
        date: `${ev.date || ''} ${ev.time || ''}`,
        location: ev.location || '',
        content: `Trạng thái: ${ev.status || ''}. Nội dung: ${ev.description || ''}.`
    });
});



galleries.forEach(gal => {
    exhibitionsEventsJson.push({
        id: gal.id,
        category: 'Chuyên đề nổi bật',
        title: gal.name,
        date: `${gal.startDate || ''} đến ${gal.endDate || ''}`,
        location: gal.location || '',
        content: `Trạng thái: ${gal.status || ''}. Giới thiệu ngắn: ${gal.description || ''}. Chi tiết: ${gal.detailedContent || ''}`
    });
});

ticketTypes.forEach(ticket => {
    exhibitionsEventsJson.push({
        id: ticket.id,
        category: 'Vé tham quan',
        title: ticket.title,
        date: '',
        location: 'Quầy vé bảo tàng',
        content: `Loại vé: ${ticket.title}. Giá: ${ticket.price || 0} VNĐ. Đối tượng áp dụng: ${ticket.description || ''}. Ghi chú thêm: ${ticket.note || ''}`
    });
});

fs.writeFileSync(
    path.join(KNOWLEDGE_BASE_DIR, 'exhibitions_events.json'),
    JSON.stringify(exhibitionsEventsJson, null, 2),
    'utf-8'
);
console.log(`✅ Đã xuất ${exhibitionsEventsJson.length} thông tin (Triển lãm, Sự kiện, Chuyên đề, Tour, Vé) ra exhibitions_events.json`);

console.log('🎉 Hoàn tất! Bạn có thể chạy lại script: python backend/scripts/init_vector_db.py');
