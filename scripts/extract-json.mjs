import fs from 'fs';

const scriptGen = fs.readFileSync('docs/script_general.js', 'utf8');

// Match `var script = { ... };`
const match = scriptGen.match(/var\s+script\s*=\s*(\{[\s\S]*\});?\s*\n/);
if (!match) {
  console.log('No var script = found!');
} else {
  console.log('Found var script! Length:', match[1].length);
  try {
    const data = JSON.parse(match[1]);
    console.log('Successfully parsed script JSON!');
    console.log('Root keys:', Object.keys(data));
    
    // Save to a formatted JSON file so we can inspect it easily
    fs.writeFileSync('scripts/3dvista_script_general.json', JSON.stringify(data, null, 2), 'utf8');
    console.log('Written to scripts/3dvista_script_general.json');
    
    // Let's summarize the tour structure
    if (data.data && data.data.tour) {
      console.log('Tour data keys:', Object.keys(data.data.tour));
    }
  } catch (err) {
    console.error('Error parsing JSON:', err.message);
    // Find where the syntax error is or if it has trailing code
  }
}

// Also check script.js
const scriptMain = fs.readFileSync('docs/script.js', 'utf8');
const matchMain = scriptMain.match(/var\s+script\s*=\s*(\{[\s\S]*\});?\s*\n/);
if (matchMain) {
  console.log('Found var script in script.js! Length:', matchMain[1].length);
  try {
    const dataMain = JSON.parse(matchMain[1]);
    fs.writeFileSync('scripts/3dvista_script_main.json', JSON.stringify(dataMain, null, 2), 'utf8');
    console.log('Written to scripts/3dvista_script_main.json');
  } catch (e) {
    console.log('Error parsing script.js JSON:', e.message);
  }
}
