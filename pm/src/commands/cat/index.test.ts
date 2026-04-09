import { afterEach, describe, expect, it } from "bun:test";
import { access, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { run } from "./index.ts";

let tmpDir: string;

const STORY_001 = `---
id: STORY-001
title: pm ls — show sprint board in terminal
type: story
status: done
assignee: itproto
points: 2
blockedBy: []
reason:
---

## User Story
As a developer, I can run \`pm ls\`.

## Acceptance Criteria
None yet.
`;

const STORY_002 = `---
id: STORY-002
title: pm new — quick-capture story creation
type: story
status: done
assignee: itproto
points: 5
blockedBy: []
reason:
---

## User Story
As a developer, I can run \`pm new\`.
`;

const STORY_003 = `---
id: STORY-003
title: pm rm — close story with fuzzy search
type: story
status: in-progress
assignee: itproto
points: 3
blockedBy: []
reason:
---

## User Story
As a developer, I can run \`pm rm\`.
`;

async function makeBoard(): Promise<string> {
	tmpDir = await mkdtemp(join(tmpdir(), "pm-cat-test-"));
	const pmDir = join(tmpDir, ".pm");
	await mkdir(join(pmDir, "sprints", "sprint-01"), { recursive: true });
	await mkdir(join(pmDir, "backlog"), { recursive: true });
	await mkdir(join(pmDir, "done"), { recursive: true });
	await mkdir(join(pmDir, "closed"), { recursive: true });
	await writeFile(join(pmDir, "sprints", "sprint-01", "STORY-001-pm-ls.md"), STORY_001);
	await writeFile(join(pmDir, "sprints", "sprint-01", "STORY-002-pm-new.md"), STORY_002);
	await writeFile(join(pmDir, "done", "STORY-003-pm-rm.md"), STORY_003);
	return tmpDir;
}

async function captureStdout(fn: () => Promise<void>): Promise<string> {
	let output = "";
	const original = process.stdout.write.bind(process.stdout);
	process.stdout.write = (chunk: string | Uint8Array) => {
		output += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
		return true;
	};
	try {
		await fn();
		return output;
	} finally {
		process.stdout.write = original;
	}
}

afterEach(async () => {
	if (tmpDir) await rm(tmpDir, { recursive: true, force: true });
});

describe("pm cat — exact ID", () => {
	it("prints full markdown content to stdout", async () => {
		const cwd = await makeBoard();
		const out = await captureStdout(() => run({ cwd, open: false }, ["STORY-001"]));
		expect(out).toContain("id: STORY-001");
		expect(out).toContain("pm ls — show sprint board in terminal");
		expect(out).toContain("## Acceptance Criteria");
	});

	it("is case-insensitive for exact ID", async () => {
		const cwd = await makeBoard();
		const out = await captureStdout(() => run({ cwd, open: false }, ["story-001"]));
		expect(out).toContain("id: STORY-001");
	});

	it("scans done/ folder too", async () => {
		const cwd = await makeBoard();
		const out = await captureStdout(() => run({ cwd, open: false }, ["STORY-003"]));
		expect(out).toContain("id: STORY-003");
		expect(out).toContain("pm rm");
	});
});

describe("pm cat — fuzzy match", () => {
	it("auto-picks single fuzzy match and prints content", async () => {
		const cwd = await makeBoard();
		// "sprint board" uniquely matches only STORY-001's title
		const out = await captureStdout(() => run({ cwd, open: false }, ["sprint board"]));
		expect(out).toContain("id: STORY-001");
	});
});

describe("pm cat — no match", () => {
	it('throws PmError with "no stories matching" message', async () => {
		const cwd = await makeBoard();
		await expect(run({ cwd, open: false }, ["xyznonexistent"])).rejects.toThrow(
			'no stories matching "xyznonexistent"',
		);
	});
});

describe("pm cat — open in editor (-o flag)", () => {
	it("invokes $EDITOR with the story file path", async () => {
		const cwd = await makeBoard();
		const markerFile = join(tmpDir, "editor-invoked");
		const fakeEditor = join(tmpDir, "fake-editor.sh");
		await writeFile(fakeEditor, `#!/bin/sh\ntouch ${markerFile}\n`, { mode: 0o755 });
		const origEditor = process.env.EDITOR;
		process.env.EDITOR = fakeEditor;
		try {
			await run({ cwd, open: true }, ["STORY-001"]);
			const invoked = await access(markerFile)
				.then(() => true)
				.catch(() => false);
			expect(invoked).toBe(true);
		} finally {
			process.env.EDITOR = origEditor;
		}
	});
});

describe("pm cat — interactive picker", () => {
	it("lists all stories and picks by number", async () => {
		const cwd = await makeBoard();
		// Pipe "1\n" to stdin so the picker selects the first story
		const originalStdin = process.stdin;
		const { Readable } = await import("node:stream");
		const mockStdin = new Readable({ read() {} });
		Object.defineProperty(process, "stdin", { value: mockStdin, configurable: true });
		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...a) => logs.push(a.join(" "));
		let out = "";
		const originalWrite = process.stdout.write.bind(process.stdout);
		process.stdout.write = (chunk: string | Uint8Array) => {
			out += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
			return true;
		};
		try {
			const runPromise = run({ cwd, open: false }, []);
			// Push the selection after the prompt is shown
			await new Promise((r) => setTimeout(r, 10));
			mockStdin.push("1\n");
			await runPromise;
			// Should have listed stories
			expect(logs.some((l) => l.includes("STORY-"))).toBe(true);
			// Should have printed the selected story
			expect(out).toContain("id: STORY-");
		} finally {
			Object.defineProperty(process, "stdin", { value: originalStdin, configurable: true });
			console.log = origLog;
			process.stdout.write = originalWrite;
		}
	});

	it("shows numbered list when multiple fuzzy matches", async () => {
		const cwd = await makeBoard();
		// "pm" matches all 3 stories — should show picker
		const originalStdin = process.stdin;
		const { Readable } = await import("node:stream");
		const mockStdin = new Readable({ read() {} });
		Object.defineProperty(process, "stdin", { value: mockStdin, configurable: true });
		const logs: string[] = [];
		const origLog = console.log;
		console.log = (...a) => logs.push(a.join(" "));
		let out = "";
		const originalWrite = process.stdout.write.bind(process.stdout);
		process.stdout.write = (chunk: string | Uint8Array) => {
			out += typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
			return true;
		};
		try {
			const runPromise = run({ cwd, open: false }, ["pm"]);
			await new Promise((r) => setTimeout(r, 10));
			mockStdin.push("2\n");
			await runPromise;
			// Should have shown a numbered list
			expect(logs.some((l) => /\d+\s+STORY-/.test(l))).toBe(true);
			expect(out).toContain("id: STORY-");
		} finally {
			Object.defineProperty(process, "stdin", { value: originalStdin, configurable: true });
			console.log = origLog;
			process.stdout.write = originalWrite;
		}
	});
});
