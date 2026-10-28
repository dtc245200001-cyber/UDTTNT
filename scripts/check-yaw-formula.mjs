import fs from 'fs';

const tdv = fs.readFileSync('docs/tdvplayer.js', 'utf8');

// Search for sin and cos with yaw or angle
let p = 0;
while ((p = tdv.indexOf('Math.sin', p)) !== -1) {
  const snippet = tdv.slice(p - 50, p + 150);
  if (snippet.includes('yaw') || snippet.includes('pitch') || snippet.includes('fov')) {
    console.log('Snippet:', snippet.replace(/\s+/g, ' '));
  }
  p += 8;
}
