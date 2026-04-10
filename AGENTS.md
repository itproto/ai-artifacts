# AGENTS.md — AI Agent Instructions

This file provides authoritative guidance for AI agents (GitHub Copilot, Codex, OpenAI Codex CLI, etc.) working in this repository.

---

## Repository Layout

```
ai-artifacts/
├── .pm/                    ← File-based project board (source of truth for work items)
│   ├── EPICS.md            ← Epic definitions
│   ├── DECISIONS.md        ← Append-only architecture decision log
│   ├── templates/          ← story.md / task.md templates
│   ├── examples/           ← READ ONLY — reference templates, never edit
│   ├── backlog/            ← Stories not yet in a sprint
│   ├── sprints/sprint-NN/  ← Active and past sprints (highest NN = active)
│   ├── done/               ← Completed stories (moved here, not deleted)
│   └── closed/             ← Cancelled / won't-do stories
└── pm/                     ← The @itproto/pm CLI package (the only npm/bun package)
    ├── package.json
    ├── biome.json
    ├── tsconfig.json
    ├── bunfig.toml
    ├── bun.lock
    └── src/
        ├── entrypoints/pm.ts      ← CLI entry point
        ├── commands/              ← One sub-folder per command (command.ts + index.ts)
        ├── services/              ← Business logic (board, frontmatter, id, search, …)
        ├── cli/                   ← Output formatting
        ├── schemas/               ← Zod option schemas
        └── types/                 ← Shared TypeScript types
```

There is no root `package.json`. The only runnable package is `pm/`.

---

## Runtime & Toolchain

| Tool | Version / Notes |
|---|---|
| **Bun** | ≥ 1.1.0 — **required**. Do not use Node/npm/yarn/pnpm. |
| **TypeScript** | `noEmit: true` — type-check only, Bun runs `.ts` directly |
| **Biome** | Lint + format (replaces ESLint + Prettier) |

---

## Developer Commands

All commands run from `pm/` unless stated otherwise.

```bash
# Tests
bun test                  # run full test suite (~85 tests, ~200ms)

# Lint / format
bun run lint              # biome check src/

# Type-check + lint
bun run check             # biome check src/ && tsc --noEmit

# Type-check only
bun run typecheck         # tsc --noEmit

# Run CLI in dev mode (from pm/)
bun run dev <cmd>         # bun src/entrypoints/pm.ts <cmd>

# Run CLI from repo root
bun run pm/src/entrypoints/pm.ts <command>
```

---

## Code Conventions

### Style (enforced by Biome)
- Indentation: **tabs**, width 2
- Line width: 100
- Unused imports / variables: **warn** (do not introduce new ones)

### TypeScript
- `strict: true`, `moduleResolution: bundler`, target `ESNext`
- Always use `.ts` extensions in imports (e.g. `import { x } from './foo.ts'`)
- No barrel `index.ts` re-exports for commands — each command lazy-loads via `load: () => import('./index.ts')`

### Test files
- Use `bun:test` — **not** `vitest`. Import from `'bun:test'`:
  ```ts
  import { describe, expect, it, afterEach } from 'bun:test'
  ```
- Test files live alongside the source file they test (e.g. `board.test.ts` next to `board.ts`)
- Use `mkdtemp` / `tmp` directories for filesystem tests; clean up in `afterEach`
- **PoC test strategy**: write 1–3 tests per feature — happy path + one important error/edge case. Do not expand test coverage beyond this until the CLI API is stable. See `.pm/DECISIONS.md` for rationale.

### Command module pattern
Every command must follow the two-file pattern:

```
commands/<name>/command.ts   ← CommandDef with lazy load
commands/<name>/index.ts     ← exports async run(opts, args)
```

`command.ts` example:
```ts
import type { CommandDef } from '../../types/command.ts'
export const def: CommandDef = {
  name: 'foo',
  description: 'Does foo',
  load: () => import('./index.ts'),
}
```

Register new commands in `commands/registry.ts`.

---

## Project Management

This project uses the `pm` CLI with a file-based board in `.pm/`.

### Before starting any work session
1. Run `pm ls` — see the current sprint state
2. Locate the relevant story in `.pm/sprints/<sprint>/` or `.pm/backlog/`
3. Read the story's `## Acceptance Criteria` — the Gherkin scenarios are the **source of truth** for behaviour

### Story lifecycle rules
- **Do not implement a story that has no Gherkin scenarios**
- Move story file to `.pm/done/` when implementation is complete
- Use `pm rm <id> <reason>` to cancel a story (moves to `.pm/closed/`)
- Sprint membership is determined by directory location, not frontmatter
- Active sprint = highest-numbered `sprints/sprint-NN/` directory

### Status values (in order)
`backlog` → `ready` → `in-progress` → `review` → `done`  
Terminal: `done`, `closed`

A story must have at least one Gherkin scenario before it can move to `ready`.

### pm CLI quick reference
```bash
pm init                        # scaffold .pm/ board in current project
pm ls                          # show sprint board
pm ls --me                     # show only your items (resolved from git config user.name)
pm new "title @me #backend points:3"
pm new "title @me #backend" -o # create and open in $EDITOR immediately
pm rm STORY-006                # close by ID (prompts for reason)
pm rm "auth flow" cancelled    # fuzzy search + reason
pm cat STORY-004               # print story to stdout
pm cat "pm cat"                # fuzzy search, auto-pick if 1 match
pm cat STORY-004 -o            # open in $EDITOR
```

### Global flags (all subcommands)
- `--json` — output as JSON
- `--dry-run` — preview changes without writing
- `--cwd <path>` — override working directory (useful when running from a subdirectory)

### pm new DSL tokens
- `@username` — assignee (`@me` resolves to current git user)
- `#layer` — `frontend` / `backend` / `fullstack`
- `#type` — `story` (default) / `task`
- `#EPIC-NNN` — link to epic
- `key:value` — arbitrary frontmatter field
- Remaining words → title

---

## Commit Format (Conventional Commits)

```
feat(STORY-001): add TodoList component
fix(STORY-003): correct empty state message
chore(TASK-001): scaffold Vite + Tailwind
docs(STORY-002): add missing Gherkin scenario
```

Scope must be the story/task ID.

---

## Key Implementation Notes

### `resolveCurrentUser` (board.ts)
Prefers the GitHub username parsed from the git remote URL (`github.com/<owner>/`), falls back to `git config user.name`.

### ID generation (`nextId` in id.ts)
Scans all directories under `.pm/` recursively, matches filenames against `(STORY|TASK|EPIC)-(\d+)`, skips `node_modules/`. IDs are zero-padded to 3 digits.

### Frontmatter parser (frontmatter.ts)
Custom YAML-ish parser — no external YAML dependency. Only supports the flat key: value format used in `.pm` templates.

### Template resolution (`pm new`)
1. Looks for `.pm/templates/<type>.md` in the current project first
2. Falls back to bundled `pm/template/templates/<type>.md`

---

## What NOT to do

- Do not edit files in `.pm/examples/` — they are reference only
- Do not use `npm`, `yarn`, or `pnpm` — use `bun` exclusively
- Do not import from `vitest` — use `bun:test`
- Do not add a root `package.json` — the only package is `pm/`
- Do not reference `jira/` — that directory was retired; the board is now in `.pm/`
- Ignore `.github/copilot-instructions.md` and `.github/agents/pm.agent.md` — both still reference the retired `jira/` system and are stale
