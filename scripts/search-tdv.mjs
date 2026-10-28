import fs from 'fs';

const tdv = fs.readFileSync('docs/tdvplayer.js', 'utf8');

// Search for keywords like AdjacentPanorama, drag_rotation, HotspotPanoramaOverlayImage
console.log('Searching in tdvplayer.js...');

function searchSnippets(word, max = 5) {
  let idx = 0;
  let count = 0;
  console.log(`=== Snippets for "${word}" ===`);
  while ((idx = tdv.indexOf(word, idx)) !== -1 && count < max) {
    const start = Math.max(0, idx - 100);
    const end = Math.min(tdv.length, idx + 200);
    console.log(`[#${count+1}] ...${tdv.slice(start, end).replace(/\n/g, ' ')}...`);
    idx += word.length;
    count++;
  }
}

searchSnippets('AdjacentPanorama', 3);
searchSnippets('HotspotPanoramaOverlayImage', 3);
searchSnippets('enterPointingToHorizon', 3);
searchSnippets('drag_rotation', 2);
