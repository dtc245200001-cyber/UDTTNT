import { searchArtifacts } from '../src/utils/artifactSearch.js';
import { artifacts } from '../src/data/artifacts.js';

// Inject some bad data to match the bug description
const badArtifacts = [
  ...artifacts,
  {
    id: 'bad-2',
    name: 99999, // Bad data
    description: 'super_unique_string_that_no_other_artifact_has_ever',
  }
];

const testInputs = [
  "super_unique_string_that_no_other_artifact_has_ever" // This will match bad-2 uniquely
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
