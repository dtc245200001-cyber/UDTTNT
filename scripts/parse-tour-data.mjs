import fs from 'fs';

const data = JSON.parse(fs.readFileSync('scripts/extracted_script_general.json', 'utf8'));

console.log('--- ROOT KEYS ---');
console.log(Object.keys(data));

// Recursive walker to find all items with class = 'PanoramaPlayListItem' or type containing 'panorama' or 'media'
const panoramas = [];
const hotspots = [];
let tourSettings = null;

function walk(obj, path = '') {
  if (!obj || typeof obj !== 'object') return;

  if (obj.class === 'PanoramaPlayListItem' || (obj.data && obj.data.type === 'panorama') || obj.panorama) {
    panoramas.push({ path, obj });
  }

  if (obj.class && obj.class.includes('Hotspot')) {
    hotspots.push({ path, obj });
  }

  if (obj.class === 'Tour') {
    tourSettings = obj;
  }

  for (const k of Object.keys(obj)) {
    walk(obj[k], path ? `${path}.${k}` : k);
  }
}

walk(data);

console.log(`Found ${panoramas.length} panoramas, ${hotspots.length} hotspots`);

// Let's inspect panoramas
const parsedPanoramas = [];

for (const p of panoramas) {
  const item = p.obj;
  const info = {
    id: item.id || (item.data && item.data.id),
    label: item.label || (item.data && item.data.label) || (item.data && item.data.title),
    file: item.file || item.url || (item.data && item.data.url) || (item.data && item.data.file),
    initialView: item.initialView || (item.data && item.data.initialView),
    rawHotspotsCount: (item.hotspots || []).length || (item.items || []).filter(i => i.class && i.class.includes('Hotspot')).length
  };
  parsedPanoramas.push({ path: p.path, info, full: item });
}

console.log('=== PANORAMAS SUMMARY ===');
for (const p of parsedPanoramas) {
  console.log(`ID: ${p.info.id} | Label: ${p.info.label} | Initial: ${JSON.stringify(p.info.initialView)} | Hotspots: ${p.info.rawHotspotsCount}`);
}

// Write detailed panorama dump to a file
fs.writeFileSync('scripts/parsed_panoramas.json', JSON.stringify(parsedPanoramas, null, 2));
console.log('Saved parsed panoramas to scripts/parsed_panoramas.json');
