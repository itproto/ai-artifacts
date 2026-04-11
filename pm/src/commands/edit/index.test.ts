import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { execFileSync } from "node:child_process";
import { mkdir, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildProgram } from "../registry.ts";
import { run } from "./index.ts";

const TMP_ROOT = join(import.meta.dir, `__tmp_edit_test__-${process.pid}`);
const BODY = "\n## User Story\nBody stays the same.\n";

type ItemSpec = {
	id: string;
	title: string;
	status: string;
	dir?: string;
	assignee?: string;
	layer?: string;
	epic?: string;
	points?: string;
	blockedBy?: string;
	reason?: string;
};

async function setupPm(items: ItemSpec[]): Promise<string> {
	const cwd = join(TMP_ROOT, crypto.randomUUID());
	const pmDir = join(cwd, ".pm");
	await mkdir(join(pmDir, "backlog"), { recursive: true });
	await mkdir(join(pmDir, "sprints", "sprint-01"), { recursive: true });
	await mkdir(join(pmDir, "done"), { recursive: true });
	await mkdir(join(pmDir, "closed"), { recursive: true });

	for (const item of items) {
		const dir = item.dir ?? "sprints/sprint-01";
		const filename = `${item.id}-${item.title.replace(/\s+/g, "-")}.md`;
		const content = [
			"---",
			`id: ${item.id}`,
			`title: ${item.title}`,
			"type: story",
			`status: ${item.status}`,
			`epic: ${item.epic ?? ""}`,
			`layer: ${item.layer ?? "backend"}`,
			`assignee: ${item.assignee ?? "itproto"}`,
			`points: ${item.points ?? "3"}`,
			`blockedBy: ${item.blockedBy ?? "[]"}`,
			`reason: ${item.reason ?? ""}`,
			"---",
			BODY.trimStart(),
		].join("\n");
		await writeFile(join(pmDir, dir, filename), content, "utf8");
	}

	return cwd;
}

async function readItem(cwd: string, dir: string): Promise<string> {
	const entries = await readdir(join(cwd, ".pm", dir));
	return readFile(join(cwd, ".pm", dir, entries[0]), "utf8");
}

function initGitRepo(cwd: string, remote = "git@github.com:octocat/pm-edit.git"): void {
	execFileSync("git", ["init"], { cwd, stdio: "ignore" });
	execFileSync("git", ["remote", "add", "origin", remote], { cwd, stdio: "ignore" });
	execFileSync("git", ["config", "user.name", "Local User"], { cwd, stdio: "ignore" });
}

beforeAll(async () => {
	await rm(TMP_ROOT, { recursive: true, force: true });
});

afterAll(async () => {
	await rm(TMP_ROOT, { recursive: true, force: true });
});

describe("pm edit", () => {
	it("updates multiple supported frontmatter fields and preserves body", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "old title", status: "backlog" }]);

		await run({ cwd, dryRun: false, json: false }, [
			"STORY-001",
			"title:new title",
			"status:review",
			"epic:EPIC-002",
			"layer:frontend",
			"points:8",
			"reason:ready",
		]);

		const content = await readItem(cwd, "sprints/sprint-01");
		expect(content).toContain("title: new title");
		expect(content).toContain("status: review");
		expect(content).toContain("epic: EPIC-002");
		expect(content).toContain("layer: frontend");
		expect(content).toContain("points: 8");
		expect(content).toContain("reason: ready");
		expect(content).toEndWith(BODY);
	});

	it("normalizes blockedBy comma-separated values to bracketed array form", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "edit blockers", status: "backlog" }]);

		await run({ cwd, dryRun: false, json: false }, ["STORY-001", "blockedBy:TASK-002,TASK-003"]);

		const content = await readItem(cwd, "sprints/sprint-01");
		expect(content).toContain("blockedBy: [TASK-002, TASK-003]");
	});

	it("rejects invalid blockedBy entries", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "bad blockers", status: "backlog" }]);

		await expect(
			run({ cwd, dryRun: false, json: false }, ["STORY-001", "blockedBy:TASK-002 not-an-id"]),
		).rejects.toMatchObject({ message: expect.stringContaining("invalid blockedBy item") });
	});

	it("does not write changes in dry-run mode", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "dry run", status: "backlog" }]);

		await run({ cwd, dryRun: true, json: false }, ["STORY-001", "status:done"]);

		const content = await readItem(cwd, "sprints/sprint-01");
		expect(content).toContain("status: backlog");
	});

	it("rejects unknown fields", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "unknown field", status: "backlog" }]);

		await expect(
			run({ cwd, dryRun: false, json: false }, ["STORY-001", "owner:alice"]),
		).rejects.toMatchObject({ message: expect.stringContaining("unknown field") });
	});

	it("resolves assignee:@me using git remote owner", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "assignee me", status: "backlog" }]);
		initGitRepo(cwd);

		await run({ cwd, dryRun: false, json: false }, ["STORY-001", "assignee:@me"]);

		const content = await readItem(cwd, "sprints/sprint-01");
		expect(content).toContain("assignee: octocat");
	});

	it("rejects invalid status values", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "bad status", status: "backlog" }]);

		await expect(
			run({ cwd, dryRun: false, json: false }, ["STORY-001", "status:shipping"]),
		).rejects.toMatchObject({ message: expect.stringContaining("invalid status") });
	});

	it("can edit an item in closed", async () => {
		const cwd = await setupPm([
			{ id: "STORY-001", title: "closed story", status: "closed", dir: "closed", reason: "old" },
		]);

		await run({ cwd, dryRun: false, json: false }, ["STORY-001", "title:reopened later"]);

		const content = await readItem(cwd, "closed");
		expect(content).toContain("title: reopened later");
		expect(content).toContain("status: closed");
	});

	it("can edit an item in done", async () => {
		const cwd = await setupPm([
			{ id: "STORY-001", title: "done story", status: "done", dir: "done", reason: "finished" },
		]);

		await run({ cwd, dryRun: false, json: false }, ["STORY-001", "title:updated later"]);

		const content = await readItem(cwd, "done");
		expect(content).toContain("title: updated later");
		expect(content).toContain("status: done");
	});

	it("fails clearly when duplicate IDs exist across board directories", async () => {
		const cwd = await setupPm([
			{ id: "STORY-001", title: "backlog duplicate", status: "backlog", dir: "backlog" },
			{ id: "STORY-001", title: "done duplicate", status: "done", dir: "done" },
			{ id: "TASK-002", title: "sprint duplicate", status: "review", dir: "sprints/sprint-01" },
			{
				id: "TASK-002",
				title: "closed duplicate",
				status: "closed",
				dir: "closed",
				reason: "duplicate",
			},
			{ id: "STORY-999", title: "target item", status: "review", dir: "sprints/sprint-01" },
		]);

		await expect(
			run({ cwd, dryRun: false, json: false }, ["STORY-999", "status:done"]),
		).rejects.toThrow(/duplicate.*STORY-001.*TASK-002.*fix the board/i);
	});

	it("requires a non-empty reason when setting status to closed", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "closing", status: "review" }]);

		await expect(
			run({ cwd, dryRun: false, json: false }, ["STORY-001", "status:closed"]),
		).rejects.toMatchObject({ message: expect.stringContaining("reason") });
	});

	it("accepts status:closed when a non-empty reason is provided", async () => {
		const cwd = await setupPm([
			{ id: "STORY-001", title: "closing", status: "review", reason: "" },
		]);

		await run({ cwd, dryRun: false, json: false }, [
			"STORY-001",
			"status:closed",
			"reason:duplicate",
		]);

		const content = await readItem(cwd, "sprints/sprint-01");
		expect(content).toContain("status: closed");
		expect(content).toContain("reason: duplicate");
	});

	it("handles Commander variadic updates through the real CLI wiring", async () => {
		const cwd = await setupPm([
			{ id: "STORY-001", title: "cli edit", status: "review", reason: "" },
		]);
		const originalExit = process.exit;
		const originalError = console.error;
		process.exit = ((code?: number) => {
			throw new Error(`process.exit:${code ?? 0}`);
		}) as typeof process.exit;
		console.error = () => {};

		try {
			const program = buildProgram();
			await program.parseAsync(
				["--cwd", cwd, "edit", "STORY-001", "status:closed", "reason:duplicate"],
				{ from: "user" },
			);
		} finally {
			process.exit = originalExit;
			console.error = originalError;
		}

		const content = await readItem(cwd, "sprints/sprint-01");
		expect(content).toContain("status: closed");
		expect(content).toContain("reason: duplicate");
	});

	it("uses the last duplicate field value", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "duplicates", status: "review" }]);

		await run({ cwd, dryRun: false, json: false }, ["STORY-001", "status:review", "status:done"]);

		const content = await readItem(cwd, "sprints/sprint-01");
		expect(content).toContain("status: done");
	});
});
