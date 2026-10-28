import fs from 'fs';

const tdv = fs.readFileSync('docs/tdvplayer.js', 'utf8');

function searchWord(word, max = 5) {
  let idx = 0;
  let count = 0;
  console.log(`=== Matches for "${word}" ===`);
  while ((idx = tdv.indexOf(word, idx)) !== -1 && count < max) {
    const start = Math.max(0, idx - 120);
    const end = Math.min(tdv.length, idx + 250);
    console.log(`[#${count+1}] ${tdv.slice(start, end).replace(/\s+/g, ' ')}`);
    idx += word.length;
    count++;
  }
}

searchWord('translationTransition', 5);
