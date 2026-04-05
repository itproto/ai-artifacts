import matter from 'gray-matter';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { visit } from 'unist-util-visit';
import fs from 'fs';
import path from 'path';
import type { Node, Parent } from 'unist';

export type StoryStatus = 'backlog' | 'ready' | 'in-progress' | 'review' | 'done';
export type StoryLayer = 'frontend' | 'backend' | 'fullstack';
export type StoryType = 'story' | 'task';

export interface StoryFrontmatter {
  id: string;
  title: string;
  type: StoryType;
  status: StoryStatus;
  epic?: string;
  layer: StoryLayer;
  assignee?: string;
  points?: number;
  blockedBy?: string[];
}

export interface Story {
  frontmatter: StoryFrontmatter;
  content: string;
  filePath: string;
  sprint: string | null;
}

export function deriveSprintFromPath(filePath: string): string | null {
  const parts = filePath.split(path.sep);
  const sprintsIdx = parts.indexOf('sprints');
  if (sprintsIdx !== -1 && parts[sprintsIdx + 1]) {
    return parts[sprintsIdx + 1];
  }
  return null;
}

export function parseStoryFile(filePath: string): Story {
  const raw = fs.readFileSync(filePath, 'utf-8');
  const { data, content } = matter(raw);
  return {
    frontmatter: data as StoryFrontmatter,
    content,
    filePath,
    sprint: deriveSprintFromPath(filePath),
  };
}

export function collectMdFiles(dir: string): string[] {
  const results: string[] = [];
  if (!fs.existsSync(dir)) return results;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMdFiles(full));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(full);
    }
  }
  return results;
}

export function walkStories(jiraDir: string): Story[] {
  return ['backlog', 'sprints', 'done']
    .flatMap(dir => collectMdFiles(path.join(jiraDir, dir)))
    .map(parseStoryFile);
}

export function extractGherkin(content: string): string | null {
  const tree = unified().use(remarkParse).parse(content);
  let inAcceptanceCriteria = false;
  let gherkin: string | null = null;

  visit(tree as Parent, (node: Node) => {
    if (node.type === 'heading') {
      const heading = node as Parent & { depth: number };
      const text = heading.children
        ?.map((c: Node & { value?: string }) => c.value ?? '')
        .join('') ?? '';
      inAcceptanceCriteria = heading.depth === 2 && text === 'Acceptance Criteria';
    }
    if (
      inAcceptanceCriteria &&
      node.type === 'code' &&
      (node as Node & { lang?: string }).lang === 'gherkin'
    ) {
      gherkin = (node as Node & { value: string }).value;
    }
  });

  return gherkin;
}
