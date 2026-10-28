import fs from 'fs';

const tdv = fs.readFileSync('docs/tdvplayer.js', 'utf8');

const target = 'translationTransitionDuration",1E3)';
const idx = tdv.indexOf(target);
if (idx !== -1) {
  console.log('Found translation transition implementation:');
  console.log(tdv.slice(idx, idx + 2000));
}
