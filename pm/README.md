# @itproto/pm

**File-based project management for humans and coding agents.**  
`pm` reads and writes a `.pm/` board in your repo: markdown stories/tasks, sprints, backlog, and done/closed folders.

## Requirements

- [Bun](https://bun.sh) ≥ 1.1.0

## Install

From the `pm/` directory:

```bash
bun install
```

### Run without publishing

```bash
# from pm/
bun run dev -- <command>

# from repo root (this workspace)
bun run pm/src/entrypoints/pm.ts <command>
```

### Global CLI (optional)

`bun link` inside `pm/`, or install once published as `@itproto/pm`.

## Quick start

```bash
cd your-repo
bun run /path/to/ai-artifacts/pm/src/entrypoints/pm.ts init   # scaffolds .pm/
bun run /path/to/ai-artifacts/pm/src/entrypoints/pm.ts ls     # active sprint board
bun run /path/to/ai-artifacts/pm/src/entrypoints/pm.ts new "Ship login @me #backend points:3"
```

Replace `/path/to/ai-artifacts` with your clone path, or run from this repo’s root using `bun run pm/src/entrypoints/pm.ts …`.

Stories live under `.pm/` (see `.pm/README.md` after `init`). **Acceptance criteria in Gherkin** are the behaviour spec; a story should have scenarios before it’s `ready`.

## Commands

| Command | Purpose |
|--------|---------|
| `init` | Create `.pm/` layout and templates in the current project |
| `ls` | Show sprint board (`--me`: only your items) |
| `new` | Create a story/task from title + DSL tokens |
| `cat` | Print a story to stdout (ID or fuzzy title); `-o` opens `$EDITOR` |
| `rm` | Close/cancel: move to `.pm/closed/` (ID, fuzzy match, or interactive) |
| `start` / `done` / `block` / `review` / `next` | Move items through the status workflow |

## Global options

Applies to all subcommands:

- `--json` — machine-readable output
- `--dry-run` — show what would change, no writes
- `--cwd <path>` — use another directory as the project root (must contain `.pm/` when relevant)

## `pm new` DSL

Tokens in the title string:

- `@user` — assignee; `@me` uses git/GitHub-derived identity when possible
- `#frontend` / `#backend` / `#fullstack` — layer
- `#story` / `#task` — type (default: story)
- `#EPIC-NNN` — epic link
- `key:value` — extra frontmatter fields
- Remaining words → **title**

Examples:

```bash
pm new "API errors @me #backend #EPIC-001 points:5"
pm new "Spike tracing #task" -o
```

## Status flow

```
backlog → ready → in-progress → review → done
```

Terminal: **`done`**, **`closed`** (via `pm rm`).

Sprint = highest `sprints/sprint-NN/` under `.pm/`. Moving files between `backlog/`, sprint folders, `done/`, and `closed/` is part of the workflow.

## MCP (optional)

A stdio MCP server exposes tools (e.g. **`pm_ls`**) for agents. Entrypoint: `src/entrypoints/mcp.ts` — wire it in your MCP config with `bun` as the command.

## Contributing / development

From `pm/`:

```bash
bun test          # tests
bun run check     # Biome + TypeScript
```

Conventions and agent workflow: **`AGENTS.md`** at the repo root.
