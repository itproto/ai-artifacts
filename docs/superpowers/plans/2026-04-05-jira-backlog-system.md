# Jira Backlog System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a clonable, git-native, AI-agent-friendly backlog system inside `jira/` with TypeScript scripts, example Todo app content, and AI agent config files.

**Architecture:** Markdown files with YAML frontmatter store stories/tasks. Two TypeScript scripts (`board.ts`, `extract-features.ts`) generate `BOARD.md` and `.feature` files respectively. Sprint membership is derived from directory path — no frontmatter field. AI agents are oriented via `CLAUDE.md`, `.cursor/rules/jira.mdc`, and `.github/copilot-instructions.md`.

**Tech Stack:** TypeScript, tsx (ESM-compatible ts runner), gray-matter (frontmatter), remark + unified + unist-util-visit (Gherkin AST extraction), vitest (tests)

**Spec:** `docs/superpowers/specs/2026-04-05-jira-backlog-system-design.md`

---

## File Map

| File | Responsibility |
|------|---------------|
| `jira/package.json` | Script deps, isolated from main project |
| `jira/tsconfig.json` | TS config for scripts |
| `jira/.gitignore` | Exclude features/, node_modules/ |
| `jira/scripts/utils.ts` | Frontmatter parse, file walk, sprint derivation, Gherkin extraction |
| `jira/scripts/utils.test.ts` | Vitest tests for utils |
| `jira/scripts/board.ts` | Generate BOARD.md, --validate flag |
| `jira/scripts/extract-features.ts` | Extract Gherkin → .feature files |
| `jira/SPRINT.md` | Current sprint context (AI reads first) |
| `jira/EPICS.md` | Flat epic list |
| `jira/DECISIONS.md` | Append-only ADR log |
| `jira/done/TASK-001-scaffold-frontend.md` | Example done task |
| `jira/sprints/sprint-01/TASK-002-scaffold-backend.md` | Example in-progress task |
| `jira/sprints/sprint-01/STORY-001-view-todos.md` | Example in-progress story |
| `jira/sprints/sprint-01/STORY-002-create-todo.md` | Example backlog story |
| `jira/backlog/STORY-003-user-registration.md` | Example backlog story |
| `jira/backlog/STORY-004-user-login.md` | Example backlog story |
| `jira/templates/story.md` | Blank story template |
| `jira/templates/task.md` | Blank task template |
| `jira/README.md` | Concise system docs |
| `CLAUDE.md` | Claude Code agent instructions |
| `.cursor/rules/jira.mdc` | Cursor agent instructions |
| `.github/copilot-instructions.md` | Copilot agent instructions |
| `.github/pull_request_template.md` | PR traceability template |
| `jira/.obsidian/app.json` | Obsidian vault config |
| `jira/.obsidian/community-plugins.json` | Enable dataview + kanban plugins |

---

## Task 1: Scaffold jira/ structure, package.json, tsconfig, .gitignore

**Files:**
- Create: `jira/package.json`
- Create: `jira/tsconfig.json`
- Create: `jira/.gitignore`
- Create: `jira/scripts/.gitkeep`
- Create: `jira/backlog/.gitkeep`
- Create: `jira/done/.gitkeep`
- Create: `jira/sprints/sprint-01/.gitkeep`
- Create: `jira/templates/.gitkeep`

- [ ] **Step 1: Create jira/package.json**

```json
{
  "name": "jira-scripts",
  "private": true,
  "type": "module",
  "scripts": {
    "board": "tsx scripts/board.ts",
    "validate": "tsx scripts/board.ts --validate",
    "features": "tsx scripts/extract-features.ts",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "gray-matter": "^4.0.3",
    "remark": "^15.0.0",
    "remark-parse": "^11.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.4.0",
    "unified": "^11.0.0",
    "unist-util-visit": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

- [ ] **Step 2: Create jira/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2020"],
    "strict": true,
    "esModuleInterop": true,
    "resolveJsonModule": true
  },
  "include": ["scripts/**/*"]
}
```

- [ ] **Step 3: Create jira/.gitignore**

```
features/
node_modules/
dist/
```

- [ ] **Step 4: Create placeholder .gitkeep files so empty dirs are tracked**

Create empty files:
- `jira/backlog/.gitkeep`
- `jira/done/.gitkeep`
- `jira/sprints/sprint-01/.gitkeep`
- `jira/templates/.gitkeep`

- [ ] **Step 5: Install dependencies**

Run from `jira/`:
```bash
cd jira && npm install
```

Expected: `node_modules/` created, no errors.

- [ ] **Step 6: Commit**

```bash
git add jira/package.json jira/tsconfig.json jira/.gitignore jira/backlog/.gitkeep jira/done/.gitkeep jira/sprints/sprint-01/.gitkeep jira/templates/.gitkeep
git commit -m "chore: scaffold jira/ folder structure and script dependencies"
```

---

## Task 2: utils.ts — write tests first, then implement

**Files:**
- Create: `jira/scripts/utils.ts`
- Create: `jira/scripts/utils.test.ts`

- [ ] **Step 1: Write the failing tests in jira/scripts/utils.test.ts**

```typescript
import { describe, it, expect } from 'vitest';
import path from 'path';
import { deriveSprintFromPath, extractGherkin } from './utils.js';

describe('deriveSprintFromPath', () => {
  it('extracts sprint name from sprints directory', () => {
    const p = path.join('jira', 'sprints', 'sprint-01', 'STORY-001.md');
    expect(deriveSprintFromPath(p)).toBe('sprint-01');
  });

  it('returns null for backlog', () => {
    const p = path.join('jira', 'backlog', 'STORY-002.md');
    expect(deriveSprintFromPath(p)).toBeNull();
  });

  it('returns null for done', () => {
    const p = path.join('jira', 'done', 'TASK-001.md');
    expect(deriveSprintFromPath(p)).toBeNull();
  });
});

describe('extractGherkin', () => {
  it('extracts gherkin block under Acceptance Criteria heading', () => {
    const content = `
## Acceptance Criteria

\`\`\`gherkin
Feature: View todos

  Scenario: User sees list
    Given I open the app
    Then I see todos
\`\`\`
`;
    const result = extractGherkin(content);
    expect(result).toContain('Feature: View todos');
    expect(result).toContain('Scenario: User sees list');
  });

  it('returns null when no gherkin block present', () => {
    const content = `## Acceptance Criteria\n\nNo scenarios written yet.`;
    expect(extractGherkin(content)).toBeNull();
  });

  it('ignores gherkin blocks outside Acceptance Criteria section', () => {
    const content = `
## Notes

\`\`\`gherkin
Feature: Should not be extracted
\`\`\`

## Acceptance Criteria

No gherkin here.
`;
    expect(extractGherkin(content)).toBeNull();
  });

  it('returns null for empty content', () => {
    expect(extractGherkin('')).toBeNull();
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

Run from `jira/`:
```bash
npm test
```

Expected: FAIL — `Cannot find module './utils.js'`

- [ ] **Step 3: Implement jira/scripts/utils.ts**

```typescript
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
```

- [ ] **Step 4: Run tests to confirm they pass**

Run from `jira/`:
```bash
npm test
```

Expected: All 6 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add jira/scripts/utils.ts jira/scripts/utils.test.ts
git commit -m "feat: add jira/scripts/utils.ts with frontmatter parser, sprint derivation, Gherkin extractor"
```

---

## Task 3: board.ts — board generator + validate flag

**Files:**
- Create: `jira/scripts/board.ts`

- [ ] **Step 1: Create jira/scripts/board.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add jira/scripts/board.ts
git commit -m "feat: add jira/scripts/board.ts — generates BOARD.md with kanban columns and --validate flag"
```

---

## Task 4: extract-features.ts — Gherkin extractor

**Files:**
- Create: `jira/scripts/extract-features.ts`

- [ ] **Step 1: Create jira/scripts/extract-features.ts**

```typescript
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
```

- [ ] **Step 2: Commit**

```bash
git add jira/scripts/extract-features.ts
git commit -m "feat: add jira/scripts/extract-features.ts — extracts Gherkin to .feature files via remark AST"
```

---

## Task 5: Example content — story/task files, SPRINT.md, EPICS.md, DECISIONS.md

**Files:**
- Create: `jira/SPRINT.md`
- Create: `jira/EPICS.md`
- Create: `jira/DECISIONS.md`
- Create: `jira/done/TASK-001-scaffold-frontend.md`
- Create: `jira/sprints/sprint-01/TASK-002-scaffold-backend.md`
- Create: `jira/sprints/sprint-01/STORY-001-view-todos.md`
- Create: `jira/sprints/sprint-01/STORY-002-create-todo.md`
- Create: `jira/backlog/STORY-003-user-registration.md`
- Create: `jira/backlog/STORY-004-user-login.md`

- [ ] **Step 1: Create jira/SPRINT.md**

```markdown
# Sprint 01 — 2026-04-06 / 2026-04-20

## Goal
Deliver a working Todo app: view and create todos, with user auth.

## Team
- alice — frontend
- bob — backend

## In Progress
- STORY-001 (alice) — View todos list
- TASK-002 (bob) — Scaffold backend

## Blocked
- STORY-002 — waiting on TASK-002

## Done
- TASK-001 — Scaffold frontend
```

- [ ] **Step 2: Create jira/EPICS.md**

```markdown
# Epics

| ID | Title | Status |
|----|-------|--------|
| EPIC-001 | Core Todo Management | in-progress |
| EPIC-002 | User Authentication | backlog |
```

- [ ] **Step 3: Create jira/DECISIONS.md**

```markdown
# Decisions

- 2026-04-05 — chose Supabase over custom Express auth (faster bootstrap for side project)
- 2026-04-05 — optimistic UI updates for todo creation (better UX, acceptable rollback complexity)
```

- [ ] **Step 4: Create jira/done/TASK-001-scaffold-frontend.md**

```markdown
---
id: TASK-001
title: Scaffold frontend (React + TypeScript + Tailwind + Vite)
type: task
status: done
layer: frontend
assignee: alice
---

## Description
Bootstrap the frontend project with the full stack: React, TypeScript, Tailwind CSS, Vite.

## Tasks
- [x] [FE] Init Vite project with React + TypeScript template
- [x] [FE] Install and configure Tailwind CSS
- [x] [FE] Set up path aliases in vite.config.ts
- [x] [FE] Delete boilerplate, confirm app renders

## Notes
Use `npm create vite@latest` with `react-ts` template.
```

- [ ] **Step 5: Create jira/sprints/sprint-01/TASK-002-scaffold-backend.md**

```markdown
---
id: TASK-002
title: Scaffold backend (Node.js + Express)
type: task
status: in-progress
layer: backend
assignee: bob
---

## Description
Bootstrap the backend API with Node.js, Express, and TypeScript.

## Tasks
- [x] [BE] Init Node.js project with TypeScript
- [x] [BE] Install Express + @types/express
- [ ] [BE] Create GET /api/todos stub returning empty array
- [ ] [BE] Confirm server starts on port 3001

## Notes
Keep it simple — no DB yet. In-memory array for now, DB added in STORY-002.
```

- [ ] **Step 6: Create jira/sprints/sprint-01/STORY-001-view-todos.md**

```markdown
---
id: STORY-001
title: View todos list (static data)
type: story
status: in-progress
epic: EPIC-001
layer: frontend
assignee: alice
points: 2
---

## User Story
As a user, I can see a list of todos on the main page
so that I know what I need to do.

## Spec
Renders from static mock data in `src/mocks/todos.ts`.
No API calls in this story — backend integration is STORY-002.

## Acceptance Criteria

```gherkin
Feature: View todos list

  Scenario: User sees todos on the main page
    Given I open the app
    Then I should see a list of todo items
    And each item shows its title and a completion checkbox

  Scenario: Empty state
    Given there are no todos in the mock data
    Then I should see the message "No todos yet"
```

## Tasks
- [ ] [FE] Create `src/mocks/todos.ts` with 3 example todos
- [ ] [FE] Create `TodoList` component
- [ ] [FE] Create `TodoItem` component
- [ ] [FE] Render list on main page
- [ ] [FE] Style with Tailwind

## Notes
Static data shape: `{ id: string; title: string; completed: boolean }[]`
```

- [ ] **Step 7: Create jira/sprints/sprint-01/STORY-002-create-todo.md**

```markdown
---
id: STORY-002
title: Create a todo item
type: story
status: backlog
epic: EPIC-001
layer: fullstack
assignee: alice
points: 5
blockedBy: [TASK-002]
---

## User Story
As a user, I can add a new todo
so that I can track new things I need to do.

## Spec
Input field + submit button. Calls POST /api/todos.
Optimistic UI update — item appears in list before API confirms.
On API error, item is removed and error message shown.

## Acceptance Criteria

```gherkin
Feature: Create a todo item

  Scenario: User creates a new todo
    Given I am on the todos page
    When I type "Buy milk" in the input field
    And I click "Add"
    Then "Buy milk" should appear in the todos list

  Scenario: Empty input is blocked
    Given I am on the todos page
    When I click "Add" with an empty input
    Then no todo should be created
    And I should see the error "Please enter a todo"
```

## Tasks
- [ ] [FE] Add text input + "Add" button to the page
- [ ] [FE] On submit, optimistically append to list
- [ ] [FE] Call POST /api/todos; on error remove item and show message
- [ ] [BE] Implement POST /api/todos — validate body, push to in-memory array, return 201
- [ ] [BE] Return 400 if title is missing or empty

## Notes
blockedBy TASK-002 — backend scaffold must exist first.
```

- [ ] **Step 8: Create jira/backlog/STORY-003-user-registration.md**

```markdown
---
id: STORY-003
title: User registration
type: story
status: backlog
epic: EPIC-002
layer: fullstack
assignee: bob
points: 5
---

## User Story
As a new visitor, I can create an account with email and password
so that I can have my own private todo list.

## Spec
Registration form: email + password + confirm password.
POST /api/auth/register. On success, redirect to todos page logged in.
Passwords hashed server-side (bcrypt). No email verification for now.

## Acceptance Criteria

```gherkin
Feature: User registration

  Scenario: Successful registration
    Given I am on the registration page
    When I enter a valid email and matching passwords
    And I click "Register"
    Then I should be redirected to the todos page
    And I should be logged in

  Scenario: Passwords do not match
    Given I am on the registration page
    When I enter passwords that do not match
    And I click "Register"
    Then I should see "Passwords do not match"
    And I should remain on the registration page

  Scenario: Email already in use
    Given a user already exists with email "alice@example.com"
    When I try to register with "alice@example.com"
    Then I should see "Email already in use"
```

## Tasks
- [ ] [FE] Create registration page with form
- [ ] [FE] Validate passwords match client-side
- [ ] [FE] POST /api/auth/register and handle response
- [ ] [BE] POST /api/auth/register endpoint
- [ ] [BE] Hash password with bcrypt
- [ ] [BE] Return 409 if email already registered

## Notes
Sprint 02 — not in current sprint.
```

- [ ] **Step 9: Create jira/backlog/STORY-004-user-login.md**

```markdown
---
id: STORY-004
title: User login / logout
type: story
status: backlog
epic: EPIC-002
layer: fullstack
assignee: bob
points: 3
blockedBy: [STORY-003]
---

## User Story
As a registered user, I can log in and out
so that my todos are private to me.

## Spec
Login form: email + password. POST /api/auth/login.
Session stored as JWT in httpOnly cookie. Logout clears the cookie.
Todos page redirects to login if not authenticated.

## Acceptance Criteria

```gherkin
Feature: User login and logout

  Scenario: Successful login
    Given I am a registered user with email "alice@example.com"
    When I log in with correct credentials
    Then I should be redirected to the todos page
    And I should see my todos

  Scenario: Wrong password
    Given I am a registered user
    When I log in with the wrong password
    Then I should see "Invalid email or password"

  Scenario: Logout
    Given I am logged in
    When I click "Logout"
    Then I should be redirected to the login page
    And I should not be able to access the todos page without logging in again
```

## Tasks
- [ ] [FE] Create login page with form
- [ ] [FE] POST /api/auth/login and handle JWT cookie
- [ ] [FE] Add "Logout" button, call DELETE /api/auth/session
- [ ] [FE] Redirect to /login if 401 on todos page
- [ ] [BE] POST /api/auth/login — verify password, issue JWT cookie
- [ ] [BE] DELETE /api/auth/session — clear cookie
- [ ] [BE] Auth middleware to protect /api/todos

## Notes
blockedBy STORY-003 — user must exist before login is meaningful.
Sprint 02 — not in current sprint.
```

- [ ] **Step 10: Remove .gitkeep files from now-populated directories**

```bash
rm jira/backlog/.gitkeep jira/done/.gitkeep jira/sprints/sprint-01/.gitkeep
```

- [ ] **Step 11: Commit**

```bash
git add jira/SPRINT.md jira/EPICS.md jira/DECISIONS.md \
  jira/done/ jira/sprints/ jira/backlog/
git commit -m "feat(TASK-001): add Todo app example content — 2 epics, 4 stories, 2 tasks across sprint-01 and backlog"
```

---

## Task 6: Templates

**Files:**
- Create: `jira/templates/story.md`
- Create: `jira/templates/task.md`

- [ ] **Step 1: Create jira/templates/story.md**

```markdown
---
id: STORY-XXX
title: 
type: story
status: backlog
epic: EPIC-XXX
layer: frontend | backend | fullstack
assignee: 
points: 
blockedBy: []
---

## User Story
As a [role], I can [action]
so that [value].

## Spec


## Acceptance Criteria

```gherkin
Feature: 

  Scenario: 
    Given 
    When 
    Then 
```

## Tasks
- [ ] 

## Notes

```

- [ ] **Step 2: Create jira/templates/task.md**

```markdown
---
id: TASK-XXX
title: 
type: task
status: backlog
layer: frontend | backend | fullstack
assignee: 
blockedBy: []
---

## Description


## Tasks
- [ ] 

## Notes

```

- [ ] **Step 3: Remove templates .gitkeep and commit**

```bash
rm jira/templates/.gitkeep
git add jira/templates/
git commit -m "feat: add story and task templates"
```

---

## Task 7: Run scripts and verify output

**Files:**
- Generated: `jira/BOARD.md`

- [ ] **Step 1: Run board generator from jira/**

```bash
cd jira && npm run board
```

Expected output:
```
BOARD.md generated at /path/to/jira/BOARD.md
```

- [ ] **Step 2: Inspect BOARD.md — verify it looks correct**

Open `jira/BOARD.md`. Confirm:
- Columns: backlog, ready, in-progress, review, done
- `done` column shows TASK-001
- `in-progress` column shows TASK-002 and STORY-001
- `backlog` column shows STORY-002, STORY-003, STORY-004
- No `⚠ Warnings` — STORY-001 has Gherkin; TASK-002 is a task (exempt from Gherkin gate)

- [ ] **Step 3: Run feature extractor**

```bash
npm run features
```

Expected output:
```
  extracted: STORY-001.feature
  extracted: STORY-002.feature
  extracted: STORY-003.feature
  extracted: STORY-004.feature

Done. 4 feature file(s) written to jira/features/
```

- [ ] **Step 4: Spot-check a .feature file**

```bash
cat jira/features/STORY-001.feature
```

Expected: clean Gherkin, no markdown fences, no frontmatter.

- [ ] **Step 5: Run validate — expect failure (TASK-002 and STORY-001 in-progress without complete Gherkin on tasks)**

```bash
npm run validate
```

Note: TASK-002 is `in-progress` but has no Gherkin — tasks don't require Gherkin, but the validate script checks all `ready/in-progress` items. This is acceptable behaviour for tasks. If this is noisy, note it as a known limitation in README.

- [ ] **Step 6: Commit BOARD.md**

```bash
git add jira/BOARD.md
git commit -m "chore: generate initial BOARD.md"
```

---

## Task 8: jira/README.md

**Files:**
- Create: `jira/README.md`

- [ ] **Step 1: Create jira/README.md**

```markdown
# Jira — Spec-Driven Backlog System

A git-native, AI-agent-friendly project backlog. Stories are markdown files.
The pipeline: **idea → epic → story → Gherkin → `.feature` files**.

---

## Workflow

1. **New epic?** Add a row to `EPICS.md`
2. **New story?** Copy `templates/story.md`, save to `backlog/STORY-NNN-slug.md`
3. **Write Gherkin** in `## Acceptance Criteria` before moving to `ready`
4. **Start sprint** — move story file to `sprints/sprint-NN/`, update `SPRINT.md`
5. **Implement** — update task checkboxes as you go
6. **Done** — move file to `done/`, update `SPRINT.md`

---

## Directory Conventions

| Location | Meaning |
|----------|---------|
| `backlog/` | Not yet in a sprint |
| `sprints/sprint-NN/` | In sprint NN — directory is source of truth |
| `done/` | Completed and archived |
| `features/` | **Generated** — do not edit; run `npm run features` |

---

## Story Status Lifecycle

```
backlog → ready → in-progress → review → done
```

**`ready` gate:** story must have at least one Gherkin scenario in
`## Acceptance Criteria` before moving to `ready`.

---

## Scripts

Run from this directory (`jira/`):

| Command | What it does |
|---------|-------------|
| `npm run board` | Regenerate `BOARD.md` from all story frontmatter |
| `npm run validate` | Exit 1 if any ready/in-progress story has no Gherkin |
| `npm run features` | Extract Gherkin → `features/*.feature` (gitignored) |
| `npm test` | Run utils unit tests |

---

## Frontmatter Fields

| Field | Required | Values |
|-------|----------|--------|
| `id` | yes | STORY-NNN / TASK-NNN |
| `title` | yes | Short imperative string |
| `type` | yes | `story` \| `task` |
| `status` | yes | `backlog` \| `ready` \| `in-progress` \| `review` \| `done` |
| `epic` | story: yes / task: no | EPIC-NNN |
| `layer` | yes | `frontend` \| `backend` \| `fullstack` |
| `assignee` | no | name string |
| `points` | no | number (informal) |
| `blockedBy` | no | `[STORY-NNN, TASK-NNN, ...]` |

---

## Commit Convention

```
feat(STORY-001): add TodoList component
fix(STORY-003): correct empty state message
chore(TASK-001): scaffold Vite + Tailwind
docs(STORY-002): add missing Gherkin scenario
```

---

## Obsidian (Optional)

Open `jira/` as an Obsidian vault. Install the **Dataview** and **Kanban**
community plugins. Dataview lets you query story frontmatter as a database;
Kanban gives drag-and-drop status changes.

Example Dataview query (paste into any note):
```dataview
TABLE title, status, assignee, points
FROM "sprints/sprint-01"
SORT status ASC
```

---

## Adding BDD Test Runner

`features/*.feature` files are ready for any Cucumber-compatible runner:

```bash
# Playwright + Cucumber (recommended for frontend)
npm install -D @cucumber/cucumber @playwright/test
```

Step definitions live in your main project, not here.
```

- [ ] **Step 2: Commit**

```bash
git add jira/README.md
git commit -m "docs: add jira/README.md — system overview, workflow, commands, frontmatter reference"
```

---

## Task 9: AI agent config files

**Files:**
- Create: `CLAUDE.md`
- Create: `.cursor/rules/jira.mdc`
- Create: `.github/copilot-instructions.md`
- Create: `.github/pull_request_template.md`

- [ ] **Step 1: Create CLAUDE.md at project root**

```markdown
# Claude Code — Project Instructions

## Project Management System

This project uses a file-based backlog in the `jira/` folder.

### Before starting any work session
1. Read `jira/SPRINT.md` — this is the current sprint state
2. Find the relevant story file in `jira/sprints/<sprint>/` or `jira/backlog/`
3. Read the story's `## Acceptance Criteria` — Gherkin is the source of truth for behaviour

### Story lifecycle rules
- Do not start implementing a story that has no Gherkin scenarios
- Move a story file to `jira/done/` when implementation is complete
- Update `jira/SPRINT.md` when a story moves to done
- Do not edit files in `jira/features/` — they are generated

### Commit format (Conventional Commits)
```
feat(STORY-001): add TodoList component
fix(STORY-003): correct empty state message
chore(TASK-001): scaffold Vite + Tailwind
docs(STORY-002): add missing Gherkin scenario
```

### Running jira scripts (from `jira/`)
- `npm run board` — regenerate BOARD.md
- `npm run validate` — check all in-progress stories have Gherkin
- `npm run features` — extract Gherkin to jira/features/*.feature

### Adding a new story
1. Copy `jira/templates/story.md`
2. Save to `jira/backlog/STORY-NNN-slug.md`
3. Fill in frontmatter and write Gherkin before moving to `ready`
```

- [ ] **Step 2: Create .cursor/rules/jira.mdc**

```markdown
---
description: Jira backlog system rules for this project
alwaysApply: true
---

# Project Management System

This project uses a file-based backlog in the `jira/` folder.

## Before starting any work session
1. Read `jira/SPRINT.md` — current sprint state, team assignments, blockers
2. Find the story file in `jira/sprints/<sprint>/` (active) or `jira/backlog/`
3. Read `## Acceptance Criteria` in the story — Gherkin is the source of truth

## Rules
- Do NOT implement a story without Gherkin scenarios in Acceptance Criteria
- Do NOT edit files in `jira/features/` — they are generated by `npm run features`
- Move story to `jira/done/` when complete; update `jira/SPRINT.md`
- Sprint membership = directory location, not a frontmatter field

## Commit format
```
feat(STORY-001): description
fix(STORY-002): description
chore(TASK-001): description
```

## Scripts (run from `jira/`)
- `npm run board` — regenerate BOARD.md
- `npm run validate` — check in-progress stories have Gherkin (exits 1 on fail)
- `npm run features` — extract Gherkin → jira/features/*.feature
```

- [ ] **Step 3: Create .github/copilot-instructions.md**

```markdown
# GitHub Copilot — Project Instructions

## Project Management

This project tracks work in `jira/`. Always orient yourself before suggesting code.

### Start here
- Read `jira/SPRINT.md` for current sprint context and team assignments
- Active story files are in `jira/sprints/<sprint>/`
- Backlog stories are in `jira/backlog/`

### Behaviour rules
- The `## Acceptance Criteria` section in a story contains Gherkin scenarios — these define what to build
- Do not suggest implementing a story that has no Gherkin scenarios
- `jira/features/` is auto-generated — never suggest edits to those files
- When a story is complete: move the file to `jira/done/`, update `jira/SPRINT.md`

### Commit messages
Follow Conventional Commits with story ID as scope:
- `feat(STORY-001): add TodoList component`
- `fix(STORY-003): correct empty state message`
- `chore(TASK-001): scaffold project`

### jira/ scripts (run from `jira/`)
- `npm run board` — regenerate BOARD.md from frontmatter
- `npm run validate` — check stories have Gherkin before merging
- `npm run features` — generate .feature files from Gherkin in stories
```

- [ ] **Step 4: Create .github/pull_request_template.md**

```markdown
## Story
<!-- Required: ID of the story this PR implements -->
Closes STORY-

## Changes
-

## Gherkin scenarios covered
<!-- List the scenario titles from the story's Acceptance Criteria -->
-

## Checklist
- [ ] Story has Gherkin scenarios in `## Acceptance Criteria`
- [ ] `npm run validate` passes (run from `jira/`)
- [ ] `npm run features` run to regenerate `.feature` files
- [ ] SPRINT.md updated if story is now done
- [ ] Story file moved to `jira/done/` if complete
```

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md .cursor/rules/jira.mdc .github/copilot-instructions.md .github/pull_request_template.md
git commit -m "feat: add AI agent config files — CLAUDE.md, Cursor rules, Copilot instructions, PR template"
```

---

## Task 10: Obsidian config

**Files:**
- Create: `jira/.obsidian/app.json`
- Create: `jira/.obsidian/community-plugins.json`

- [ ] **Step 1: Create jira/.obsidian/app.json**

```json
{
  "promptDelete": false,
  "trashOption": "local",
  "alwaysUpdateLinks": true,
  "newFileLocation": "folder",
  "newFileFolderPath": "backlog"
}
```

- [ ] **Step 2: Create jira/.obsidian/community-plugins.json**

```json
["dataview", "obsidian-kanban"]
```

- [ ] **Step 3: Commit**

```bash
git add jira/.obsidian/
git commit -m "feat: add Obsidian vault config with dataview and kanban plugin settings"
```

---

## Task 11: Final integration check + tidy

- [ ] **Step 1: Run full test suite**

Run from `jira/`:
```bash
npm test
```

Expected: all tests PASS.

- [ ] **Step 2: Run board to regenerate BOARD.md with final content**

```bash
npm run board
```

Expected: BOARD.md updated with all 6 example stories/tasks in correct columns.

- [ ] **Step 3: Verify git status is clean**

```bash
git status
```

Expected: only `jira/BOARD.md` modified (from regeneration). Stage and commit.

```bash
git add jira/BOARD.md
git commit -m "chore: regenerate BOARD.md with complete example content"
```

- [ ] **Step 4: Confirm jira/features/ is gitignored**

```bash
git status jira/features/
```

Expected: nothing listed (gitignored).

- [ ] **Step 5: Confirm node_modules/ is gitignored**

```bash
git status jira/node_modules/
```

Expected: nothing listed (gitignored).

- [ ] **Step 6: Final smoke test — run features extraction**

```bash
npm run features
```

Expected: 4 `.feature` files written to `jira/features/`. Open one and confirm it contains clean Gherkin with no markdown artifacts.
