import fs from 'fs';

// Check thumbnails or images in docs or public
const filesInPublic = fs.readdirSync('public/tours/thoitiensu', { recursive: true });
console.log('Files in public/tours/thoitiensu:', filesInPublic);

// Check if any thumbnail or id matches
const scenes = JSON.parse(fs.readFileSync('scripts/3dvista_parsed_scenes.json', 'utf8'));

scenes.forEach(s => {
  console.log(`Index ${s.playlistIndex}: ${s.label} (${s.panoramaId})`);
});
