import fs from 'fs';
const scenes = JSON.parse(fs.readFileSync('scripts/3dvista_parsed_scenes.json', 'utf8'));

for (let i = 0; i <= 7; i++) {
  const s = scenes[i];
  console.log(`=== SCENE INDEX ${s.playlistIndex} ===`);
  console.log(`ID: ${s.panoramaId}`);
  console.log(`Label: "${s.label}"`);
  console.log(`InitialView: yaw=${s.camera.initialYaw}, pitch=${s.camera.initialPitch}`);
  console.log(`Adjacent destinations:`);
  s.adjacent.forEach(a => {
    console.log(`  -> to Scene Idx ${a.targetIndex} (${a.targetPanId}): yaw=${a.overlay.yaw}°, pitch=${a.overlay.pitch}°, dist=${a.distance}m, overlayLabel="${a.overlay.label}"`);
  });
}
