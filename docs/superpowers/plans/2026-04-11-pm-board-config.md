# pm Board Config Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add YAML-configurable board views to `pm ls` via `.pm/boards/<name>.yaml`, selected with `--board <name>`.

**Architecture:** All logic extends the existing `pm ls` command. A new `board-config.ts` module handles YAML parsing and normalization. `ls/index.ts` gets a board-aware code path that filters, groups by config columns, and renders only configured fields. `ls/command.ts` gains `--board <name>` (default: `"default"`).

**Tech Stack:** Bun, TypeScript, `yaml` npm package, chalk, zod

---

## File Map

| Action | Path |
|---|---|
| Create | `pm/src/commands/ls/board-config.ts` |
| Modify | `pm/src/commands/ls/command.ts` |
| Modify | `pm/src/commands/ls/index.ts` |

---

## Task 1: Add yaml dependency

**Files:**
- Modify: `pm/package.json`

- [ ] **Step 1: Install yaml package**

```bash
cd pm && bun add yaml
```

Expected: `yaml` appears in `pm/package.json` dependencies and `pm/bun.lock` is updated.

- [ ] **Step 2: Commit**

```bash
git add pm/package.json pm/bun.lock
git commit -m "chore: add yaml dependency for board config parsing"
```

---

## Task 2: Create board-config.ts

**Files:**
- Create: `pm/src/commands/ls/board-config.ts`

- [ ] **Step 1: Create the file**

```typescript
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

export type ColumnDef =
	| string
	| { label: string; statuses: string[] };

export type BoardConfig = {
	source: string;
	columns: ColumnDef[];
	fields: string[];
	filters?: {
		assignee?: string;
		statuses?: string[];
		type?: "story" | "task";
	};
};

const DEFAULT_FIELDS = ["id", "title", "assignee", "points"];

export function normalizeBoardConfig(raw: Record<string, unknown>): BoardConfig {
	if (!Array.isArray(raw.columns) || raw.columns.length === 0) {
		throw new Error("board config: 'columns' is required and must be non-empty");
	}
	return {
		source: typeof raw.source === "string" ? raw.source : "active-sprint",
		columns: raw.columns as ColumnDef[],
		fields: Array.isArray(raw.fields) ? (raw.fields as string[]) : DEFAULT_FIELDS,
		filters:
			typeof raw.filters === "object" && raw.filters !== null
				? (raw.filters as BoardConfig["filters"])
				: undefined,
	};
}

export async function loadBoardConfig(cwd: string, name: string): Promise<BoardConfig> {
	const filePath = join(cwd, ".pm", "boards", `${name}.yaml`);
	let content: string;
	try {
		content = await readFile(filePath, "utf8");
	} catch {
		if (name === "default") {
			throw new Error(
				"Error: no default board found. Create .pm/boards/default.yaml to get started.",
			);
		}
		throw new Error(`board "${name}" not found at .pm/boards/${name}.yaml`);
	}
	let raw: unknown;
	try {
		raw = parse(content);
	} catch (e) {
		throw new Error(`invalid YAML in .pm/boards/${name}.yaml: ${(e as Error).message}`);
	}
	if (typeof raw !== "object" || raw === null) {
		throw new Error(`invalid board config in .pm/boards/${name}.yaml`);
	}
	return normalizeBoardConfig(raw as Record<string, unknown>);
}

// "in-progress" → { label: "In Progress", statuses: ["in-progress"] }
export function resolveColumn(col: ColumnDef): { label: string; statuses: string[] } {
	if (typeof col === "string") {
		const label = col
			.split("-")
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(" ");
		return { label, statuses: [col] };
	}
	return col;
}
```

- [ ] **Step 2: Commit**

```bash
git add pm/src/commands/ls/board-config.ts
git commit -m "feat(STORY-007): board-config — YAML parsing and BoardConfig type"
```

---

## Task 3: Add --board option to command.ts

**Files:**
- Modify: `pm/src/commands/ls/command.ts`

- [ ] **Step 1: Add --board option**

Replace the file contents with:

```typescript
import type { CommandDef } from "../../types/command.ts";

export const lsCommand: CommandDef = {
	name: "ls",
	description: "Show the current sprint board",
	setup(cmd) {
		cmd.option("--me", "show only your items (resolved from git config user.name)", false);
		cmd.option("--board <name>", "board config to use from .pm/boards/<name>.yaml", "default");
	},
	load: () => import("./index.ts"),
};
```

- [ ] **Step 2: Commit**

```bash
git add pm/src/commands/ls/command.ts
git commit -m "feat(STORY-007): ls --board <name> option"
```

---

## Task 4: Board-aware render path in ls/index.ts

**Files:**
- Modify: `pm/src/commands/ls/index.ts`

- [ ] **Step 1: Replace ls/index.ts with board-aware implementation**

```typescript
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import { z } from "zod";
import chalk from "chalk";
import { GlobalOptsSchema } from "../../schemas/options.ts";
import {
	type BoardItem,
	findActiveSprint,
	matchesAssignee,
	readSprintItems,
	resolveCurrentUser,
	STATUS_ICONS,
} from "../../services/board.ts";
import { parseFrontmatter } from "../../services/frontmatter.ts";
import { PmError } from "../../services/scaffold.ts";
import { type BoardConfig, loadBoardConfig, resolveColumn } from "./board-config.ts";

const LsOptsSchema = GlobalOptsSchema.extend({
	me: z.boolean().default(false),
	board: z.string().default("default"),
});

export async function run(rawOpts: Record<string, unknown>): Promise<void> {
	const opts = LsOptsSchema.parse(rawOpts);
	const config = await loadBoardConfig(opts.cwd, opts.board);

	const sprint = await findActiveSprint(opts.cwd);
	if (!sprint) {
		console.log("No active sprint");
		return;
	}

	let items = await loadSource(opts.cwd, config.source, sprint);
	items = applyFilters(items, config, opts.cwd, opts.me);

	console.log(renderBoardConfig(sprint, config, items));
}

async function loadSource(cwd: string, source: string, activeSprint: string): Promise<BoardItem[]> {
	if (source === "active-sprint") {
		return readSprintItems(cwd, activeSprint);
	}
	if (/^sprint-\d+$/.test(source)) {
		return readSprintItems(cwd, source);
	}
	if (source === "backlog") {
		return readDirItems(cwd, join(cwd, ".pm", "backlog"));
	}
	if (source === "all") {
		const [sprintItems, backlogItems] = await Promise.all([
			readSprintItems(cwd, activeSprint),
			readDirItems(cwd, join(cwd, ".pm", "backlog")),
		]);
		return [...sprintItems, ...backlogItems];
	}
	throw new PmError(`unknown board source: "${source}"`, 1);
}

async function readDirItems(cwd: string, dir: string): Promise<BoardItem[]> {
	// Re-use readSprintItems logic by reading the dir directly as a sprint-style directory.
	// readSprintItems only needs a dir path; we pass it as sprint so the join works.
	// Instead, call readSprintItems with a crafted sprint path — but readSprintItems takes
	// cwd + sprint name and joins them. For backlog, build the path manually.
	let files: string[];
	try {
		const dirents = await readdir(dir, { withFileTypes: true, encoding: "utf8" });
		files = dirents
			.filter((d) => d.isFile() && d.name.endsWith(".md"))
			.map((d) => d.name)
			.sort((a, b) => a.localeCompare(b));
	} catch {
		return [];
	}
	const contents = await Promise.all(files.map((f) => readFile(join(dir, f), "utf8")));
	const items: BoardItem[] = [];
	for (const content of contents) {
		const fm = parseFrontmatter(content);
		const id = typeof fm.id === "string" ? fm.id : undefined;
		if (!id) continue;
		const rawPoints = typeof fm.points === "string" ? Number.parseInt(fm.points, 10) : undefined;
		const points = rawPoints !== undefined && !Number.isNaN(rawPoints) ? rawPoints : undefined;
		items.push({
			id,
			title: typeof fm.title === "string" ? fm.title : "",
			type: fm.type === "task" ? "task" : "story",
			status: typeof fm.status === "string" ? fm.status : "backlog",
			assignee:
				typeof fm.assignee === "string" && fm.assignee !== "" ? fm.assignee : undefined,
			points,
			blockedBy: Array.isArray(fm.blockedBy) ? (fm.blockedBy as string[]) : [],
		});
	}
	return items;
}

function applyFilters(
	items: BoardItem[],
	config: BoardConfig,
	cwd: string,
	meFlag: boolean,
): BoardItem[] {
	let result = items;

	const assigneeFilter = config.filters?.assignee;
	if (meFlag || assigneeFilter === "me") {
		const user = resolveCurrentUser(cwd);
		if (!user) {
			throw new PmError(
				"Error: could not resolve current user from GitHub remote URL or git config user.name",
				1,
			);
		}
		result = result.filter((item) => matchesAssignee(item.assignee, user));
	} else if (assigneeFilter) {
		result = result.filter((item) => matchesAssignee(item.assignee, assigneeFilter));
	}

	if (config.filters?.statuses) {
		const allowed = config.filters.statuses;
		result = result.filter((item) => allowed.includes(item.status));
	}

	if (config.filters?.type) {
		const t = config.filters.type;
		result = result.filter((item) => item.type === t);
	}

	return result;
}

function renderBoardConfig(sprint: string, config: BoardConfig, items: BoardItem[]): string {
	const lines: string[] = [chalk.bold(`Sprint ${sprint}`), ""];

	for (const colDef of config.columns) {
		const { label, statuses } = resolveColumn(colDef);
		const colItems = items.filter((item) => statuses.includes(item.status));
		const icon = STATUS_ICONS[statuses[0]] ?? "·";
		lines.push(`${icon} ${chalk.bold(label)}`);
		for (const item of colItems) {
			lines.push(renderItemFields(item, config.fields));
		}
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}

function renderItemFields(item: BoardItem, fields: string[]): string {
	const parts: string[] = [];
	for (const field of fields) {
		switch (field) {
			case "id":
				parts.push(item.id.padEnd(10));
				break;
			case "title":
				parts.push(item.title.slice(0, 45).padEnd(45));
				break;
			case "assignee":
				parts.push((item.assignee ?? "").padEnd(12));
				break;
			case "points":
				parts.push(
					item.type === "story" && item.points != null ? `${item.points}pt` : "   ",
				);
				break;
		}
	}
	return `  ${parts.join("  ")}`.trimEnd();
}
```

**Note:** `STATUS_ICONS` must be exported from `board.ts`. If it's not already exported, add `export` to its declaration in `pm/src/services/board.ts`.

- [ ] **Step 2: Export STATUS_ICONS from board.ts if needed**

In `pm/src/services/board.ts`, find:
```typescript
const STATUS_ICONS: Record<string, string> = {
```
Change to:
```typescript
export const STATUS_ICONS: Record<string, string> = {
```

- [ ] **Step 3: Type-check**

```bash
cd pm && bun run typecheck
```

Expected: no errors.

- [ ] **Step 4: Smoke-test manually**

Create a minimal board config:
```bash
mkdir -p .pm/boards
cat > .pm/boards/default.yaml << 'EOF'
columns:
  - in-progress
  - blocked
  - review
  - done
EOF
```

Run:
```bash
bun run pm/src/entrypoints/pm.ts ls
```

Expected: board renders with In Progress / Blocked / Review / Done columns.

- [ ] **Step 5: Commit**

```bash
git add pm/src/commands/ls/index.ts pm/src/services/board.ts
git commit -m "feat(STORY-007): board-aware render path for pm ls"
```

---

## Task 5: Create default.yaml and update .pm board

**Files:**
- Create: `.pm/boards/default.yaml`

- [ ] **Step 1: Create default board config**

```bash
mkdir -p .pm/boards
```

Create `.pm/boards/default.yaml`:
```yaml
source: active-sprint

columns:
  - in-progress
  - blocked
  - review
  - done
  - backlog

fields:
  - id
  - title
  - assignee
  - points
```

- [ ] **Step 2: Update STORY-007 status to done**

Move `.pm/sprints/sprint-02/STORY-007-*.md` (or wherever the story file lives) — update its `status:` field to `done`.

- [ ] **Step 3: Commit**

```bash
git add .pm/boards/default.yaml .pm/sprints/
git commit -m "feat(STORY-007): add default.yaml board config, close story"
```

---

## Task 6: Push and open PR

- [ ] **Step 1: Push branch and open PR**

```bash
git push -u origin HEAD
gh pr create --title "feat(STORY-007): pm ls --board — YAML-configurable board views" --body "$(cat <<'EOF'
## Summary
- Adds `.pm/boards/<name>.yaml` board config (columns, fields, filters, source)
- `pm ls` loads `default.yaml`; `pm ls --board <name>` loads named board
- Supports shorthand columns (`- in-progress`) and explicit (`label: + statuses:`)
- Filters: assignee (including `me`), statuses, type
- Sources: active-sprint, backlog, all, sprint-NN

## Test plan
- [ ] `pm ls` renders board from `default.yaml`
- [ ] `pm ls --board <name>` renders named board
- [ ] Missing `default.yaml` → clear error message
- [ ] Missing named board → clear error message
- [ ] Invalid YAML → parse error with file path
- [ ] `filters.assignee: me` resolves current user
- [ ] Shorthand column `- in-progress` → label "In Progress"
- [ ] Explicit column `{ label: Custom, statuses: [in-progress, review] }` groups correctly

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```
