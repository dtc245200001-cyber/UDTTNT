import fs from 'fs';

const categorized = JSON.parse(fs.readFileSync('scripts/categorized_definitions.json', 'utf8'));

console.log('=== PANORAMAS (27) ===');
const panoramas = categorized['Panorama'].map(p => {
  const item = p.item;
  return {
    id: item.id,
    label: item.label,
    data: item.data,
    camera: item.camera,
    adjacentPanoramas: item.adjacentPanoramas,
    items: item.items
  };
});

console.log(JSON.stringify(panoramas.map(p => ({
  id: p.id,
  label: p.label,
  adjacentCount: (p.adjacentPanoramas || []).length,
  itemsCount: (p.items || []).length
})), null, 2));

console.log('=== SAMPLE PANORAMA 0 ===');
console.log(JSON.stringify(panoramas[0], null, 2));

console.log('=== SAMPLE CAMERA 0 ===');
console.log(JSON.stringify(categorized['PanoramaCamera'][0], null, 2));

console.log('=== SAMPLE HOTSPOT OVERLAY 0 ===');
console.log(JSON.stringify(categorized['HotspotPanoramaOverlay'][0], null, 2));

console.log('=== SAMPLE HOTSPOT OVERLAY AREA 0 ===');
console.log(JSON.stringify(categorized['HotspotPanoramaOverlayArea'][0], null, 2));

console.log('=== SAMPLE ANIMATED IMAGE RESOURCE 0 ===');
console.log(JSON.stringify(categorized['AnimatedImageResource'][0], null, 2));
