import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as readline from "node:readline/promises";
import type { GlobalOpts } from "../../schemas/options.ts";
import { GlobalOptsSchema } from "../../schemas/options.ts";
import type { BoardItem } from "../../services/board.ts";
import { findStoryFile } from "../../services/close.ts";
import { parseFrontmatter } from "../../services/frontmatter.ts";
import { PmError } from "../../services/scaffold.ts";
import { fuzzySearch, isExactId } from "../../services/search.ts";

export type StatusValue = "in-progress" | "done" | "blocked" | "review" | "next";

const LIFECYCLE: string[] = ["backlog", "in-progress", "review", "done"];

export function updateStatusInContent(content: string, status: string): string {
	if (!/^status:\s*.*/m.test(content)) {
		throw new PmError("Error: no status field found in frontmatter.", 1);
	}
	return content.replace(/^(status:\s*).*$/m, `$1${status}`);
}

function nextStatus(current: string): string | null {
	const idx = LIFECYCLE.indexOf(current);
	if (idx === -1 || idx === LIFECYCLE.length - 1) return null;
	return LIFECYCLE[idx + 1];
}

async function loadOpenItems(pmDir: string): Promise<BoardItem[]> {
	const items: BoardItem[] = [];

	async function scanDir(dir: string): Promise<void> {
		let entries: import("node:fs").Dirent[];
		try {
			entries = await readdir(dir, { withFileTypes: true, encoding: "utf8" });
		} catch {
			return;
		}
		for (const entry of entries) {
			if (entry.isDirectory()) {
				await scanDir(join(dir, entry.name));
			} else if (entry.isFile() && entry.name.endsWith(".md")) {
				const content = await readFile(join(dir, entry.name), "utf8");
				const fm = parseFrontmatter(content);
				const id = typeof fm.id === "string" ? fm.id : undefined;
				if (!id) continue;
				const status = typeof fm.status === "string" ? fm.status : "backlog";
				if (status === "closed") continue;
				items.push({
					id,
					title: typeof fm.title === "string" ? fm.title : "",
					type: fm.type === "task" ? "task" : "story",
					status,
					assignee:
						typeof fm.assignee === "string" && fm.assignee !== "" ? fm.assignee : undefined,
					points: undefined,
					blockedBy: [],
				});
			}
		}
	}

	await scanDir(join(pmDir, "backlog"));
	await scanDir(join(pmDir, "sprints"));

	return items;
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
	statusArg: StatusValue | string,
	rawOpts: Record<string, unknown>,
	args?: string[],
): Promise<void> {
	const opts = GlobalOptsSchema.parse(rawOpts);
	const pmDir = join(opts.cwd, ".pm");
	const query = args?.[0];

	const items = await loadOpenItems(pmDir);

	if (items.length === 0) {
		throw new PmError("Error: no open stories or tasks found.", 1);
	}

	// Resolve which item to update
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

	// Determine target status
	let targetStatus: string;

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

	// Find file and update
	const filePath = await findStoryFile(pmDir, selected.id);
	if (!filePath) throw new PmError(`Error: file for ${selected.id} not found on disk.`, 1);

	const content = await readFile(filePath, "utf8");
	const updated = updateStatusInContent(content, targetStatus);
	await writeFile(filePath, updated, "utf8");

	console.log(`updated  ${selected.id}  ${targetStatus}`);
}
