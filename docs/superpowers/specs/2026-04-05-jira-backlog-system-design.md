# Jira Folder — Spec-Driven Backlog System

**Date:** 2026-04-05  
**Status:** approved  
**Author:** Oleks

---

## 1. Goal

A clonable, git-native, AI-agent-friendly backlog system that supports a
spec-driven development workflow: idea → epic → story → BDD spec → runnable
`.feature` files. Designed for 1-3 devs on a side project using a lightweight
Scrumish cadence (no ceremonies, loose sprints).

All changes are confined to the `jira/` folder and a small set of root-level
AI config files (`CLAUDE.md`, `.cursor/rules`,
`.github/copilot-instructions.md`, `.github/pull_request_template.md`).

---

## 2. Folder Structure

```
project-root/
├── CLAUDE.md
├── .cursor/
│   └── rules
├── .github/
│   ├── copilot-instructions.md
│   └── pull_request_template.md
└── jira/
    ├── README.md
    ├── SPRINT.md
    ├── BOARD.md                  # generated — do not edit
    ├── EPICS.md
    ├── DECISIONS.md
    ├── backlog/                  # stories not yet assigned to a sprint
    ├── sprints/
    │   └── sprint-01/            # directory = sprint membership
    ├── done/                     # archived completed stories
    ├── features/                 # generated .feature files — do not edit
    ├── scripts/
    │   ├── board.ts
    │   ├── extract-features.ts
    │   └── utils.ts
    └── templates/
        ├── story.md
        └── task.md
```

### Directory conventions

| Directory | Meaning |
|-----------|---------|
| `backlog/` | Story exists, not yet in a sprint |
| `sprints/sprint-NN/` | Story is in sprint NN (directory = sprint membership) |
| `done/` | Story is complete and archived |
| `features/` | Generated — never edit; owned by `extract-features.ts` |

---

## 3. File Formats

### 3.1 SPRINT.md

Manually maintained. AI agents read this first. Updated at the start of each
work session.

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

### 3.2 EPICS.md

Flat file. No per-epic `.md` files.

```markdown
# Epics

| ID | Title | Status |
|----|-------|--------|
| EPIC-001 | Core Todo Management | in-progress |
| EPIC-002 | User Authentication | backlog |
```

### 3.3 DECISIONS.md

One-liner ADRs. Append-only.

```markdown
# Decisions

- 2026-04-05 — using Supabase over custom Express auth (faster bootstrap)
- 2026-04-06 — optimistic UI updates for todo creation
```

### 3.4 Story file

**Frontmatter fields:**

| Field | Values | Notes |
|-------|--------|-------|
| `id` | STORY-NNN | Unique, sequential |
| `title` | string | Short imperative |
| `type` | story \| task | |
| `status` | backlog \| ready \| in-progress \| review \| done | |
| `epic` | EPIC-NNN | Tag only, no linked file |
| `layer` | frontend \| backend \| fullstack | |
| `assignee` | name string | |
| `points` | number | Optional, informal |
| `sprint` | sprint-NN | Redundant with directory; kept for Dataview queries |
| `blockedBy` | [STORY-NNN, ...] | Remove when block clears |

**`ready` status gate:** a story may only move to `ready` when the
Acceptance Criteria section contains at least one Gherkin scenario. The board
script warns on violations.

**Body structure:**

```markdown
---
id: STORY-001
title: View todos list
type: story
status: in-progress
epic: EPIC-001
layer: frontend
assignee: alice
points: 2
sprint: sprint-01
---

## User Story
As a user, I can see a list of todos on the main page
so that I know what I need to do.

## Spec
Renders from static mock data. No API calls — backend integration is STORY-002.

## Acceptance Criteria
​```gherkin
Feature: View todos list

  Scenario: User sees todos on the main page
    Given I open the app
    Then I should see a list of todo items
    And each item shows its title and a completion checkbox

  Scenario: Empty state
    Given there are no todos
    Then I should see "No todos yet" message
​```

## Tasks
- [ ] [FE] Create TodoList component
- [ ] [FE] Create TodoItem component
- [ ] [FE] Add static mock data
- [ ] [FE] Style with Tailwind

## Notes
Use src/mocks/todos.ts for static data.
```

**Fullstack story tasks use `[FE]` / `[BE]` prefixes:**

```markdown
## Tasks
- [ ] [FE] Add input + submit UI
- [ ] [FE] Wire to POST /api/todos
- [ ] [BE] POST /api/todos endpoint
- [ ] [BE] Persist to DB
```

### 3.5 Task file

Same frontmatter as story, `type: task`, no `epic` required.

---

## 4. Example Content (Todo App)

### Sprint 01 stories

| ID | Title | Layer | Assignee | Points | Status |
|----|-------|-------|----------|--------|--------|
| TASK-001 | Scaffold frontend (React+TS+Tailwind+Vite) | frontend | alice | — | done |
| TASK-002 | Scaffold backend (Node+Express) | backend | bob | — | in-progress |
| STORY-001 | View todos list (static data) | frontend | alice | 2 | in-progress |
| STORY-002 | Create a todo item | fullstack | alice | 5 | backlog |
| STORY-003 | User registration | fullstack | bob | 5 | backlog |
| STORY-004 | User login / logout | fullstack | bob | 3 | backlog |

STORY-002 is blocked by TASK-002.

---

## 5. TypeScript Scripts

All scripts live in `jira/scripts/`. Run with `npx ts-node jira/scripts/<name>.ts`.

### 5.1 `board.ts`

Reads all `.md` files in `backlog/`, `sprints/`, and `done/`. Parses YAML
frontmatter. Generates `jira/BOARD.md` with:

- Kanban columns: backlog | ready | in-progress | review | done
- Stories grouped by column, showing id, title, assignee, points
- Warning list: stories with `status: ready` or `in-progress` that have no
  Gherkin scenarios

### 5.2 `extract-features.ts`

Reads all story `.md` files. Extracts fenced ` ```gherkin ` blocks from
`## Acceptance Criteria` sections. Writes one `.feature` file per story to
`jira/features/STORY-NNN.feature`. Skips stories with no Gherkin.

Output files are committed to git. Any BDD runner (Playwright + Cucumber,
Vitest + Cucumber) consumes them from `jira/features/`.

### 5.3 `utils.ts`

Shared helpers: frontmatter parser, file walker, Gherkin extractor regex.
Uses `gray-matter` for frontmatter parsing.

### Dependencies

A `jira/package.json` owns script dependencies — isolated from the main
project's `package.json`:

```json
{
  "name": "jira-scripts",
  "private": true,
  "scripts": {
    "board": "ts-node scripts/board.ts",
    "features": "ts-node scripts/extract-features.ts"
  },
  "devDependencies": {
    "gray-matter": "^4.0.3",
    "typescript": "^5.x",
    "ts-node": "^10.x",
    "@types/node": "^20.x"
  }
}
```

Run from `jira/`: `npm run board` or `npm run features`.

---

## 6. AI Agent Config Files

All three files share the same core instructions, formatted for each tool.

**Core instructions conveyed:**

1. Always read `jira/SPRINT.md` first for current sprint context
2. Story files live in `jira/sprints/<sprint>/` (active) or `jira/backlog/`
3. `jira/features/` is generated — never edit directly
4. Commit format: `feat(STORY-001): description` (Conventional Commits)
5. Gherkin in `## Acceptance Criteria` is the source of truth for behaviour
6. Move stories to `jira/done/` when complete, update `SPRINT.md`
7. Do not start implementing a story without Gherkin scenarios present

### 6.1 `CLAUDE.md` (project root)

Plain markdown, read automatically by Claude Code on every session start.

### 6.2 `.cursor/rules/jira.mdc`

MDC format (YAML frontmatter + markdown body). Cursor 0.43+ uses
`.cursor/rules/*.mdc` files — each rule is a separate file with frontmatter
specifying `alwaysApply: true` so it loads in every conversation.

### 6.3 `.github/copilot-instructions.md`

GitHub Copilot reads this file automatically when it is present. Plain
markdown. Same content as CLAUDE.md, formatted for Copilot's instruction style.

---

## 7. PR Template

`.github/pull_request_template.md` enforces story traceability on every PR:

```markdown
## Story
<!-- Required: link to the story this PR implements -->
Closes STORY-

## Changes
-

## Gherkin scenarios covered
<!-- List the scenario titles from the story's Acceptance Criteria -->
-

## Checklist
- [ ] Acceptance criteria scenarios pass
- [ ] SPRINT.md updated if story is now done
- [ ] Story moved to jira/done/ if complete
```

---

## 8. Obsidian Integration (Optional)

Opening `jira/` as an Obsidian vault is optional. The system works fully
without it. When used:

- **Dataview plugin** — queries frontmatter for dynamic board views, per-dev
  filters, sprint tables
- **Kanban plugin** — drag-and-drop status changes (writes back to frontmatter)
- `.obsidian/` config is committed with recommended plugin settings

---

## 9. jira/README.md

Concise, committed to repo. Covers:

- What this folder is
- Workflow: idea → EPICS.md → story file → Gherkin → `.feature`
- Status lifecycle and directory conventions
- How to run the scripts
- How to use with Obsidian (optional)
- Conventional Commits format

---

## 10. Commit Convention

```
feat(STORY-001): add TodoList component
fix(STORY-003): correct empty state message
chore(TASK-001): scaffold Vite + Tailwind
docs(STORY-002): add missing Gherkin scenario
```

Scope = story or task ID. Enables git log filtering per story.

---

## 11. Out of Scope

- Running BDD tests (step definitions, Playwright config) — added per project
- GitHub Actions / CI integration — future addition
- Velocity tracking / burndown charts
- Multi-project support
