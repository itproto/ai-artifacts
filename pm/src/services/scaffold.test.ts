import { afterEach, beforeEach, describe, expect, test } from "bun:test";
import { mkdtemp, readdir, rm, stat } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PmError, ScaffoldService } from "./scaffold.ts";

const baseOpts = { json: false, dryRun: false };

describe("ScaffoldService.init", () => {
	let tmpDir: string;

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), "pm-test-"));
	});

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true });
	});

	test("creates .pm/ directory", async () => {
		const result = await ScaffoldService.init({ ...baseOpts, cwd: tmpDir });
		const s = await stat(join(tmpDir, ".pm"));
		expect(s.isDirectory()).toBe(true);
		expect(result.success).toBe(true);
		expect(result.dryRun).toBe(false);
	});

	test("filesCreated is greater than zero", async () => {
		const result = await ScaffoldService.init({ ...baseOpts, cwd: tmpDir });
		expect(result.filesCreated).toBeGreaterThan(0);
	});

	test("throws PmError if .pm/ already exists", async () => {
		await ScaffoldService.init({ ...baseOpts, cwd: tmpDir });
		await expect(ScaffoldService.init({ ...baseOpts, cwd: tmpDir })).rejects.toBeInstanceOf(
			PmError,
		);
	});

	test("dry-run returns result without creating .pm/", async () => {
		const result = await ScaffoldService.init({ ...baseOpts, dryRun: true, cwd: tmpDir });
		expect(result.dryRun).toBe(true);
		expect(result.filesCreated).toBe(0);
		await expect(stat(join(tmpDir, ".pm"))).rejects.toThrow();
	});

	test("no .gitkeep files present in .pm/ after init", async () => {
		await ScaffoldService.init({ ...baseOpts, cwd: tmpDir });
		const entries = await readdir(join(tmpDir, ".pm"), {
			recursive: true,
			withFileTypes: true,
		});
		const gitkeeps = entries.filter((e) => e.isFile() && e.name === ".gitkeep");
		expect(gitkeeps).toHaveLength(0);
	});

	test("backlog/ directory exists in .pm/", async () => {
		await ScaffoldService.init({ ...baseOpts, cwd: tmpDir });
		const s = await stat(join(tmpDir, ".pm", "backlog"));
		expect(s.isDirectory()).toBe(true);
	});

	test("throws PmError for non-existent cwd", async () => {
		await expect(
			ScaffoldService.init({ ...baseOpts, cwd: "/nonexistent/path/abc123" }),
		).rejects.toBeInstanceOf(PmError);
	});
});
