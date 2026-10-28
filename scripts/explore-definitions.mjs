import fs from 'fs';

const root = JSON.parse(fs.readFileSync('scripts/extracted_script_general.json', 'utf8'));

console.log('Definitions count:', Object.keys(root.definitions || {}).length);
console.log('Definitions sample keys:', Object.keys(root.definitions || {}).slice(0, 20));

// Find components / players / panoramas in root
function summarizeLevel(obj, prefix = '') {
  if (!obj || typeof obj !== 'object') return;
  for (const [k, v] of Object.entries(obj)) {
    if (v && typeof v === 'object') {
      const cls = v.class || (v.data && v.data.class) || '';
      const id = v.id || k;
      if (cls.includes('Panorama') || cls.includes('Tour') || cls.includes('Viewer') || cls.includes('Player')) {
        console.log(`${prefix}${k} => class: ${cls}, id: ${id}, label: ${v.label || (v.data && v.data.label) || ''}`);
      }
      if (k === 'children' && Array.isArray(v)) {
        v.forEach((child, i) => {
          console.log(`${prefix}  child[${i}] => class: ${child.class}, id: ${child.id}`);
          if (child.children) summarizeLevel({ children: child.children }, prefix + '    ');
        });
      }
    }
  }
}

summarizeLevel(root);

// Search for all items in definitions with class containing Panorama
const panoramaDefs = {};
const hotspotDefs = {};
const overlayDefs = {};

for (const [defId, def] of Object.entries(root.definitions || {})) {
  const cls = def.class || '';
  if (cls.includes('Panorama')) {
    panoramaDefs[defId] = def;
  } else if (cls.includes('Hotspot')) {
    hotspotDefs[defId] = def;
  } else if (cls.includes('Overlay')) {
    overlayDefs[defId] = def;
  }
}

console.log(`Panorama definitions: ${Object.keys(panoramaDefs).length}`);
console.log(`Hotspot definitions: ${Object.keys(hotspotDefs).length}`);
console.log(`Overlay definitions: ${Object.keys(overlayDefs).length}`);

// Sample a panorama definition
const samplePanId = Object.keys(panoramaDefs)[0];
if (samplePanId) {
  console.log(`Sample panorama (${samplePanId}):`, JSON.stringify(panoramaDefs[samplePanId], null, 2).slice(0, 1500));
}
