# @itproto/pm CLI — Design Spec

**Date:** 2026-04-06
**Status:** Approved

---

## Goal

Build `@itproto/pm` — a TypeScript CLI tool that scaffolds and manages a file-based project management board (`.pm/` folder) in any project. The binary is called `pm`. First iteration: `pm init` only.

The CLI's own development is tracked inside the existing `jira/` backlog ("eat your own dog food").

---

## Package Identity

| Field | Value |
|---|---|
| Package name | `@itproto/pm` |
| Binary | `pm` |
| Location in repo | `pm/` at repo root |
| Runtime | Bun ≥ 1.1.0 |
| Distribution | Local (`bun link`) for now; npm publish later |

---

## Tech Stack

| Concern | Choice | Reason |
|---|---|---|
| Runtime | Bun | Fast startup, native TS, no compile step |
| CLI framework | `@commander-js/extra-typings` | Typed option inference, Claude Code pattern |
| Validation | `zod` | Boundary validation for options and config |
| Colors | `chalk` | Terminal output |
| Process exec | `execa` | Shell execution (future commands) |
| Lint + format | Biome | Single tool, fast, Claude Code pattern |
| Test | Bun built-in (`bun test`) | No extra dependency |

---

## TypeScript Configuration

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
  }
}
```

---

## Biome Configuration

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

---

## Folder Layout

```
pm/
  src/
    entrypoints/
      pm.ts               ← thin binary: version fast-path, imports buildProgram
    commands/
      init/
        index.ts          ← init implementation (lazy-loaded)
        command.ts        ← command definition object
      registry.ts         ← assembles all commands onto Commander program
    services/
      scaffold.ts         ← ScaffoldService: all .pm/ disk IO
    cli/
      output.ts           ← human/json output helper
    schemas/
      options.ts          ← Zod schemas for global CLI options
    types/
      command.ts          ← Command type definitions
  template/               ← bundled skeleton, copied on `pm init`
    backlog/.gitkeep
    sprints/.gitkeep
    done/.gitkeep
    closed/.gitkeep
    templates/
      story.md
      task.md
    examples/
      STORY-001-example.md
      TASK-001-example.md
      SPRINT.md
    EPICS.md
    DECISIONS.md
    README.md
  scripts/
    build.ts              ← bun build script
  package.json
  tsconfig.json
  biome.json
  bunfig.toml
```

---

## Architecture

### Command Registry Pattern

Commands are defined as configuration objects with a lazy `load()` function — matching Claude Code's architecture. Heavy implementation code is only loaded when the command is actually invoked.

```typescript
// src/commands/registry.ts
const COMMANDS = [
  {
    name: 'init',
    description: 'Initialize a .pm/ board in the current project',
    load: () => import('./init/index.ts'),
  },
  // future: story, task, board, ...
]

export function buildProgram() {
  const program = new Command('pm')
    .version('0.1.0')
    .option('--json', 'output as JSON')
    .option('--dry-run', 'preview without writing')
    .option('--cwd <path>', 'working directory', process.cwd())

  for (const def of COMMANDS) {
    registerCommand(program, def)
  }

  return program
}
```

### Thin Entrypoint

```typescript
// src/entrypoints/pm.ts
#!/usr/bin/env bun

import { VERSION } from '../version.ts' // inlined from package.json at build time

// Fast-path: --version with zero module loading
if (process.argv[2] === '--version' || process.argv[2] === '-V') {
  console.log(VERSION)
  process.exit(0)
}

const { buildProgram } = await import('../commands/registry.ts')
const program = buildProgram()
program.parse()
```

### Services Layer

Commands never touch the filesystem directly. All IO lives in `src/services/`. This keeps command logic pure and testable without filesystem mocking.

```typescript
// src/commands/init/index.ts
export async function run(opts: GlobalOpts) {
  const result = await ScaffoldService.init(opts)
  output(result, opts)
}
```

```typescript
// src/services/scaffold.ts
export const ScaffoldService = {
  async init(opts: GlobalOpts): Promise<ScaffoldResult> {
    // all fs.mkdir, fs.cp, etc. lives here
  }
}
```

### Zod Boundary Validation

Global options are validated with Zod before any command runs:

```typescript
// src/schemas/options.ts
export const GlobalOptsSchema = z.object({
  json: z.boolean().default(false),
  dryRun: z.boolean().default(false),
  cwd: z.string().default(process.cwd()),
})

export type GlobalOpts = z.infer<typeof GlobalOptsSchema>
```

### Output

Single `output()` function in `src/cli/output.ts` respects `--json` globally:

```typescript
export function output(result: unknown, opts: GlobalOpts) {
  if (opts.json) {
    console.log(JSON.stringify(result))
  } else {
    printHuman(result)
  }
}
```

---

## `pm init` Command

### Invocation

```bash
pm init                        # scaffold .pm/ in current directory
pm init --cwd /path/to/proj   # scaffold in given directory
pm init --dry-run              # preview without writing
pm init --json                 # machine-readable output
```

### Behavior

1. Parse and validate global options with Zod
2. Resolve target directory from `--cwd`
3. Check if `.pm/` already exists → exit with error if so
4. If `--dry-run`: print what would be created, exit
5. Copy `template/` → `<cwd>/.pm/` preserving directory structure
6. Replace `.gitkeep` files with real empty directories
7. Print success summary

### Human Output

```
✓ Initialized .pm/ project board

  backlog/        ready for stories
  done/           completed work lands here
  closed/         cancelled or deferred
  templates/      story.md, task.md
  examples/       1 story, 1 task to get you started

Next steps:
  1. Edit .pm/EPICS.md — add your epics
  2. Copy .pm/templates/story.md → .pm/backlog/STORY-001-slug.md
  3. Fill in the story and write Gherkin before moving to ready
```

### Dry-Run Output

```
[dry-run] Would create .pm/ in /path/to/project
[dry-run] Would copy 14 files from template
[dry-run] No files written.
```

### JSON Output

```json
{
  "success": true,
  "path": "/path/to/project/.pm",
  "filesCreated": 14,
  "dryRun": false
}
```

### Error Cases

| Condition | Exit code | Message |
|---|---|---|
| `.pm/` already exists | 1 | `Error: .pm/ already exists in <cwd>. Run with --force to overwrite (not yet implemented).` |
| `--cwd` path not found | 1 | `Error: directory not found: <path>` |
| Write permission denied | 1 | `Error: cannot write to <cwd>: permission denied` |

---

## Template Contents

The `template/` directory is bundled inside the package. It contains a clean skeleton — no project-specific data.

| Path | Purpose |
|---|---|
| `backlog/.gitkeep` | Empty backlog dir marker |
| `sprints/.gitkeep` | Empty sprints dir marker |
| `done/.gitkeep` | Empty done dir marker |
| `closed/.gitkeep` | Empty closed dir marker |
| `templates/story.md` | Story frontmatter template |
| `templates/task.md` | Task frontmatter template |
| `examples/STORY-001-example.md` | Sample story with Gherkin |
| `examples/TASK-001-example.md` | Sample task |
| `examples/SPRINT.md` | Sample sprint file |
| `EPICS.md` | Blank epics table with one example row |
| `DECISIONS.md` | Blank decisions log |
| `README.md` | How to use .pm/ — concise |

Template files are copied from `jira/templates/` and `jira/` as the source of truth. The examples mirror the real `jira/` format.

---

## Development Setup

```bash
cd pm
bun install
bun link              # makes `pm` available globally

# run directly without linking:
bun src/entrypoints/pm.ts init
```

---

## Global Flags

| Flag | Type | Default | Description |
|---|---|---|---|
| `--json` | boolean | false | Output as JSON |
| `--dry-run` | boolean | false | Preview without writing |
| `--cwd <path>` | string | `process.cwd()` | Working directory |

---

## Tracking in jira/

CLI development is tracked as a new epic + stories in the existing `jira/` backlog:

- **EPIC-003**: `@itproto/pm` CLI
- **STORY-005**: `pm init` scaffolding command
- **TASK-003**: Package setup (`pm/` directory, dependencies, biome, tsconfig)

Stories follow the same lifecycle: `backlog → ready → in-progress → review → done`.

---

## Future Commands (out of scope for this iteration)

| Command | Purpose |
|---|---|
| `pm story create` | Interactive story creation with prompts |
| `pm task create` | Create a task |
| `pm status <id> <status>` | Move story/task to new status |
| `pm board` | Regenerate BOARD.md |
| `pm sprint start` | Start a new sprint |

These are not designed here. Each will get its own story in jira/ when prioritized.
