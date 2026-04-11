# AGENTS.md

## Project and toolchain

- The project board lives in **`.pm/`** and is the source of truth for work items.
- The only runnable package is **`pm/`**. There is no root `package.json`.
- Use **Bun only**. Do not use `npm`, `yarn`, `pnpm`, or `vitest`.

## Developer commands

Run commands from `pm/` unless noted otherwise.

```bash
bun test
bun run lint
bun run check
bun run typecheck
bun run dev <cmd>

# from repo root
bun run pm/src/entrypoints/pm.ts <command>
```

If you merge changes to `pm/package.json` or `pm/bun.lock`, run:

```bash
cd pm && bun install
```

## Command reference

```bash
pm init
pm ls
pm ls --me
pm ls --board <name>
pm new "title @me #backend points:3"
pm rm STORY-006
pm rm "auth flow" cancelled
pm cat STORY-004
pm cat "pm cat"
pm start STORY-001
pm done STORY-001
pm block STORY-001
pm review STORY-001
pm next STORY-001
```

## Project management rules

Before starting work:
1. Run `pm ls`
2. Find the relevant story in `.pm/sprints/<sprint>/` or `.pm/backlog/`
3. Read `## Acceptance Criteria` — Gherkin is the source of truth for behavior

Story lifecycle:
- Do not implement a story with no Gherkin scenarios
- Move completed stories to `.pm/done/`
- Use `pm rm <id> <reason>` to cancel work; it moves the item to `.pm/closed/`
- Sprint membership is based on directory location, not frontmatter
- Active sprint = highest-numbered `sprints/sprint-NN/`

Status order:

```text
backlog → ready → in-progress → review → done
```

Terminal statuses: `done`, `closed`

The `ready` gate requires at least one Gherkin scenario.

## Coding Style & Naming Conventions

- Language: TypeScript (ESM). Prefer strict typing and avoid `any`.
- Always use `.ts` extensions in imports.
- Do not add `@ts-nocheck` or inline lint suppressions by default; fix root causes first.
- Prefer `zod` or existing schema helpers at external boundaries such as CLI options, persisted config, and structured file input.
- Keep files focused; extract helpers instead of creating “v2” copies.
- Add brief comments only for tricky or non-obvious logic.
- Use consistent American English in code comments, docs, and user-facing text.
- Use `pm` for the CLI command, package/binary references, and command examples.
- Keep the board directory name as `.pm/`.
- Keep work item IDs uppercase and zero-padded: `STORY-001`, `TASK-001`, `EPIC-001`.
- Command modules follow:

```text
commands/<name>/command.ts
commands/<name>/index.ts
```

- Register commands in `pm/src/commands/registry.ts`.

## Testing guidance

- Use `bun:test`; test files live next to the source they test and are named `*.test.ts`.
- Use temp directories for filesystem tests and clean them up.
- Prefer tests for **critical functionality**.
- Keep coverage around **60%**.
- Do not add tests just to maximize coverage.
- For most features, 1–3 strong tests is enough while the CLI API is still evolving.
- See `.pm/DECISIONS.md` for rationale behind past decisions.

## Short implementation notes

- `resolveCurrentUser` prefers the GitHub username from the git remote URL, then falls back to `git config user.name`.
- `nextId` scans `.pm/` recursively for `(STORY|TASK|EPIC)-NNN` and skips `node_modules/`.
- `frontmatter.ts` is a custom flat `key: value` parser, not full YAML.
- `pm new` prefers local templates from `.pm/templates/`, then falls back to bundled templates.

## Do not do these things

- Do not edit `.pm/examples/`.
- Do not add a root `package.json`.
- Do not reference the retired `jira/` system.
- Ignore stale `.github/copilot-instructions.md` and `.github/agents/pm.agent.md`.
