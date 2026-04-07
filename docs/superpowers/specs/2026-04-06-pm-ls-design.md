# pm ls — Sprint Board View

**Story:** STORY-001  
**Date:** 2026-04-06

## Overview

`pm ls` renders the active sprint board in the terminal. Items are grouped by status in stacked vertical sections. A `--me` flag filters to the current user's items.

## Commands

```
pm ls           # full sprint board
pm ls --me      # only items assigned to current git user
```

## Output Format

Sections are stacked vertically. Only non-empty sections are shown. Each item is a single line.

```
Sprint sprint-01

● In Progress
  STORY-001  pm ls — sprint board view    @itproto  2pt
  TASK-002   Scaffold backend             @bob

○ Blocked
  STORY-002  Create a todo item           @alice  5pt  ← TASK-002

✓ Done
  TASK-001   Scaffold frontend            @alice
```

**Section order:** In Progress → Blocked → Review → Done → Backlog (omit empty sections)

**Item columns:** ID (fixed width) · title (truncated at 45 chars) · assignee · points (stories only)

**Blocked indicator:** `← <blockedBy id>` appended inline

**Empty sprint:** prints `No active sprint` and exits 0.

## Active Sprint Resolution

The active sprint is the highest-numbered `sprint-NN` directory under `.pm/sprints/`. All `.md` files in that directory are story/task items.

## `--me` Resolution

1. Try to extract GitHub username from `git remote get-url origin` (e.g. `github.com/itproto/repo` → `itproto`)
2. Fall back to `git config user.name` if no GitHub remote is found
3. Strip leading `@` if present, lowercase both sides for comparison
4. Filter items where `assignee` matches

## Architecture

### New files

- `pm/src/commands/ls/index.ts` — command definition + handler
- `pm/src/services/board.ts` — reads sprint dir, parses items, groups by status
- `pm/src/services/board.test.ts` — unit tests for grouping/rendering logic

### Rendering

Board rendering lives in `board.ts` (pure functions, no I/O). The command handler calls `board.ts` and writes to stdout. This keeps rendering testable.

### Data shape

```ts
type BoardItem = {
  id: string;
  title: string;
  type: 'story' | 'task';
  status: string;
  assignee?: string;
  points?: number;
  blockedBy: string[];
};
```

## Error Handling

| Condition | Behaviour |
|---|---|
| No `.pm/sprints/` directory | Print `No active sprint`, exit 0 |
| Malformed frontmatter in a file | Skip the file, continue rendering |
| `git config` unavailable for `--me` | Print error `Could not resolve current user`, exit 1 |

## Testing

Unit tests in `board.test.ts` cover:
- Grouping items by status
- `--me` filter matching (with and without `@`, case-insensitive)
- Empty sprint returns no sections
- Truncation of long titles
- Blocked indicator rendering

No integration test needed — file reads are the only side effect and the service is thin.
