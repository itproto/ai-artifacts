import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import * as readline from "node:readline/promises";
import { GlobalOptsSchema } from "../../schemas/options.ts";
import type { BoardItem } from "../../services/board.ts";
import { closeStory, findStoryFile } from "../../services/close.ts";
import { parseFrontmatter } from "../../services/frontmatter.ts";
import { PmError } from "../../services/scaffold.ts";
import { fuzzySearch, isExactId } from "../../services/search.ts";

const RmOptsSchema = GlobalOptsSchema.extend({});

export async function run(rawOpts: Record<string, unknown>, args?: string[]): Promise<void> {
	const opts = RmOptsSchema.parse(rawOpts);
	const pmDir = join(opts.cwd, ".pm");
	const query = args?.[0];
	const reasonArg = args?.[1];

	const items = await loadOpenItems(pmDir);

	if (items.length === 0) {
		console.log("No open stories or tasks found.");
		return;
	}

	// Resolve which item to close
	let selected: BoardItem;

	if (!query) {
		selected = await pickFromList(items, "Select story to close:");
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

	// Resolve reason
	const reason = reasonArg ?? (await promptReason());

	if (opts.dryRun) {
		console.log(
			`dry-run  would close ${selected.id}  ${selected.title}  (${reason || "no reason"})`,
		);
		return;
	}

	const filePath = await findStoryFile(pmDir, selected.id);
	if (!filePath) throw new PmError(`Error: file for ${selected.id} not found on disk.`, 1);

	const result = await closeStory(pmDir, filePath, reason);
	console.log(`closed   ${result.to}${reason ? `  (${reason})` : ""}`);
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
					assignee: typeof fm.assignee === "string" && fm.assignee !== "" ? fm.assignee : undefined,
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

async function promptReason(): Promise<string> {
	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = await rl.question("Reason (blank to skip): ");
		return answer.trim();
	} finally {
		rl.close();
	}
}
