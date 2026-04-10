import { afterEach, describe, expect, it } from "bun:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { parseMessage, run } from "./index.ts";

let tmpDir: string;

async function makeBoard(): Promise<string> {
	tmpDir = await mkdtemp(join(tmpdir(), "pm-new-test-"));
	return tmpDir;
}

afterEach(async () => {
	if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

describe("parseMessage", () => {
	it("extracts plain title", () => {
		const r = parseMessage("Add auth flow");
		expect(r.title).toBe("Add auth flow");
		expect(r.type).toBe("story");
	});

	it("extracts @assignee", () => {
		const r = parseMessage("Fix bug @alice");
		expect(r.title).toBe("Fix bug");
		expect(r.assignee).toBe("alice");
	});

	it("keeps @me literal (caller resolves)", () => {
		const r = parseMessage("Fix bug @me");
		expect(r.assignee).toBe("me");
	});

	it("extracts #layer", () => {
		const r = parseMessage("Add auth flow #backend");
		expect(r.layer).toBe("backend");
		expect(r.title).toBe("Add auth flow");
	});

	it("extracts #type", () => {
		const r = parseMessage("Scaffold DB #task");
		expect(r.type).toBe("task");
		expect(r.title).toBe("Scaffold DB");
	});

	it("extracts #EPIC-NNN", () => {
		const r = parseMessage("Add auth flow #EPIC-002");
		expect(r.epic).toBe("EPIC-002");
		expect(r.title).toBe("Add auth flow");
	});

	it("is case-insensitive for #epic", () => {
		const r = parseMessage("Fix thing #epic-003");
		expect(r.epic).toBe("EPIC-003");
	});

	it("extracts key:value into extra", () => {
		const r = parseMessage("Deploy pipeline points:5 status:ready");
		expect(r.extra).toEqual({ points: "5", status: "ready" });
		expect(r.title).toBe("Deploy pipeline");
	});

	it("handles all tokens together", () => {
		const r = parseMessage("Add auth flow @alice #backend #EPIC-002 points:5");
		expect(r.title).toBe("Add auth flow");
		expect(r.assignee).toBe("alice");
		expect(r.layer).toBe("backend");
		expect(r.epic).toBe("EPIC-002");
		expect(r.extra).toEqual({ points: "5" });
		expect(r.warnings).toHaveLength(0);
	});

	it("warns on unknown #tag and skips it", () => {
		const r = parseMessage("Fix thing #unknown");
		expect(r.warnings).toEqual(["unknown token: #unknown"]);
		expect(r.title).toBe("Fix thing");
		expect(r.layer).toBeUndefined();
	});

	it("defaults type to story", () => {
		expect(parseMessage("Something").type).toBe("story");
	});

	it("normalizes blockedBy plain string to array brackets", () => {
		const r = parseMessage("Fix thing blockedBy:STORY-002");
		expect(r.extra.blockedBy).toBe("STORY-002");
		// normalization happens in buildFrontmatter, tested in run() integration below
	});
});

describe("run() integration", () => {
	it("dry-run prints path and summary without writing files", async () => {
		const cwd = await makeBoard();
		const logs: string[] = [];
		const orig = console.log;
		console.log = (...a) => logs.push(a.join(" "));
		try {
			await run({ json: false, dryRun: true, cwd }, ["Add auth flow @alice #backend points:5"]);
		} finally {
			console.log = orig;
		}
		expect(logs[0]).toContain("dry-run");
		expect(logs[0]).toContain("STORY-001");
		expect(logs[1]).toContain("Add auth flow");
		expect(logs[1]).toContain("alice");
	});

	it("creates file with correct frontmatter", async () => {
		const cwd = await makeBoard();
		await run({ json: false, dryRun: false, cwd }, [
			"Add auth flow @alice #backend #EPIC-002 points:5",
		]);

		const backlog = join(cwd, ".pm", "backlog");
		const { readdir } = await import("node:fs/promises");
		const files = await readdir(backlog);
		expect(files).toHaveLength(1);
		expect(files[0]).toMatch(/^STORY-001-add-auth-flow/);

		const content = await readFile(join(backlog, files[0]), "utf8");
		expect(content).toContain("title: Add auth flow");
		expect(content).toContain("assignee: alice");
		expect(content).toContain("layer: backend");
		expect(content).toContain("epic: EPIC-002");
		expect(content).toContain("points: 5");
		expect(content).toContain("reason:");
		expect(content).toContain("blockedBy: []");
	});

	it("normalizes blockedBy key:value to array format", async () => {
		const cwd = await makeBoard();
		await run({ json: false, dryRun: false, cwd }, ["Fix thing blockedBy:STORY-002"]);

		const { readdir } = await import("node:fs/promises");
		const files = await readdir(join(cwd, ".pm", "backlog"));
		const content = await readFile(join(cwd, ".pm", "backlog", files[0]), "utf8");
		expect(content).toContain("blockedBy: [STORY-002]");
	});

	it("creates task file when #task token used", async () => {
		const cwd = await makeBoard();
		await run({ json: false, dryRun: false, cwd }, ["Scaffold DB #task"]);

		const { readdir } = await import("node:fs/promises");
		const files = await readdir(join(cwd, ".pm", "backlog"));
		expect(files[0]).toMatch(/^TASK-001-scaffold-db/);
		const content = await readFile(join(cwd, ".pm", "backlog", files[0]), "utf8");
		expect(content).toContain("type: task");
	});
});
