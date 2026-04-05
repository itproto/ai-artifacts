import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { walkStories, extractGherkin } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jiraDir = path.resolve(__dirname, '..');
const featuresDir = path.join(jiraDir, 'features');

if (!fs.existsSync(featuresDir)) {
  fs.mkdirSync(featuresDir, { recursive: true });
}

const stories = walkStories(jiraDir);
let count = 0;

for (const story of stories) {
  const gherkin = extractGherkin(story.content);
  if (!gherkin) continue;

  const outFile = path.join(featuresDir, `${story.frontmatter.id}.feature`);
  fs.writeFileSync(outFile, gherkin + '\n', 'utf-8');
  console.log(`  extracted: ${story.frontmatter.id}.feature`);
  count++;
}

console.log(`\nDone. ${count} feature file(s) written to jira/features/`);
