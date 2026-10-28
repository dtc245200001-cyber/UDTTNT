import fs from 'fs';

// Let's inspect the files of gian2, gian3, gian4
const rooms = ['gian1', 'gian2', 'gian3', 'gian4', 'exterior', 'lobby'];
for (const r of rooms) {
  const p = `public/tours/thoitiensu/${r}`;
  if (fs.existsSync(p)) {
    console.log(r, fs.readdirSync(p));
  }
}
