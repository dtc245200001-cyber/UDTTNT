const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, 'thoitiensu');
const files = fs.readdirSync(dir);
console.log('Files in thoitiensu:', files);

// Let's create an html file to preview all 6 images side by side
const html = `
<!DOCTYPE html>
<html>
<head>
<title>Inspect Cube Faces</title>
<style>
  body { background: #222; color: #fff; font-family: sans-serif; padding: 20px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  .card { background: #333; padding: 10px; border-radius: 8px; text-align: center; }
  img { max-width: 100%; border: 2px solid gold; }
</style>
</head>
<body>
  <h1>Inspect Cube Faces</h1>
  <div class="grid">
    ${files.map(f => `
      <div class="card">
        <h3>${f}</h3>
        <img src="/thoitiensu/${f}" />
      </div>
    `).join('')}
  </div>
</body>
</html>
`;

fs.writeFileSync(path.join(__dirname, 'inspect_faces.html'), html);
console.log('Written inspect_faces.html');
