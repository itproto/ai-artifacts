import { afterEach, beforeEach, describe, expect, it, mock } from "bun:test";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { run, updateStatusInContent } from "./index.ts";

// ─── unit: updateStatusInContent ─────────────────────────────────────────────

describe("updateStatusInContent", () => {
	it("replaces existing status line", () => {
		const content = "---\nid: STORY-001\nstatus: backlog\ntitle: Test\n---\nbody";
		expect(updateStatusInContent(content, "in-progress")).toBe(
			"---\nid: STORY-001\nstatus: in-progress\ntitle: Test\n---\nbody",
		);
	});

	it("handles status at end of frontmatter", () => {
		const content = "---\nid: STORY-001\nstatus: in-progress\n---";
		expect(updateStatusInContent(content, "done")).toBe("---\nid: STORY-001\nstatus: done\n---");
	});

	it("throws if no status line in frontmatter", () => {
		const content = "---\nid: STORY-001\n---\nbody";
		expect(() => updateStatusInContent(content, "done")).toThrow();
	});
});

// ─── integration: run() ───────────────────────────────────────────────────────

const TMP = join(import.meta.dir, "__tmp_status_test__");

async function setupPm(
	stories: Array<{ id: string; title: string; status: string; dir?: string }>,
): Promise<string> {
	const pmDir = join(TMP, ".pm");
	await mkdir(join(pmDir, "backlog"), { recursive: true });
	await mkdir(join(pmDir, "sprints", "sprint-01"), { recursive: true });
	await mkdir(join(pmDir, "closed"), { recursive: true });
	await mkdir(join(pmDir, "done"), { recursive: true });

	for (const s of stories) {
		const subDir = s.dir ?? "sprints/sprint-01";
		const filePath = join(pmDir, subDir, `${s.id}-${s.title.replace(/\s+/g, "-")}.md`);
		const content = `---\nid: ${s.id}\ntitle: ${s.title}\nstatus: ${s.status}\ntype: story\nassignee: \npoints: 3\nblockedBy: []\n---\n## Body\n`;
		await writeFile(filePath, content, "utf8");
	}

	return TMP;
}

beforeEach(async () => {
	await rm(TMP, { recursive: true, force: true });
});

afterEach(async () => {
	await rm(TMP, { recursive: true, force: true });
});

describe("run — exact ID match", () => {
	it("sets status: in-progress for pm start STORY-001", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "backlog" }]);
		await run("in-progress", { cwd, json: false, dryRun: false }, ["STORY-001"]);

		const pmDir = join(cwd, ".pm");
		const files = await import("node:fs/promises").then((m) =>
			m.readdir(join(pmDir, "sprints", "sprint-01")),
		);
		const content = await readFile(join(pmDir, "sprints", "sprint-01", files[0]), "utf8");
		expect(content).toMatch(/^status: in-progress$/m);
	});

	it("sets status: done for pm done STORY-001", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "in-progress" }]);
		await run("done", { cwd, json: false, dryRun: false }, ["STORY-001"]);

		const pmDir = join(cwd, ".pm");
		const files = await import("node:fs/promises").then((m) =>
			m.readdir(join(pmDir, "sprints", "sprint-01")),
		);
		const content = await readFile(join(pmDir, "sprints", "sprint-01", files[0]), "utf8");
		expect(content).toMatch(/^status: done$/m);
	});

	it("sets status: blocked for pm block STORY-001", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "in-progress" }]);
		await run("blocked", { cwd, json: false, dryRun: false }, ["STORY-001"]);

		const pmDir = join(cwd, ".pm");
		const files = await import("node:fs/promises").then((m) =>
			m.readdir(join(pmDir, "sprints", "sprint-01")),
		);
		const content = await readFile(join(pmDir, "sprints", "sprint-01", files[0]), "utf8");
		expect(content).toMatch(/^status: blocked$/m);
	});

	it("sets status: review for pm review STORY-001", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "in-progress" }]);
		await run("review", { cwd, json: false, dryRun: false }, ["STORY-001"]);

		const pmDir = join(cwd, ".pm");
		const files = await import("node:fs/promises").then((m) =>
			m.readdir(join(pmDir, "sprints", "sprint-01")),
		);
		const content = await readFile(join(pmDir, "sprints", "sprint-01", files[0]), "utf8");
		expect(content).toMatch(/^status: review$/m);
	});
});

describe("run — fuzzy match", () => {
	it("finds story by title substring and updates status", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "backlog" }]);
		await run("in-progress", { cwd, json: false, dryRun: false }, ["auth"]);

		const pmDir = join(cwd, ".pm");
		const files = await import("node:fs/promises").then((m) =>
			m.readdir(join(pmDir, "sprints", "sprint-01")),
		);
		const content = await readFile(join(pmDir, "sprints", "sprint-01", files[0]), "utf8");
		expect(content).toMatch(/^status: in-progress$/m);
	});
});

describe("run — pm next lifecycle", () => {
	it("advances backlog → in-progress", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "backlog" }]);
		await run("next", { cwd, json: false, dryRun: false }, ["STORY-001"]);

		const pmDir = join(cwd, ".pm");
		const files = await import("node:fs/promises").then((m) =>
			m.readdir(join(pmDir, "sprints", "sprint-01")),
		);
		const content = await readFile(join(pmDir, "sprints", "sprint-01", files[0]), "utf8");
		expect(content).toMatch(/^status: in-progress$/m);
	});

	it("advances in-progress → review", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "in-progress" }]);
		await run("next", { cwd, json: false, dryRun: false }, ["STORY-001"]);

		const pmDir = join(cwd, ".pm");
		const files = await import("node:fs/promises").then((m) =>
			m.readdir(join(pmDir, "sprints", "sprint-01")),
		);
		const content = await readFile(join(pmDir, "sprints", "sprint-01", files[0]), "utf8");
		expect(content).toMatch(/^status: review$/m);
	});

	it("advances review → done", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "review" }]);
		await run("next", { cwd, json: false, dryRun: false }, ["STORY-001"]);

		const pmDir = join(cwd, ".pm");
		const files = await import("node:fs/promises").then((m) =>
			m.readdir(join(pmDir, "sprints", "sprint-01")),
		);
		const content = await readFile(join(pmDir, "sprints", "sprint-01", files[0]), "utf8");
		expect(content).toMatch(/^status: done$/m);
	});

	it("prints message and exits cleanly when already done", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "done" }]);
		// Should NOT throw — just logs a message
		await expect(
			run("next", { cwd, json: false, dryRun: false }, ["STORY-001"]),
		).resolves.toBeUndefined();
	});
});

describe("run — dry-run", () => {
	it("does not modify file in dry-run mode", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "backlog" }]);
		await run("in-progress", { cwd, json: false, dryRun: true }, ["STORY-001"]);

		const pmDir = join(cwd, ".pm");
		const files = await import("node:fs/promises").then((m) =>
			m.readdir(join(pmDir, "sprints", "sprint-01")),
		);
		const content = await readFile(join(pmDir, "sprints", "sprint-01", files[0]), "utf8");
		// File should be unchanged
		expect(content).toMatch(/^status: backlog$/m);
	});
});

describe("run — error cases", () => {
	it("throws PmError when ID not found", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "backlog" }]);
		await expect(
			run("in-progress", { cwd, json: false, dryRun: false }, ["STORY-999"]),
		).rejects.toMatchObject({ message: expect.stringContaining("STORY-999") });
	});

	it("throws PmError when fuzzy search has no matches", async () => {
		const cwd = await setupPm([{ id: "STORY-001", title: "auth flow", status: "backlog" }]);
		await expect(
			run("in-progress", { cwd, json: false, dryRun: false }, ["xyznonexistent"]),
		).rejects.toMatchObject({ message: expect.stringContaining("xyznonexistent") });
	});

	it("throws PmError when no open stories exist", async () => {
		const cwd = await setupPm([]);
		await expect(
			run("in-progress", { cwd, json: false, dryRun: false }, ["STORY-001"]),
		).rejects.toMatchObject({ exitCode: 1 });
	});
});
