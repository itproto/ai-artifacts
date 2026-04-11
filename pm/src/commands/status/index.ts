import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as readline from "node:readline/promises";
import { GlobalOptsSchema } from "../../schemas/options.ts";
import type { BoardItem } from "../../services/board.ts";
import { parseFrontmatter } from "../../services/frontmatter.ts";
import { PmError } from "../../services/scaffold.ts";
import { fuzzySearch, isExactId } from "../../services/search.ts";

// Real status values written to frontmatter
export type StatusValue = "backlog" | "in-progress" | "blocked" | "review" | "done";

// CLI argument — "next" is a control word, not a status
export type StatusArg = StatusValue | "next";

const LIFECYCLE: StatusValue[] = ["backlog", "in-progress", "review", "done"];

export function updateStatusInContent(content: string, status: string): string {
	if (!/^status:\s*.*/m.test(content)) {
		throw new PmError("Error: no status field found in frontmatter.", 1);
	}
	return content.replace(/^(status:\s*).*$/m, `$1${status}`);
}

function nextStatus(current: string): StatusValue | null {
	const idx = LIFECYCLE.indexOf(current as StatusValue);
	if (idx === -1 || idx === LIFECYCLE.length - 1) return null;
	return LIFECYCLE[idx + 1];
}

type ItemWithPath = { item: BoardItem; filePath: string };

async function loadOpenItems(pmDir: string): Promise<ItemWithPath[]> {
	const results: ItemWithPath[] = [];

	async function scanDir(dir: string): Promise<void> {
		let entries: import("node:fs").Dirent[];
		try {
			entries = await readdir(dir, { withFileTypes: true, encoding: "utf8" });
		} catch {
			return;
		}

		const subdirs = entries.filter((e) => e.isDirectory()).map((e) => join(dir, e.name));
		const files = entries
			.filter((e) => e.isFile() && e.name.endsWith(".md"))
			.map((e) => join(dir, e.name));

		await Promise.all(subdirs.map(scanDir));

		const contents = await Promise.all(files.map((f) => readFile(f, "utf8")));
		for (let i = 0; i < files.length; i++) {
			const filePath = files[i];
			const fm = parseFrontmatter(contents[i]);
			const id = typeof fm.id === "string" ? fm.id : undefined;
			if (!id) continue;
			const status = typeof fm.status === "string" ? fm.status : "backlog";
			if (status === "closed") continue;
			results.push({
				filePath,
				item: {
					id,
					title: typeof fm.title === "string" ? fm.title : "",
					type: fm.type === "task" ? "task" : "story",
					status,
					assignee:
						typeof fm.assignee === "string" && fm.assignee !== "" ? fm.assignee : undefined,
					points: undefined,
					blockedBy: [],
				},
			});
		}
	}

	await Promise.all([scanDir(join(pmDir, "backlog")), scanDir(join(pmDir, "sprints"))]);

	return results;
}

async function pickFromList(items: BoardItem[], prompt: string): Promise<BoardItem> {
	console.log(`\n${prompt}`);
	for (let i = 0; i < items.length; i++) {
		const item = items[i];
		const assignee = item.assignee ? `  ${item.assignee}` : "";
		console.log(
			`  ${String(i + 1).padStart(2)}  ${item.id.padEnd(10)}  ${item.title.slice(0, 50)}${assignee}`,
		);
	}
	console.log();

	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = await rl.question(`Pick 1-${items.length}: `);
		const n = Number.parseInt(answer.trim(), 10);
		if (Number.isNaN(n) || n < 1 || n > items.length) {
			throw new PmError("Error: invalid selection.", 1);
		}
		return items[n - 1];
	} finally {
		rl.close();
	}
}

export async function run(
	statusArg: StatusArg,
	rawOpts: Record<string, unknown>,
	args?: string[],
): Promise<void> {
	const opts = GlobalOptsSchema.parse(rawOpts);
	const pmDir = join(opts.cwd, ".pm");
	const query = args?.[0];

	const loaded = await loadOpenItems(pmDir);

	if (loaded.length === 0) {
		throw new PmError("Error: no open stories or tasks found.", 1);
	}

	const items = loaded.map((l) => l.item);

	let selected: BoardItem;

	if (!query) {
		selected = await pickFromList(items, "Select story to update:");
	} else if (isExactId(query)) {
		const match = items.find((i) => i.id.toUpperCase() === query.toUpperCase());
		if (!match) throw new PmError(`Error: ${query.toUpperCase()} not found in open stories.`, 1);
		selected = match;
	} else {
		const results = fuzzySearch(items, query);
		if (results.length === 0) throw new PmError(`Error: no stories matching "${query}"`, 1);
		if (results.length === 1) {
			selected = results[0].item;
			console.log(`matched  ${selected.id}  ${selected.title}`);
		} else {
			selected = await pickFromList(
				results.map((r) => r.item),
				`Found ${results.length} matches:`,
			);
		}
	}

	let targetStatus: StatusValue;

	if (statusArg === "next") {
		const next = nextStatus(selected.status);
		if (!next) {
			console.log(`${selected.id} is already done — nothing to advance.`);
			return;
		}
		targetStatus = next;
	} else {
		targetStatus = statusArg;
	}

	if (opts.dryRun) {
		console.log(`dry-run  would set ${selected.id}  ${selected.title}  → ${targetStatus}`);
		return;
	}

	// Reuse path cached during scan — avoids a second directory traversal
	const filePath = loaded.find((l) => l.item.id === selected.id)?.filePath;
	if (!filePath) throw new PmError(`Error: file for ${selected.id} not found on disk.`, 1);

	const content = await readFile(filePath, "utf8");
	const updated = updateStatusInContent(content, targetStatus);
	await writeFile(filePath, updated, "utf8");

	console.log(`updated  ${selected.id}  ${targetStatus}`);
}
