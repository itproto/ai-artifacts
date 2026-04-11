# AGENTS.md — AI Agent Instructions

This file is the **authoritative instruction file** for agents working in this repository.

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
pm new "title @me #backend points:3"
pm rm STORY-006
pm rm "auth flow" cancelled
pm cat STORY-004
pm cat "pm cat"
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

## Code conventions

- TypeScript is `strict: true`; always use `.ts` extensions in imports
- Command modules follow the two-file pattern:

```text
commands/<name>/command.ts
commands/<name>/index.ts
```

- Register commands in `pm/src/commands/registry.ts`
- Use `bun:test`; test files live next to the source they test
- Use temp directories for filesystem tests and clean them up

## Testing guidance

- Prefer tests for **critical functionality**
- Keep coverage around **60%**
- Do not add tests just to maximize coverage
- For most features, 1–3 strong tests is enough while the CLI API is still evolving
- See `.pm/DECISIONS.md` for the rationale behind test strategy decisions

## Key implementation notes

- `resolveCurrentUser` prefers the GitHub username from the git remote URL, then falls back to `git config user.name`
- `nextId` scans `.pm/` recursively for `(STORY|TASK|EPIC)-NNN` and skips `node_modules/`
- `frontmatter.ts` is a custom flat `key: value` parser, not full YAML
- `pm new` prefers local templates from `.pm/templates/`, then falls back to bundled templates

## Do not do these things

- Do not edit `.pm/examples/`
- Do not add a root `package.json`
- Do not reference the retired `jira/` system
- Ignore stale `.github/copilot-instructions.md` and `.github/agents/pm.agent.md`
