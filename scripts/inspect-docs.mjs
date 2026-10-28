import fs from 'fs';

const script = fs.readFileSync('docs/script.js', 'utf8');
const scriptGen = fs.readFileSync('docs/script_general.js', 'utf8');

console.log('--- Scanning script.js ---');
// Let's find labels, titles, urls, or object creations
const panoramaMatchesInScript = script.match(/["']([a-zA-Z0-9_\-\/]+\.(jpg|png|webp))["']/gi) || [];
console.log('Image references in script.js:', [...new Set(panoramaMatchesInScript)]);

console.log('--- Scanning script_general.js ---');
const panoramaMatchesInGen = scriptGen.match(/["']([a-zA-Z0-9_\-\/]+\.(jpg|png|webp))["']/gi) || [];
console.log('Image references in script_general.js:', [...new Set(panoramaMatchesInGen)]);

// Check for function definitions or object keys
const keysInGen = [];
const linesGen = scriptGen.split('\n');
for (let i = 0; i < linesGen.length; i++) {
  const line = linesGen[i];
  if (line.includes('title') || line.includes('label') || line.includes('yaw') || line.includes('pitch') || line.includes('fov')) {
    keysInGen.push(`${i+1}: ${line.trim().slice(0, 120)}`);
  }
}
console.log(`Total matching lines with title/label/yaw/pitch/fov in script_general: ${keysInGen.length}`);
console.log('First 25 matches:');
console.log(keysInGen.slice(0, 25).join('\n'));
