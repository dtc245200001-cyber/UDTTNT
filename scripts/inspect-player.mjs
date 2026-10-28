import fs from 'fs';

const categorized = JSON.parse(fs.readFileSync('scripts/categorized_definitions.json', 'utf8'));

console.log('=== PANORAMA PLAYER ===');
console.log(JSON.stringify(categorized['PanoramaPlayer'], null, 2));

console.log('=== VIEWER AREA ===');
console.log(JSON.stringify(categorized['ViewerArea'], null, 2));

console.log('=== CAMERA SEQUENCES (first 3) ===');
console.log(JSON.stringify(categorized['PanoramaCameraSequence'].slice(0, 3), null, 2));
