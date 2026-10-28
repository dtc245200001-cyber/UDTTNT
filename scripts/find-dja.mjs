import fs from 'fs';

const tdv = fs.readFileSync('docs/tdvplayer.js', 'utf8');

const target = '.dJa=function';
const idx = tdv.indexOf(target);
if (idx !== -1) {
  console.log('Found dJa function:');
  console.log(tdv.slice(idx, idx + 1000));
} else {
  // search dJa
  let p = 0;
  while ((p = tdv.indexOf('dJa', p)) !== -1) {
    console.log(tdv.slice(p - 30, p + 80));
    p += 3;
  }
}
