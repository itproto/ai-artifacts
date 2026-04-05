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
