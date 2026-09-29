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
  },
  {
    id: 'bad-2',
    name: 99999, // Bad data
    description: 'kiem tra loi',
  }
];

const testInputs = [
  "kiem tra loi" // This will match bad-2 uniquely
];

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
