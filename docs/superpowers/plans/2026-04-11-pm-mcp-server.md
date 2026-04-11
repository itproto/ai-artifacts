# pm MCP Server Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose the `@itproto/pm` board as an MCP stdio server with a single `pm_ls` tool that returns sprint items as structured JSON.

**Architecture:** A new `pm/src/entrypoints/mcp.ts` registers the MCP server using `@modelcontextprotocol/sdk` and calls `services/board.ts` directly — no CLI subprocess, no stdout capture. A `.mcp.json` at repo root wires Claude Code to load the server as `itproto/pm`.

**Tech Stack:** Bun, `@modelcontextprotocol/sdk`, existing `services/board.ts` (findActiveSprint, readSprintItems, groupByStatus)

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Modify | `pm/package.json` | Add `@modelcontextprotocol/sdk` dependency |
| Create | `pm/src/entrypoints/mcp.ts` | MCP stdio server — registers `pm_ls`, calls services |
| Create | `.mcp.json` | Tells Claude Code to load `itproto/pm` server |

---

## Task 1: Add MCP SDK dependency

**Files:**
- Modify: `pm/package.json`

- [ ] **Step 1: Install the SDK**

Run from repo root:
```bash
cd pm && bun add @modelcontextprotocol/sdk
```

Expected output: SDK added to `pm/package.json` dependencies and `bun.lock` updated.

- [ ] **Step 2: Verify the install**

```bash
cd pm && bun -e "import('@modelcontextprotocol/sdk/server/index.js').then(() => console.log('ok'))"
```

Expected: `ok`

- [ ] **Step 3: Commit**

```bash
git add pm/package.json pm/bun.lock
git commit -m "chore: add @modelcontextprotocol/sdk dependency"
```

---

## Task 2: Create the MCP entrypoint

**Files:**
- Create: `pm/src/entrypoints/mcp.ts`

The server has one tool: `pm_ls`. The handler checks `.pm/` exists, then calls `findActiveSprint` → `readSprintItems` → returns JSON. All error cases surface as MCP errors so the server stays alive between calls.

- [ ] **Step 1: Create `pm/src/entrypoints/mcp.ts`**

```typescript
#!/usr/bin/env bun
import { access } from "node:fs/promises";
import { join } from "node:path";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { findActiveSprint, readSprintItems } from "../services/board.ts";

const server = new Server(
	{ name: "itproto/pm", version: "0.1.0" },
	{ capabilities: { tools: {} } },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
	tools: [
		{
			name: "pm_ls",
			description:
				"List all stories and tasks in the active sprint. Returns id, title, status, assignee, and points for each item.",
			inputSchema: {
				type: "object" as const,
				properties: {
					cwd: {
						type: "string",
						description:
							"Path to repo root containing .pm/ board. Defaults to process.cwd().",
					},
				},
				required: [],
			},
		},
	],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
	if (request.params.name !== "pm_ls") {
		throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${request.params.name}`);
	}

	const cwd = (request.params.arguments?.cwd as string | undefined) ?? process.cwd();
	const pmDir = join(cwd, ".pm");

	try {
		await access(pmDir);
	} catch {
		throw new McpError(ErrorCode.InvalidRequest, `.pm/ board not found at ${cwd}`);
	}

	const sprint = await findActiveSprint(cwd);

	if (!sprint) {
		return {
			content: [{ type: "text" as const, text: JSON.stringify({ sprint: null, items: [] }) }],
		};
	}

	const items = await readSprintItems(cwd, sprint);

	return {
		content: [
			{
				type: "text" as const,
				text: JSON.stringify({ sprint, items }),
			},
		],
	};
});

const transport = new StdioServerTransport();
await server.connect(transport);
```

- [ ] **Step 2: Type-check**

```bash
cd pm && bun run typecheck
```

Expected: no errors

- [ ] **Step 3: Commit**

```bash
git add pm/src/entrypoints/mcp.ts
git commit -m "feat: add pm MCP server with pm_ls tool"
```

---

## Task 3: Create `.mcp.json`

**Files:**
- Create: `.mcp.json` (repo root)

- [ ] **Step 1: Create `.mcp.json`**

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

- [ ] **Step 2: Verify Claude Code picks it up**

Restart Claude Code in this repo. Run:
```
/mcp
```

Expected: `itproto/pm` listed as connected with `pm_ls` tool visible.

- [ ] **Step 3: Commit**

```bash
git add .mcp.json
git commit -m "chore: add .mcp.json — wire itproto/pm MCP server"
```

---

## Task 4: Create pm story and update board

**Files:**
- Create: `.pm/sprints/<active-sprint>/STORY-XXX-pm-mcp-server.md`

- [ ] **Step 1: Create the story**

```bash
pm new "pm MCP server — expose pm_ls via @modelcontextprotocol/sdk @itproto #backend points:3"
```

Note the generated ID (e.g. `STORY-005`).

- [ ] **Step 2: Move to sprint in-progress**

Move the new file from `.pm/backlog/` to `.pm/sprints/<active-sprint>/` and update its `status` frontmatter field to `in-progress`.

- [ ] **Step 3: Move to done when complete**

When all tasks above are done, move the story file to `.pm/done/`.

- [ ] **Step 4: Commit board state**

```bash
git add .pm/
git commit -m "chore(STORY-XXX): move pm MCP story to done"
```

---

## Task 5: Push and open PR

- [ ] **Step 1: Push branch**

```bash
git push -u origin HEAD
```

- [ ] **Step 2: Open PR**

```bash
gh pr create --title "feat: pm MCP server — expose pm_ls tool" --body "$(cat <<'EOF'
## Summary
- Adds `@modelcontextprotocol/sdk` to `@itproto/pm`
- New `pm/src/entrypoints/mcp.ts` — MCP stdio server with `pm_ls` tool
- `.mcp.json` at repo root — Claude Code auto-loads `itproto/pm`
- `pm_ls` calls service layer directly (no CLI subprocess), returns structured JSON

## Test plan
- [ ] `/mcp` in Claude Code shows `itproto/pm` connected
- [ ] `pm_ls` tool returns `{ sprint, items[] }` with current board state
- [ ] `pm_ls` with no `.pm/` dir returns MCP error (not a crash)
- [ ] `bun run typecheck` passes in `pm/`

🤖 Generated with [Claude Code](https://claude.ai/claude-code)
EOF
)"
```

---

## Self-Review

**Spec coverage check:**
- ✅ New file `pm/src/entrypoints/mcp.ts` — Task 2
- ✅ New file `.mcp.json` — Task 3
- ✅ Modified `pm/package.json` — Task 1
- ✅ `pm_ls` tool with correct description and input schema — Task 2
- ✅ Calls `findActiveSprint` → `readSprintItems` directly — Task 2
- ✅ Response shape `{ sprint, items[] }` — Task 2
- ✅ No sprint → `{ sprint: null, items: [] }` — Task 2
- ✅ `.pm/` missing → MCP error — Task 2
- ✅ File read failure handled by service layer (returns `[]`) — covered by existing service behaviour
- ✅ Server name `itproto/pm` — Task 2 + Task 3
- ✅ Tool name `pm_ls` with `pm_` prefix — Task 2
- ✅ `cwd` defaults to `process.cwd()` — Task 2

**Placeholder scan:** No TBDs, no vague steps, all code complete.

**Type consistency:** `BoardItem` from `services/board.ts` used throughout. `findActiveSprint` and `readSprintItems` signatures match actual service exports verified in source.
