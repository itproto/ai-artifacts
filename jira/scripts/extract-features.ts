import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { walkStories, extractGherkin } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jiraDir = path.resolve(__dirname, '..');
const featuresDir = path.join(jiraDir, 'features');

try {
  if (!fs.existsSync(featuresDir)) {
    fs.mkdirSync(featuresDir, { recursive: true });
  }

  const stories = walkStories(jiraDir);
  const writtenIds = new Set<string>();
  let count = 0;

  for (const story of stories) {
    const gherkin = extractGherkin(story.content);
    if (!gherkin) continue;

    const outFile = path.join(featuresDir, `${story.frontmatter.id}.feature`);
    try {
      fs.writeFileSync(outFile, gherkin + '\n', 'utf-8');
      console.log(`  extracted: ${story.frontmatter.id}.feature`);
      writtenIds.add(story.frontmatter.id);
      count++;
    } catch (writeErr) {
      console.error(`  failed: ${story.frontmatter.id}.feature —`, (writeErr as Error).message);
    }
  }

  // Remove stale .feature files not backed by a current story
  for (const file of fs.readdirSync(featuresDir)) {
    if (file.endsWith('.feature') && !writtenIds.has(file.replace('.feature', ''))) {
      fs.unlinkSync(path.join(featuresDir, file));
      console.log(`  removed stale: ${file}`);
    }
  }

  console.log(`\nDone. ${count} feature file(s) written to jira/features/`);
} catch (err) {
  console.error('Error extracting features:', (err as Error).message);
  process.exit(1);
}
