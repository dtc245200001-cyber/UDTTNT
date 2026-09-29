import { searchArtifacts } from '../src/utils/artifactSearch.js';
import { detectIntent } from '../src/utils/chatIntent.js';
import { getFollowUps } from '../src/utils/followUpSuggestions.js';
import { artifacts } from '../src/data/artifacts.js';

// Inject some bad data to match the bug description
const badArtifacts = [
  ...artifacts,
  {
    id: 'bad-1',
    name: 12345, // Bad data: name is number (causes primary.name.toLowerCase() crash)
    description: 'trong dong test crash',
    category: 'Test',
    period: 'Test',
  }
];

const testInputs = [
  "trong dong", 
  "trống đồng", 
  "Toi muon dat ve tham quan", 
  "gia ve", 
  "xin chao", 
  "", 
  "  ", 
  "a",
  123
];

console.log('--- TESTING detectIntent ---');
for (const input of testInputs) {
  try {
    const res = detectIntent(input, badArtifacts);
    console.log(`[PASS] detectIntent("${input}") -> ${res}`);
  } catch (err) {
    console.error(`[FAIL] detectIntent("${input}"):`, err.message);
    console.error(err.stack);
  }
}

console.log('\n--- TESTING getFollowUps ---');
for (const input of testInputs) {
  try {
    const res = getFollowUps({ userText: input, history: [{text: 'trong dong'}] });
    console.log(`[PASS] getFollowUps("${input}") ->`, res);
  } catch (err) {
    console.error(`[FAIL] getFollowUps("${input}"):`, err.message);
    console.error(err.stack);
  }
}

console.log('\n--- TESTING searchArtifacts ---');
for (const input of testInputs) {
  try {
    const res = searchArtifacts(badArtifacts, input, {events: [], tickets: []});
    console.log(`[PASS] searchArtifacts("${input}") -> Found ${res.matchedArtifacts?.length || 0}`);
  } catch (err) {
    console.error(`[FAIL] searchArtifacts("${input}"):`, err.message);
    console.error(err.stack);
  }
}
