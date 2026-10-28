import fs from 'fs';

const tdv = fs.readFileSync('docs/tdvplayer.js', 'utf8');

const target = 'define("lK"';
const idx = tdv.indexOf(target);
if (idx !== -1) {
  console.log(tdv.slice(idx, idx + 3000));
}
