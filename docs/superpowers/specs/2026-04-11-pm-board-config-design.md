# pm Board Config — Design Spec

**Date:** 2026-04-11  
**Status:** approved  
**Scope:** YAML-configurable board views for `pm ls`

---

## Goal

Make `pm ls` board rendering configurable via YAML files at `.pm/boards/<name>.yaml`. Users define columns, fields, filters, and data source per board. `pm ls --board <name>` selects a board; `pm ls` uses `default.yaml`.

---

## Architecture

All new logic lives inside the existing `pm ls` command directory. No new command, no new top-level service.

### Files changed

| Action | Path | Purpose |
|---|---|---|
| Create | `pm/src/commands/ls/board-config.ts` | YAML parsing, validation, `BoardConfig` type |
| Modify | `pm/src/commands/ls/index.ts` | Board-aware render path, filter + column logic |
| Modify | `pm/src/commands/ls/command.ts` | Add `--board <name>` option |

### Flow

```
pm ls --board <name>
  → read .pm/boards/<name>.yaml
  → parse → BoardConfig
  → load items from source
  → apply filters
  → group by columns
  → render
```

---

## Board Config Schema

File location: `.pm/boards/<name>.yaml`

```yaml
source: active-sprint   # active-sprint | backlog | all | sprint-NN (default: active-sprint)

columns:
  - in-progress         # shorthand: status name used as label
  - blocked
  - label: In Flight    # explicit: custom label + grouped statuses
    statuses: [in-progress, review]
  - done

fields:                 # opt-in — only listed fields are shown
  - id
  - title
  - assignee
  - points

filters:                # all optional
  assignee: me          # "me" resolves via git config user.name / GitHub remote
  statuses: [in-progress, blocked]
  type: story           # story | task
```

**Rules:**
- `columns` is the only required key
- Shorthand column (`- in-progress`) = `{ label: "In Progress", statuses: ["in-progress"] }`
- `fields` defaults to `[id, title, assignee, points]` if omitted
- `source` defaults to `active-sprint` if omitted
- `filters` is optional — no filters = show all items

### Minimal valid board

```yaml
columns:
  - in-progress
  - done
```

---

## Default Board Behaviour

- `pm ls` with no `--board` flag loads `default.yaml`
- If `default.yaml` is missing → error: `Error: no default board found. Create .pm/boards/default.yaml to get started.`
- No silent fallback to hardcoded layout

---

## Rendering

Column-aware renderer replaces `renderBoard` for the board path:

1. Filter items per `filters:` config
2. Group filtered items by column (each column maps one or more statuses)
3. For each column: render icon + bold label, then one row per item showing only configured `fields:`
4. Items not matched by any column are silently dropped

Terminal output style unchanged — chalk, same icon set (`●`, `○`, `◐`, `✓`, `·`).

---

## `BoardConfig` Type

```typescript
type ColumnDef =
  | string                              // shorthand
  | { label: string; statuses: string[] }  // explicit

type BoardConfig = {
  source: "active-sprint" | "backlog" | "all" | string
  columns: ColumnDef[]
  fields: string[]
  filters?: {
    assignee?: string
    statuses?: string[]
    type?: "story" | "task"
  }
}
```

---

## Error Handling

| Condition | Behaviour |
|---|---|
| `default.yaml` missing | Error with create hint |
| Named board file missing | Error: `board "foo" not found at .pm/boards/foo.yaml` |
| Invalid YAML | Parse error with file path |
| Unknown field in column | Silently skip (forward compat) |
| Unknown status in column | Silently skip |
| `assignee: me` can't resolve | Error with resolution hint |

---

## Out of Scope

- Interactive drag-and-drop
- Web UI
- `pm board` as a separate command
- MCP tool for board (`pm_ls_board`) — follow-on sprint
- `pm init` generating `default.yaml` — follow-on
