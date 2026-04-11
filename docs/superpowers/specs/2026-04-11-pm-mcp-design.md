# pm MCP Server — Design Spec

**Date:** 2026-04-11  
**Status:** approved  
**Scope:** MVP — single `pm_ls` tool; server scaffolded to grow

---

## Goal

Expose the `@itproto/pm` project board as an MCP server so Claude Code can read sprint state directly without running shell commands. The MVP exposes one tool (`pm_ls`). Additional tools (`pm_new`, `pm_cat`) follow the same pattern in future sprints.

---

## Architecture

### New files

| File | Purpose |
|---|---|
| `pm/src/entrypoints/mcp.ts` | MCP stdio server — registers tools, handles requests |
| `.mcp.json` | Tells Claude Code to load the `itproto/pm` MCP server |

### Modified files

| File | Change |
|---|---|
| `pm/package.json` | Add `@modelcontextprotocol/sdk` dependency |

### What does NOT change

- Existing commands (`ls`, `new`, `rm`, `cat`) are untouched
- No changes to service layer signatures
- No `--json` flag implementation needed

---

## MCP Server

**Server name:** `itproto/pm`  
**Transport:** stdio  
**Runtime:** Bun (`bun run pm/src/entrypoints/mcp.ts`)

`.mcp.json` at repo root:

```json
{
  "mcpServers": {
    "itproto/pm": {
      "type": "stdio",
      "command": "bun",
      "args": ["run", "pm/src/entrypoints/mcp.ts"]
    }
  }
}
```

---

## Tool: `pm_ls`

### Description (shown to Claude)

> List all stories and tasks in the active sprint. Returns id, title, status, assignee, and points for each item.

### Input schema

```json
{
  "type": "object",
  "properties": {
    "cwd": {
      "type": "string",
      "description": "Path to repo root containing .pm/ board. Defaults to process.cwd()."
    }
  },
  "required": []
}
```

### Implementation

Calls service layer directly — no command layer, no stdout capture:

```
findActiveSprint(cwd)
  → readSprintItems(cwd, sprint)
  → groupByStatus(items)
  → serialize to JSON → MCP response
```

### Response shape

```json
{
  "sprint": "sprint-01",
  "items": [
    {
      "id": "STORY-001",
      "title": "pm ls — show sprint board in terminal",
      "type": "story",
      "status": "done",
      "assignee": "itproto",
      "points": 2,
      "blockedBy": []
    }
  ]
}
```

No active sprint: `{ "sprint": null, "items": [] }`

---

## Error handling

| Condition | Behaviour |
|---|---|
| No active sprint | Return `{ sprint: null, items: [] }` — not an error |
| `.pm/` directory missing | Return MCP error with descriptive message |
| File read failure | Return MCP error with descriptive message |

Errors are returned as MCP protocol errors, not thrown exceptions that crash the server.

---

## Extending later

Adding `pm_new` or `pm_cat`:

1. Register the new tool in `mcp.ts` alongside `pm_ls`
2. Call the relevant service functions directly
3. No changes to `.mcp.json` or `package.json`

---

## Out of scope (this sprint)

- `pm_new`, `pm_cat`, `pm_rm` tools
- `--me` / assignee filtering (callers filter client-side)
- Authentication or multi-project support
