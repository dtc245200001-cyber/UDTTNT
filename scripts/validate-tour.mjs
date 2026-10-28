import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const tourJsonPath = path.join(rootDir, 'src', 'data', 'tour.json');
const publicDir = path.join(rootDir, 'public');

console.log('🔍 [VALIDATE TOUR] Bắt đầu kiểm tra dữ liệu Virtual Tour 360°...\n');

if (!fs.existsSync(tourJsonPath)) {
  console.error(`❌ Không tìm thấy file tour.json tại: ${tourJsonPath}`);
  process.exit(1);
}

let tour;
try {
  const content = fs.readFileSync(tourJsonPath, 'utf8');
  tour = JSON.parse(content);
} catch (err) {
  console.error(`❌ Lỗi phân tích cú pháp JSON trong tour.json:`, err.message);
  process.exit(1);
}

const scenes = tour.scenes || [];
if (scenes.length === 0) {
  console.error('❌ tour.json không chứa bất kỳ scene nào!');
  process.exit(1);
}

let hasErrors = false;
const errors = [];
const warnings = [];

// 1. Kiểm tra ID cảnh duy nhất
const sceneIds = new Set();
const sceneMap = new Map();

for (const scene of scenes) {
  if (!scene.id) {
    errors.push(`Scene thiếu trường "id": ${JSON.stringify(scene)}`);
    hasErrors = true;
  } else if (sceneIds.has(scene.id)) {
    errors.push(`Trùng lặp scene id: "${scene.id}"`);
    hasErrors = true;
  } else {
    sceneIds.add(scene.id);
    sceneMap.set(scene.id, scene);
  }
}
console.log(`✅ 1. Kiểm tra ID duy nhất: Tìm thấy ${sceneIds.size} cảnh riêng biệt.`);

// 2. Mọi target tồn tại & arrowAngle là số
const links = []; // { from, to, label }
for (const scene of scenes) {
  const hotspots = scene.hotspots || [];
  for (const hs of hotspots) {
    if (hs.type === 'floor-arrow') {
      const target = hs.target || hs.targetSceneId;
      if (!target) {
        errors.push(`[${scene.id}] Hotspot thiếu trường "target": ${hs.label || ''}`);
        hasErrors = true;
      } else if (!sceneIds.has(target)) {
        errors.push(`[${scene.id}] Target "${target}" không tồn tại trong danh sách scene!`);
        hasErrors = true;
      } else {
        links.push({ from: scene.id, to: target, label: hs.label });
      }

      if (hs.arrowAngle !== undefined && typeof hs.arrowAngle !== 'number') {
        errors.push(`[${scene.id}] Hotspot "${hs.label}" có arrowAngle không phải số: ${hs.arrowAngle}`);
        hasErrors = true;
      }
    }
  }
}
console.log(`✅ 2. Kiểm tra Target & Kiểu dữ liệu: Đã kiểm tra ${links.length} liên kết di chuyển.`);

// 3. Mỗi liên kết A → B có liên kết ngược B → A
const adjacency = new Map();
for (const id of sceneIds) adjacency.set(id, new Set());

for (const link of links) {
  adjacency.get(link.from).add(link.to);
}

for (const link of links) {
  const { from, to } = link;
  const reverseExists = adjacency.get(to)?.has(from);
  if (!reverseExists) {
    warnings.push(`Liên kết một chiều: từ "${from}" → "${to}" nhưng KHÔNG có chiều ngược lại từ "${to}" → "${from}".`);
  }
}
if (warnings.length === 0) {
  console.log(`✅ 3. Kiểm tra liên kết 2 chiều: Mọi liên kết A ↔ B đều có đường quay lại.`);
} else {
  console.log(`⚠️  3. Kiểm tra liên kết 2 chiều: Có ${warnings.length} cảnh báo về liên kết một chiều.`);
}

// 4. Mọi cảnh đến được từ cảnh đầu (Reachability - BFS)
const startSceneId = tour.defaultSceneId || scenes[0]?.id;
if (!startSceneId || !sceneIds.has(startSceneId)) {
  errors.push(`defaultSceneId "${startSceneId}" không hợp lệ hoặc không tồn tại!`);
  hasErrors = true;
} else {
  const visited = new Set();
  const queue = [startSceneId];
  visited.add(startSceneId);

  while (queue.length > 0) {
    const curr = queue.shift();
    const neighbors = adjacency.get(curr) || new Set();
    for (const next of neighbors) {
      if (!visited.has(next)) {
        visited.add(next);
        queue.push(next);
      }
    }
  }

  for (const id of sceneIds) {
    if (!visited.has(id)) {
      errors.push(`Cảnh mồ côi (không thể đi tới từ cảnh đầu "${startSceneId}"): "${id}"`);
      hasErrors = true;
    }
  }
  if (!hasErrors) {
    console.log(`✅ 4. Kiểm tra đồ thị liên thông: Toàn bộ ${sceneIds.size} cảnh đều đến được từ "${startSceneId}".`);
  }
}

// 5. Kiểm tra đủ 6 mặt ảnh của mỗi cảnh tồn tại trong thư mục public
console.log('\n📁 5. Kiểm tra tài nguyên ảnh 6 mặt:');
const requiredFaces = ['front', 'right', 'back', 'left', 'up', 'down'];
const missingImageReports = [];

for (const scene of scenes) {
  const faces = scene.cubeFaces || {};
  const missingInScene = [];

  for (const face of requiredFaces) {
    const rawPath = faces[face];
    if (!rawPath) {
      missingInScene.push(`${face}: (chưa khai báo URL)`);
      continue;
    }

    // Đường dẫn tương đối từ public: /tours/... -> public/tours/...
    const cleanRelPath = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath;
    const absPath = path.join(publicDir, cleanRelPath);

    if (!fs.existsSync(absPath)) {
      missingInScene.push(`${face} -> ${rawPath}`);
    }
  }

  if (missingInScene.length > 0) {
    missingImageReports.push({ sceneId: scene.id, title: scene.title, missing: missingInScene });
    errors.push(`[${scene.id}] Thiếu ${missingInScene.length}/6 mặt ảnh: ${missingInScene.join(', ')}`);
    hasErrors = true;
  } else {
    console.log(`   ✓ [${scene.id}] Đủ 6 mặt 2K: ${scene.title}`);
  }
}

// Báo cáo tổng kết
console.log('\n' + '='.repeat(60));
if (missingImageReports.length > 0) {
  console.log('🚨 DANH SÁCH ẢNH CÒN THIẾU CẦN BỔ SUNG:');
  for (const rep of missingImageReports) {
    console.log(` - Cảnh: ${rep.sceneId} (${rep.title})`);
    rep.missing.forEach(m => console.log(`     ✗ ${m}`));
  }
}

if (warnings.length > 0) {
  console.log('\n⚠️ CẢNH BÁO:');
  warnings.forEach(w => console.log(`   - ${w}`));
}

if (hasErrors) {
  console.log('\n❌ TỔNG HỢP LỖI CẦN SỬA:');
  errors.forEach(e => console.log(`   ❌ ${e}`));
  console.log('='.repeat(60));
  process.exit(1);
} else {
  console.log('🎉 TẤT CẢ KIỂM TRA ĐỀU ĐẠT CHUẨN (VALIDATION PASSED)!');
  console.log('='.repeat(60) + '\n');
  process.exit(0);
}
