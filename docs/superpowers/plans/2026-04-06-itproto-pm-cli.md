# @itproto/pm CLI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the `pm` CLI (`@itproto/pm`) with a single `pm init` command that scaffolds a `.pm/` project board in any directory.

**Architecture:** Bun runtime, Commander.js with typed options, registry-based lazy-loaded commands, services layer for all disk IO. ScaffoldService copies a bundled template directory and removes `.gitkeep` markers. Zod validates all CLI options at the boundary before any command runs.

**Tech Stack:** Bun ≥ 1.1.0, `@commander-js/extra-typings`, `zod`, `chalk`, `@biomejs/biome`, TypeScript strict + ESNext + bundler moduleResolution.

**Spec:** `docs/superpowers/specs/2026-04-06-itproto-pm-cli-design.md`

---

## File Map

| File | Role |
|---|---|
| `pm/package.json` | Package identity, scripts, dependencies |
| `pm/tsconfig.json` | TypeScript config |
| `pm/biome.json` | Lint + format config |
| `pm/bunfig.toml` | Bun config |
| `pm/src/version.ts` | Single source of truth for VERSION string |
| `pm/src/types/command.ts` | `CommandDef` type |
| `pm/src/schemas/options.ts` | Zod schema for global CLI options → `GlobalOpts` type |
| `pm/src/cli/output.ts` | `output()` + `InitResult` type — human/json output |
| `pm/src/services/scaffold.ts` | `ScaffoldService.init()` + `PmError` — all disk IO |
| `pm/src/commands/init/command.ts` | `initCommand` definition object |
| `pm/src/commands/init/index.ts` | `run()` — connects opts → service → output |
| `pm/src/commands/registry.ts` | `buildProgram()` — registers all commands on Commander |
| `pm/src/entrypoints/pm.ts` | Binary entrypoint — fast-path version check, imports registry |
| `pm/template/**` | Bundled skeleton copied on `pm init` |
| `pm/src/schemas/options.test.ts` | Tests for `GlobalOptsSchema` |
| `pm/src/cli/output.test.ts` | Tests for `output()` |
| `pm/src/services/scaffold.test.ts` | Tests for `ScaffoldService.init()` |
| `jira/EPICS.md` | Add EPIC-003 |
| `jira/backlog/TASK-003-pm-package-setup.md` | Tracking task |
| `jira/backlog/STORY-005-pm-init-command.md` | Tracking story |

---

## Task 1: jira/ tracking — add EPIC-003, TASK-003, STORY-005

**Files:**
- Modify: `jira/EPICS.md`
- Create: `jira/backlog/TASK-003-pm-package-setup.md`
- Create: `jira/backlog/STORY-005-pm-init-command.md`

- [ ] **Step 1: Add EPIC-003 to EPICS.md**

Replace the table in `jira/EPICS.md` with:

```markdown
# Epics

| ID | Title | Status |
|----|-------|--------|
| EPIC-001 | Core Todo Management | in-progress |
| EPIC-002 | User Authentication | backlog |
| EPIC-003 | @itproto/pm CLI | in-progress |
```

- [ ] **Step 2: Create TASK-003**

Create `jira/backlog/TASK-003-pm-package-setup.md`:

```markdown
---
id: TASK-003
title: Scaffold @itproto/pm package
type: task
status: in-progress
layer: backend
assignee: 
blockedBy: []
reason: 
---

## Description

Set up the `pm/` package directory with all config files:
`package.json`, `tsconfig.json`, `biome.json`, `bunfig.toml`.
Install dependencies and verify `bun link` works.

## Tasks
- [ ] Create pm/ directory structure
- [ ] Write package.json with @itproto/pm identity
- [ ] Write tsconfig.json (ESNext + bundler + strict)
- [ ] Write biome.json (tabs, lineWidth 100)
- [ ] Write bunfig.toml
- [ ] Run bun install
- [ ] Run bun link

## Notes
Runtime: Bun ≥ 1.1.0
```

- [ ] **Step 3: Create STORY-005**

Create `jira/backlog/STORY-005-pm-init-command.md`:

````markdown
---
id: STORY-005
title: pm init scaffolding command
type: story
status: ready
epic: EPIC-003
layer: backend
assignee: 
points: 3
blockedBy: [TASK-003]
reason: 
---

## User Story
As a developer, I can run `pm init` in any project directory
so that a `.pm/` project board is scaffolded instantly.

## Spec

`pm init` copies the bundled `template/` directory to `.pm/` in the
current working directory (or `--cwd`). Removes `.gitkeep` markers.
Supports `--dry-run` (preview only) and `--json` (machine-readable output).
Exits with code 1 if `.pm/` already exists.

## Acceptance Criteria

```gherkin
Feature: pm init

  Scenario: Initialize .pm/ in an empty project
    Given I am in a directory without a .pm/ folder
    When I run pm init
    Then a .pm/ directory is created
    And it contains backlog/, done/, closed/, templates/, examples/
    And no .gitkeep files are present

  Scenario: Reject init if .pm/ already exists
    Given I am in a directory with a .pm/ folder
    When I run pm init
    Then the command exits with code 1
    And .pm/ is unchanged

  Scenario: Dry-run previews without writing
    Given I am in a directory without a .pm/ folder
    When I run pm init --dry-run
    Then no .pm/ directory is created
    And the output shows what would be created
```

## Tasks
- [ ] Types, schemas, version
- [ ] output() utility
- [ ] ScaffoldService.init()
- [ ] init command + registry + entrypoint

## Notes
Spec: docs/superpowers/specs/2026-04-06-itproto-pm-cli-design.md
````

- [ ] **Step 4: Commit**

```bash
git add jira/EPICS.md jira/backlog/TASK-003-pm-package-setup.md jira/backlog/STORY-005-pm-init-command.md
git commit -m "chore(TASK-003): add EPIC-003, TASK-003, STORY-005 to jira backlog"
```

---

## Task 2: Package scaffold — pm/ config files

**Files:**
- Create: `pm/package.json`
- Create: `pm/tsconfig.json`
- Create: `pm/biome.json`
- Create: `pm/bunfig.toml`

- [ ] **Step 1: Create pm/package.json**

```json
{
  "name": "@itproto/pm",
  "version": "0.1.0",
  "type": "module",
  "bin": {
    "pm": "src/entrypoints/pm.ts"
  },
  "scripts": {
    "dev": "bun src/entrypoints/pm.ts",
    "test": "bun test",
    "lint": "biome check src/",
    "check": "biome check src/ && tsc --noEmit",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@commander-js/extra-typings": "^13.1.0",
    "chalk": "^5.4.0",
    "zod": "^3.24.0"
  },
  "devDependencies": {
    "@biomejs/biome": "^1.9.0",
    "@types/bun": "latest",
    "typescript": "^5.7.0"
  },
  "engines": {
    "bun": ">=1.1.0"
  }
}
```

- [ ] **Step 2: Create pm/tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "skipLibCheck": true,
    "isolatedModules": true,
    "noEmit": true,
    "allowImportingTsExtensions": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

- [ ] **Step 3: Create pm/biome.json**

```json
{
  "organizeImports": { "enabled": true },
  "linter": {
    "enabled": true,
    "rules": {
      "recommended": true,
      "correctness": {
        "noUnusedImports": "warn",
        "noUnusedVariables": "warn"
      }
    }
  },
  "formatter": {
    "enabled": true,
    "indentStyle": "tab",
    "indentWidth": 2,
    "lineWidth": 100
  }
}
```

- [ ] **Step 4: Create pm/bunfig.toml**

```toml
# Bun configuration for @itproto/pm
[test]
# test files: src/**/*.test.ts
```

- [ ] **Step 5: Install dependencies**

```bash
cd pm
bun install
```

Expected: `bun.lock` created, `node_modules/` populated.

- [ ] **Step 6: Verify typecheck runs (will fail on missing src — that's fine)**

```bash
cd pm
bun run typecheck
```

Expected: error about missing files or empty project — that's fine. Confirms tsc is wired up.

- [ ] **Step 7: Commit**

```bash
cd ..
git add pm/package.json pm/tsconfig.json pm/biome.json pm/bunfig.toml pm/bun.lock
git commit -m "chore(TASK-003): scaffold @itproto/pm package with config files"
```

---

## Task 3: Template directory

**Files:**
- Create: `pm/template/backlog/.gitkeep`
- Create: `pm/template/sprints/.gitkeep`
- Create: `pm/template/done/.gitkeep`
- Create: `pm/template/closed/.gitkeep`
- Create: `pm/template/templates/story.md`
- Create: `pm/template/templates/task.md`
- Create: `pm/template/examples/STORY-001-example.md`
- Create: `pm/template/examples/TASK-001-example.md`
- Create: `pm/template/examples/SPRINT.md`
- Create: `pm/template/EPICS.md`
- Create: `pm/template/DECISIONS.md`
- Create: `pm/template/README.md`

- [ ] **Step 1: Create empty dir markers**

Create four empty files (content is empty string, just the file path matters):
- `pm/template/backlog/.gitkeep`
- `pm/template/sprints/.gitkeep`
- `pm/template/done/.gitkeep`
- `pm/template/closed/.gitkeep`

- [ ] **Step 2: Create pm/template/templates/story.md**

```markdown
---
id: STORY-XXX
title: 
type: story
status: backlog
epic: EPIC-XXX
layer: frontend  # frontend | backend | fullstack
assignee: 
points: 
blockedBy: []
reason:  # for closed: cancelled, deferred, duplicate, etc.
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

- [ ] **Step 3: Create pm/template/templates/task.md**

```markdown
---
id: TASK-XXX
title: 
type: task
status: backlog
layer: frontend  # frontend | backend | fullstack
assignee: 
blockedBy: []
reason:  # for closed: cancelled, deferred, duplicate, etc.
---

## Description


## Tasks
- [ ] 

## Notes
```

- [ ] **Step 4: Create pm/template/examples/STORY-001-example.md**

````markdown
---
id: STORY-001
title: Example — view item list
type: story
status: backlog
epic: EPIC-001
layer: frontend
assignee: 
points: 3
blockedBy: []
reason: 
---

## User Story
As a user, I can view a list of items
so that I can see what needs to be done.

## Spec

Display all items from the API in a scrollable list. Show empty state when there are no items.

## Acceptance Criteria

```gherkin
Feature: Item list

  Scenario: View items when list is non-empty
    Given there are items in the system
    When I open the app
    Then I see a list of items

  Scenario: Empty state
    Given there are no items
    When I open the app
    Then I see an empty state message
```

## Tasks
- [ ] Create ItemList component
- [ ] Connect to /api/items endpoint
- [ ] Add empty state UI

## Notes
Delete this file or replace it with your first real story.
````

- [ ] **Step 5: Create pm/template/examples/TASK-001-example.md**

```markdown
---
id: TASK-001
title: Example — scaffold project
type: task
status: done
layer: fullstack
assignee: 
blockedBy: []
reason: 
---

## Description

Set up the project skeleton: directory structure, package.json, config files.

## Tasks
- [x] Create directory structure
- [x] Write package.json
- [x] Install dependencies

## Notes
Delete this file or replace it with your first real task.
```

- [ ] **Step 6: Create pm/template/examples/SPRINT.md**

```markdown
# Sprint 01 — YYYY-MM-DD / YYYY-MM-DD

## Goal
[One sentence describing what this sprint delivers]

## Team
- alice — frontend
- bob — backend

## In Progress
- STORY-001 (alice) — Example story

## Blocked

## Done
```

- [ ] **Step 7: Create pm/template/EPICS.md**

```markdown
# Epics

| ID | Title | Status |
|----|-------|--------|
| EPIC-001 | Example Epic | active |
```

- [ ] **Step 8: Create pm/template/DECISIONS.md**

```markdown
# Decisions

<!-- Record key architectural decisions here -->
<!-- Format: YYYY-MM-DD — decision and rationale -->
```

- [ ] **Step 9: Create pm/template/README.md**

```markdown
# .pm — Project Board

A git-native, AI-agent-friendly project backlog. Stories are markdown files.

## Workflow

1. Add epics to `EPICS.md`
2. Copy `templates/story.md` → `backlog/STORY-NNN-slug.md`
3. Write Gherkin in `## Acceptance Criteria` before moving to `ready`
4. Start sprint — move story to `sprints/sprint-NN/`
5. Done — move to `done/`

## Status Lifecycle

```
backlog → ready → in-progress → review → done
```

**`ready` gate:** story must have at least one Gherkin scenario before moving to `ready`.

## Directory Conventions

| Location | Meaning |
|----------|---------|
| `backlog/` | Not yet in a sprint |
| `sprints/sprint-NN/` | In sprint NN |
| `done/` | Completed |
| `closed/` | Cancelled or deferred — set `status: closed` and `reason:` field |

## Commit Convention

```
feat(STORY-001): add feature description
fix(STORY-002): correct bug description
chore(TASK-001): scaffold project
```
```

- [ ] **Step 10: Commit**

```bash
git add pm/template/
git commit -m "chore(TASK-003): add bundled template directory for pm init"
```

---

## Task 4: Core types and schemas

**Files:**
- Create: `pm/src/version.ts`
- Create: `pm/src/types/command.ts`
- Create: `pm/src/schemas/options.ts`
- Test: `pm/src/schemas/options.test.ts`

- [ ] **Step 1: Write failing tests for GlobalOptsSchema**

Create `pm/src/schemas/options.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import { GlobalOptsSchema } from './options.ts'

describe('GlobalOptsSchema', () => {
	test('applies defaults when given empty object', () => {
		const result = GlobalOptsSchema.parse({})
		expect(result.json).toBe(false)
		expect(result.dryRun).toBe(false)
		expect(typeof result.cwd).toBe('string')
		expect(result.cwd.length).toBeGreaterThan(0)
	})

	test('parses valid options', () => {
		const result = GlobalOptsSchema.parse({
			json: true,
			dryRun: true,
			cwd: '/tmp/project',
		})
		expect(result.json).toBe(true)
		expect(result.dryRun).toBe(true)
		expect(result.cwd).toBe('/tmp/project')
	})

	test('throws ZodError on invalid types', () => {
		expect(() => GlobalOptsSchema.parse({ json: 'yes' })).toThrow()
	})
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd pm
bun test src/schemas/options.test.ts
```

Expected: FAIL — `Cannot find module './options.ts'`

- [ ] **Step 3: Create pm/src/version.ts**

```typescript
export const VERSION = '0.1.0'
```

- [ ] **Step 4: Create pm/src/types/command.ts**

```typescript
export type CommandDef = {
	name: string
	description: string
	load: () => Promise<{ run: (rawOpts: Record<string, unknown>) => Promise<void> }>
}
```

- [ ] **Step 5: Create pm/src/schemas/options.ts**

```typescript
import { z } from 'zod'

export const GlobalOptsSchema = z.object({
	json: z.boolean().default(false),
	dryRun: z.boolean().default(false),
	cwd: z.string().default(process.cwd()),
})

export type GlobalOpts = z.infer<typeof GlobalOptsSchema>
```

- [ ] **Step 6: Run tests — verify they pass**

```bash
cd pm
bun test src/schemas/options.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 7: Commit**

```bash
git add pm/src/version.ts pm/src/types/command.ts pm/src/schemas/options.ts pm/src/schemas/options.test.ts
git commit -m "feat(STORY-005): add version, CommandDef type, and GlobalOptsSchema"
```

---

## Task 5: Output utility

**Files:**
- Create: `pm/src/cli/output.ts`
- Test: `pm/src/cli/output.test.ts`

- [ ] **Step 1: Write failing tests for output()**

Create `pm/src/cli/output.test.ts`:

```typescript
import { describe, expect, test } from 'bun:test'
import type { GlobalOpts } from '../schemas/options.ts'
import { type InitResult, output } from './output.ts'
// Note: `output` is a value import; `InitResult` is a type-only import

const baseOpts: GlobalOpts = { json: false, dryRun: false, cwd: '/tmp/project' }

const successResult: InitResult = {
	success: true,
	path: '/tmp/project/.pm',
	filesCreated: 12,
	dryRun: false,
}

const dryRunResult: InitResult = {
	success: true,
	path: '/tmp/project/.pm',
	filesCreated: 0,
	dryRun: true,
	dryRunFiles: ['README.md', 'EPICS.md'],
}

function captureLog(fn: () => void): string[] {
	const logs: string[] = []
	const orig = console.log
	console.log = (msg: string) => logs.push(msg)
	fn()
	console.log = orig
	return logs
}

describe('output', () => {
	test('json mode prints valid JSON to stdout', () => {
		const logs = captureLog(() => output(successResult, { ...baseOpts, json: true }))
		const parsed = JSON.parse(logs[0])
		expect(parsed.success).toBe(true)
		expect(parsed.filesCreated).toBe(12)
		expect(parsed.dryRun).toBe(false)
	})

	test('human mode prints initialized message', () => {
		const logs = captureLog(() => output(successResult, baseOpts))
		const combined = logs.join('\n')
		expect(combined).toContain('Initialized .pm/')
		expect(combined).toContain('backlog/')
	})

	test('human dry-run mode prints dry-run prefix', () => {
		const logs = captureLog(() => output(dryRunResult, { ...baseOpts, dryRun: true }))
		const combined = logs.join('\n')
		expect(combined).toContain('[dry-run]')
		expect(combined).toContain('No files written')
	})
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd pm
bun test src/cli/output.test.ts
```

Expected: FAIL — `Cannot find module './output.ts'`

- [ ] **Step 3: Create pm/src/cli/output.ts**

```typescript
import chalk from 'chalk'
import type { GlobalOpts } from '../schemas/options.ts'

export type InitResult = {
	success: boolean
	path: string
	filesCreated: number
	dryRun: boolean
	dryRunFiles?: string[]
}

export function output(result: InitResult, opts: GlobalOpts): void {
	if (opts.json) {
		console.log(JSON.stringify(result))
		return
	}
	if (result.dryRun) {
		printDryRun(result)
		return
	}
	printSuccess(result)
}

function printDryRun(result: InitResult): void {
	console.log(`[dry-run] Would create .pm/ in ${result.path}`)
	if (result.dryRunFiles) {
		console.log(`[dry-run] Would copy ${result.dryRunFiles.length} files from template`)
	}
	console.log('[dry-run] No files written.')
}

function printSuccess(result: InitResult): void {
	console.log(chalk.green('✓') + ' Initialized .pm/ project board')
	console.log('')
	console.log('  backlog/        ready for stories')
	console.log('  done/           completed work lands here')
	console.log('  closed/         cancelled or deferred')
	console.log('  templates/      story.md, task.md')
	console.log('  examples/       1 story, 1 task to get you started')
	console.log('')
	console.log('Next steps:')
	console.log('  1. Edit .pm/EPICS.md — add your epics')
	console.log('  2. Copy .pm/templates/story.md → .pm/backlog/STORY-001-slug.md')
	console.log('  3. Fill in the story and write Gherkin before moving to ready')
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd pm
bun test src/cli/output.test.ts
```

Expected: PASS — 3 tests

- [ ] **Step 5: Commit**

```bash
git add pm/src/cli/output.ts pm/src/cli/output.test.ts
git commit -m "feat(STORY-005): add output utility with human/json modes"
```

---

## Task 6: ScaffoldService

**Files:**
- Create: `pm/src/services/scaffold.ts`
- Test: `pm/src/services/scaffold.test.ts`

- [ ] **Step 1: Write failing tests for ScaffoldService.init()**

Create `pm/src/services/scaffold.test.ts`:

```typescript
import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, readdir, rm, stat } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { PmError, ScaffoldService } from './scaffold.ts'

const baseOpts = { json: false, dryRun: false }

describe('ScaffoldService.init', () => {
	let tmpDir: string

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), 'pm-test-'))
	})

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true })
	})

	test('creates .pm/ directory', async () => {
		const result = await ScaffoldService.init({ ...baseOpts, cwd: tmpDir })
		const s = await stat(join(tmpDir, '.pm'))
		expect(s.isDirectory()).toBe(true)
		expect(result.success).toBe(true)
		expect(result.dryRun).toBe(false)
	})

	test('filesCreated is greater than zero', async () => {
		const result = await ScaffoldService.init({ ...baseOpts, cwd: tmpDir })
		expect(result.filesCreated).toBeGreaterThan(0)
	})

	test('throws PmError if .pm/ already exists', async () => {
		await ScaffoldService.init({ ...baseOpts, cwd: tmpDir })
		await expect(
			ScaffoldService.init({ ...baseOpts, cwd: tmpDir }),
		).rejects.toBeInstanceOf(PmError)
	})

	test('dry-run returns result without creating .pm/', async () => {
		const result = await ScaffoldService.init({ ...baseOpts, dryRun: true, cwd: tmpDir })
		expect(result.dryRun).toBe(true)
		expect(result.filesCreated).toBe(0)
		await expect(stat(join(tmpDir, '.pm'))).rejects.toThrow()
	})

	test('no .gitkeep files present in .pm/ after init', async () => {
		await ScaffoldService.init({ ...baseOpts, cwd: tmpDir })
		const entries = await readdir(join(tmpDir, '.pm'), {
			recursive: true,
			withFileTypes: true,
		})
		const gitkeeps = entries.filter((e) => e.isFile() && e.name === '.gitkeep')
		expect(gitkeeps).toHaveLength(0)
	})

	test('throws PmError for non-existent cwd', async () => {
		await expect(
			ScaffoldService.init({ ...baseOpts, cwd: '/nonexistent/path/abc123' }),
		).rejects.toBeInstanceOf(PmError)
	})

	test('backlog/ directory exists in .pm/', async () => {
		await ScaffoldService.init({ ...baseOpts, cwd: tmpDir })
		const s = await stat(join(tmpDir, '.pm', 'backlog'))
		expect(s.isDirectory()).toBe(true)
	})
})
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd pm
bun test src/services/scaffold.test.ts
```

Expected: FAIL — `Cannot find module './scaffold.ts'`

- [ ] **Step 3: Create pm/src/services/scaffold.ts**

```typescript
import { cp, readdir, rm, stat } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import type { GlobalOpts } from '../schemas/options.ts'
import type { InitResult } from '../cli/output.ts'

// Resolves to pm/template/ regardless of how the binary is invoked
const TEMPLATE_DIR = new URL('../../template', import.meta.url).pathname

export class PmError extends Error {
	constructor(
		message: string,
		public readonly exitCode: number,
	) {
		super(message)
		this.name = 'PmError'
	}
}

export const ScaffoldService = {
	async init(opts: GlobalOpts): Promise<InitResult> {
		const targetDir = resolve(opts.cwd)
		const pmDir = join(targetDir, '.pm')

		// Verify cwd exists and is a directory
		const cwdStat = await stat(targetDir).catch(() => null)
		if (!cwdStat?.isDirectory()) {
			throw new PmError(`Error: directory not found: ${targetDir}`, 1)
		}

		const exists = await stat(pmDir)
			.then(() => true)
			.catch(() => false)
		if (exists) {
			throw new PmError(
				`Error: .pm/ already exists in ${targetDir}. Run with --force to overwrite (not yet implemented).`,
				1,
			)
		}

		const allFiles = await listFiles(TEMPLATE_DIR)
		const contentFiles = allFiles.filter((f) => !f.endsWith('.gitkeep'))

		if (opts.dryRun) {
			return {
				success: true,
				path: pmDir,
				filesCreated: 0,
				dryRun: true,
				dryRunFiles: contentFiles.map((f) => f.slice(TEMPLATE_DIR.length + 1)),
			}
		}

		await cp(TEMPLATE_DIR, pmDir, { recursive: true })

		// Remove .gitkeep markers — directories already created by cp
		const gitkeepFiles = allFiles.filter((f) => f.endsWith('.gitkeep'))
		for (const f of gitkeepFiles) {
			const rel = f.slice(TEMPLATE_DIR.length)
			await rm(join(pmDir, rel), { force: true })
		}

		return {
			success: true,
			path: pmDir,
			filesCreated: contentFiles.length,
			dryRun: false,
		}
	},
}

async function listFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { recursive: true, withFileTypes: true })
	return entries
		.filter((e) => e.isFile())
		.map((e) => join(e.parentPath, e.name))
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd pm
bun test src/services/scaffold.test.ts
```

Expected: PASS — 7 tests

- [ ] **Step 5: Run all tests**

```bash
cd pm
bun test
```

Expected: PASS — all tests in schemas, cli, services (10 total)

- [ ] **Step 6: Commit**

```bash
git add pm/src/services/scaffold.ts pm/src/services/scaffold.test.ts
git commit -m "feat(STORY-005): add ScaffoldService with PmError (TDD)"
```

---

## Task 7: Commands, registry, entrypoint, and integration

**Files:**
- Create: `pm/src/commands/init/command.ts`
- Create: `pm/src/commands/init/index.ts`
- Create: `pm/src/commands/registry.ts`
- Create: `pm/src/entrypoints/pm.ts`

- [ ] **Step 1: Create pm/src/commands/init/command.ts**

```typescript
import type { CommandDef } from '../../types/command.ts'

export const initCommand: CommandDef = {
	name: 'init',
	description: 'Initialize a .pm/ board in the current project',
	load: () => import('./index.ts'),
}
```

- [ ] **Step 2: Create pm/src/commands/init/index.ts**

```typescript
import { output } from '../../cli/output.ts'
import { GlobalOptsSchema } from '../../schemas/options.ts'
import { ScaffoldService } from '../../services/scaffold.ts'

export async function run(rawOpts: Record<string, unknown>): Promise<void> {
	const opts = GlobalOptsSchema.parse(rawOpts)
	const result = await ScaffoldService.init(opts)
	output(result, opts)
}
```

- [ ] **Step 3: Create pm/src/commands/registry.ts**

```typescript
import { Command } from '@commander-js/extra-typings'
import { VERSION } from '../version.ts'
import type { CommandDef } from '../types/command.ts'
import { PmError } from '../services/scaffold.ts'
import { initCommand } from './init/command.ts'

const COMMANDS: CommandDef[] = [initCommand]

export function buildProgram(): Command {
	const program = new Command('pm')
		.version(VERSION)
		.option('--json', 'output as JSON', false)
		.option('--dry-run', 'preview without writing', false)
		.option('--cwd <path>', 'working directory', process.cwd())

	for (const def of COMMANDS) {
		program
			.command(def.name)
			.description(def.description)
			.action(async () => {
				const rawOpts = program.opts()
				const mod = await def.load()
				try {
					await mod.run(rawOpts as Record<string, unknown>)
				} catch (err) {
					if (err instanceof PmError) {
						console.error(err.message)
						process.exit(err.exitCode)
					}
					throw err
				}
			})
	}

	return program
}
```

- [ ] **Step 4: Create pm/src/entrypoints/pm.ts**

```typescript
#!/usr/bin/env bun
import { VERSION } from '../version.ts'

// Fast-path: --version with zero module loading
if (process.argv[2] === '--version' || process.argv[2] === '-V') {
	console.log(VERSION)
	process.exit(0)
}

const { buildProgram } = await import('../commands/registry.ts')
const program = buildProgram()
program.parse()
```

- [ ] **Step 5: Smoke-test directly with bun**

```bash
cd pm
bun src/entrypoints/pm.ts --version
```

Expected output:
```
0.1.0
```

- [ ] **Step 6: Smoke-test help**

```bash
cd pm
bun src/entrypoints/pm.ts --help
```

Expected output contains:
```
Usage: pm [options] [command]

Options:
  -V, --version      output the version number
  --json             output as JSON
  --dry-run          preview without writing
  --cwd <path>       working directory
  -h, --help         display help for command

Commands:
  init               Initialize a .pm/ board in the current project
```

- [ ] **Step 7: Integration test — pm init in a temp dir**

```bash
TMPDIR=$(mktemp -d)
cd pm
bun src/entrypoints/pm.ts init --cwd "$TMPDIR"
ls "$TMPDIR/.pm"
```

Expected output:
```
✓ Initialized .pm/ project board
  ...
```

And `ls "$TMPDIR/.pm"` shows:
```
DECISIONS.md  EPICS.md  README.md  backlog  closed  done  examples  sprints  templates
```

- [ ] **Step 8: Integration test — dry-run**

```bash
TMPDIR2=$(mktemp -d)
cd pm
bun src/entrypoints/pm.ts --dry-run init --cwd "$TMPDIR2"
ls "$TMPDIR2"
```

Expected: dry-run output printed, `ls "$TMPDIR2"` shows empty directory (no `.pm/` created).

- [ ] **Step 9: Integration test — json output**

```bash
TMPDIR3=$(mktemp -d)
cd pm
bun src/entrypoints/pm.ts --json init --cwd "$TMPDIR3"
```

Expected output (single line of valid JSON):
```json
{"success":true,"path":".../.pm","filesCreated":12,"dryRun":false}
```

- [ ] **Step 10: Integration test — already-exists error**

```bash
cd pm
bun src/entrypoints/pm.ts init --cwd "$TMPDIR"
```

Expected: exits with code 1 and prints:
```
Error: .pm/ already exists in ...
```

- [ ] **Step 11: Run full test suite**

```bash
cd pm
bun test
```

Expected: all 10 tests pass.

- [ ] **Step 12: Typecheck**

```bash
cd pm
bun run typecheck
```

Expected: no errors.

- [ ] **Step 13: Lint**

```bash
cd pm
bun run lint
```

Expected: no errors (warnings for unused imports are OK during development).

- [ ] **Step 14: Register pm binary with bun link**

```bash
cd pm
bun link
```

Expected:
```
bun link: Registered "@itproto/pm"
To use @itproto/pm in a project, run: bun link @itproto/pm
```

- [ ] **Step 15: Verify pm binary works globally**

```bash
pm --version
```

Expected: `0.1.0`

- [ ] **Step 16: Commit**

```bash
git add pm/src/commands/ pm/src/entrypoints/
git commit -m "feat(STORY-005): add init command, registry, and entrypoint"
```

---

## Task 8: Update jira/ status

**Files:**
- Modify: `jira/backlog/TASK-003-pm-package-setup.md` — status: done, move to done/
- Modify: `jira/backlog/STORY-005-pm-init-command.md` — status: done, move to done/
- Modify: `jira/SPRINT.md` — reflect completed work

- [ ] **Step 1: Move TASK-003 to done/**

Update frontmatter `status: done` in `jira/backlog/TASK-003-pm-package-setup.md`, then move:

```bash
mv jira/backlog/TASK-003-pm-package-setup.md jira/done/TASK-003-pm-package-setup.md
```

- [ ] **Step 2: Move STORY-005 to done/**

Update frontmatter `status: done` in `jira/backlog/STORY-005-pm-init-command.md`, then move:

```bash
mv jira/backlog/STORY-005-pm-init-command.md jira/done/STORY-005-pm-init-command.md
```

- [ ] **Step 3: Update SPRINT.md**

Add to the Done section in `jira/SPRINT.md`:

```markdown
## Done
- TASK-001 — Scaffold frontend
- TASK-003 — Scaffold @itproto/pm package
- STORY-005 — pm init command
```

- [ ] **Step 4: Commit**

```bash
git add jira/
git commit -m "chore(STORY-005): mark TASK-003 and STORY-005 done in jira"
```
