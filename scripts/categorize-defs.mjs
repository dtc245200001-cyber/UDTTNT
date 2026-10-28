import fs from 'fs';

const root = JSON.parse(fs.readFileSync('scripts/extracted_script_general.json', 'utf8'));
const defs = root.definitions || [];

const classes = {};
defs.forEach((d, idx) => {
  const cls = d.class || 'Unknown';
  if (!classes[cls]) classes[cls] = [];
  classes[cls].push({ index: idx, id: d.id, item: d });
});

console.log('Class distribution in definitions:');
for (const [cls, arr] of Object.entries(classes)) {
  console.log(`- ${cls}: ${arr.length}`);
}

// Write the parsed definitions to a categorized JSON
fs.writeFileSync('scripts/categorized_definitions.json', JSON.stringify(classes, null, 2));
console.log('Saved to scripts/categorized_definitions.json');
