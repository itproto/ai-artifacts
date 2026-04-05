import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { walkStories, extractGherkin } from './utils.js';
import type { Story } from './utils.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const jiraDir = path.resolve(__dirname, '..');

const STATUSES = ['backlog', 'ready', 'in-progress', 'review', 'done'] as const;

function hasGherkin(story: Story): boolean {
  return extractGherkin(story.content) !== null;
}

function storyRow(s: Story): string {
  const f = s.frontmatter;
  const sprint = s.sprint ? ` · ${s.sprint}` : '';
  const assignee = f.assignee ? ` · ${f.assignee}` : '';
  const points = f.points != null ? ` · ${f.points}pt` : '';
  const blocked = f.blockedBy?.length ? ` · blocked: ${f.blockedBy.join(', ')}` : '';
  return `- **${f.id}** ${f.title}${assignee}${points}${sprint}${blocked}`;
}

function generateBoard(): string {
  const stories = walkStories(jiraDir);
  const groups = Object.fromEntries(STATUSES.map(s => [s, [] as Story[]]));

  for (const story of stories) {
    const s = story.frontmatter.status;
    if (s in groups) groups[s].push(story);
  }

  const warnings = stories
    .filter(s =>
      s.frontmatter.type === 'story' &&
      (s.frontmatter.status === 'ready' || s.frontmatter.status === 'in-progress') &&
      !hasGherkin(s)
    )
    .map(s => `⚠ ${s.frontmatter.id} — "${s.frontmatter.title}" has no Gherkin scenarios`);

  const date = new Date().toISOString().slice(0, 10);
  let out = `# Board\n\n_Generated ${date}_\n\n`;

  for (const status of STATUSES) {
    out += `## ${status}\n\n`;
    if (groups[status].length === 0) {
      out += '_empty_\n\n';
    } else {
      out += groups[status].map(storyRow).join('\n') + '\n\n';
    }
  }

  if (warnings.length > 0) {
    out += `## ⚠ Warnings\n\n${warnings.join('\n')}\n`;
  }

  return out;
}

function validate(): boolean {
  const stories = walkStories(jiraDir);
  const violations = stories.filter(s => {
    const st = s.frontmatter.status;
    return (
      s.frontmatter.type === 'story' &&
      (st === 'ready' || st === 'in-progress') &&
      !hasGherkin(s)
    );
  });

  if (violations.length > 0) {
    console.error('Validation failed — stories missing Gherkin:');
    violations.forEach(v =>
      console.error(`  ${v.frontmatter.id}: ${v.frontmatter.title}`)
    );
    return false;
  }

  console.log('Validation passed — all ready/in-progress stories have Gherkin.');
  return true;
}

const args = process.argv.slice(2);

if (args.includes('--validate')) {
  process.exit(validate() ? 0 : 1);
} else {
  const board = generateBoard();
  const outPath = path.join(jiraDir, 'BOARD.md');
  fs.writeFileSync(outPath, board, 'utf-8');
  console.log(`BOARD.md generated at ${outPath}`);
}
