import { readFile, readdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import * as readline from "node:readline/promises";
import { GlobalOptsSchema } from "../../schemas/options.ts";
import { type BoardItem, resolveCurrentUser } from "../../services/board.ts";
import { parseFrontmatter, replaceFrontmatterFields } from "../../services/frontmatter.ts";
import { PmError } from "../../services/scaffold.ts";
import { fuzzySearch, isExactId } from "../../services/search.ts";

const SCAN_DIRS = ["backlog", "sprints", "done", "closed"];
const SUPPORTED_FIELDS = new Set([
	"title",
	"status",
	"epic",
	"layer",
	"assignee",
	"points",
	"blockedBy",
	"reason",
]);
const STATUS_VALUES = new Set(["backlog", "in-progress", "blocked", "review", "done", "closed"]);
const LAYER_VALUES = new Set(["frontend", "backend", "fullstack"]);
const WORK_ITEM_ID_PATTERN = /^(STORY|TASK|EPIC)-\d+$/i;

type FrontmatterUpdateValue = string | string[];
type ItemWithPath = { item: BoardItem; filePath: string };
type EditArg = string | EditArg[] | Record<string, unknown>;

export async function run(rawOpts: Record<string, unknown>, args?: EditArg[]): Promise<void> {
	const opts = GlobalOptsSchema.parse(rawOpts);
	const normalizedArgs = flattenEditArgs(args ?? []);
	const query = normalizedArgs[0];
	const rawUpdates = normalizedArgs.slice(1);

	if (typeof query !== "string" || query.length === 0) {
		throw new PmError(
			"Error: query argument is required.\n  Usage: pm edit <id|query> key:value [key:value ...]",
			1,
		);
	}

	if (rawUpdates.length === 0) {
		throw new PmError(
			"Error: at least one field update is required.\n  Usage: pm edit <id|query> key:value [key:value ...]",
			1,
		);
	}

	const loaded = await loadAllItems(join(opts.cwd, ".pm"));
	if (loaded.length === 0) {
		throw new PmError("Error: no stories or tasks found.", 1);
	}

	const selected = await selectItem(
		loaded.map((entry) => entry.item),
		query,
	);
	const filePath = loaded.find((entry) => entry.item.id === selected.id)?.filePath;
	if (!filePath) throw new PmError(`Error: file for ${selected.id} not found on disk.`, 1);

	const updates = parseUpdates(rawUpdates, opts.cwd);

	if (
		updates.status === "closed" &&
		(typeof updates.reason !== "string" || updates.reason.trim() === "")
	) {
		throw new PmError(
			'Error: reason is required when setting status:closed. Use reason:"..." in the same command.',
			1,
		);
	}

	if (opts.dryRun) {
		console.log(`dry-run  would update ${selected.id}`);
		return;
	}

	const content = await readFile(filePath, "utf8");
	let updated: string;
	try {
		updated = replaceFrontmatterFields(content, updates);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		throw new PmError(`Error: could not update ${selected.id}: ${message}`, 1);
	}
	await writeFile(filePath, updated, "utf8");

	console.log(`updated  ${selected.id}`);
}

function flattenEditArgs(args: EditArg[]): string[] {
	return args.flatMap((arg) => {
		if (Array.isArray(arg)) return flattenEditArgs(arg);
		return typeof arg === "string" ? [arg] : [];
	});
}

async function selectItem(items: BoardItem[], query: string): Promise<BoardItem> {
	if (isExactId(query)) {
		const match = items.find((item) => item.id.toUpperCase() === query.toUpperCase());
		if (!match) throw new PmError(`Error: ${query.toUpperCase()} not found.`, 1);
		return match;
	}

	const results = fuzzySearch(items, query);
	if (results.length === 0) throw new PmError(`Error: no stories matching "${query}"`, 1);
	if (results.length === 1) return results[0].item;
	return pickFromList(
		results.map((result) => result.item),
		`Found ${results.length} matches:`,
	);
}

function parseUpdates(rawUpdates: string[], cwd: string): Record<string, FrontmatterUpdateValue> {
	const updates: Record<string, FrontmatterUpdateValue> = {};

	for (const rawUpdate of rawUpdates) {
		const colonIndex = rawUpdate.indexOf(":");
		if (colonIndex === -1) {
			throw new PmError(`Error: invalid update "${rawUpdate}". Expected key:value.`, 1);
		}

		const field = rawUpdate.slice(0, colonIndex).trim();
		const value = rawUpdate.slice(colonIndex + 1).trim();
		if (!SUPPORTED_FIELDS.has(field)) {
			throw new PmError(`Error: unknown field "${field}".`, 1);
		}

		switch (field) {
			case "status":
				updates[field] = parseStatus(value);
				break;
			case "layer":
				updates[field] = parseLayer(value);
				break;
			case "assignee":
				updates[field] = parseAssignee(value, cwd);
				break;
			case "points":
				updates[field] = parsePoints(value);
				break;
			case "blockedBy":
				updates[field] = parseBlockedBy(value);
				break;
			default:
				updates[field] = value;
		}
	}

	return updates;
}

function parseStatus(value: string): string {
	const normalized = value.toLowerCase();
	if (!STATUS_VALUES.has(normalized)) {
		throw new PmError(`Error: invalid status "${value}".`, 1);
	}
	return normalized;
}

function parseLayer(value: string): string {
	const normalized = value.toLowerCase();
	if (!LAYER_VALUES.has(normalized)) {
		throw new PmError(`Error: invalid layer "${value}".`, 1);
	}
	return normalized;
}

function parseAssignee(value: string, cwd: string): string {
	if (value !== "@me") return value;
	const user = resolveCurrentUser(cwd);
	if (!user) {
		throw new PmError("Error: could not resolve current user from GitHub remote or git config.", 1);
	}
	return user;
}

function parsePoints(value: string): string {
	if (!/^\d+$/.test(value)) {
		throw new PmError(`Error: invalid points "${value}".`, 1);
	}
	return value;
}

function parseBlockedBy(value: string): string[] {
	const trimmed = value.trim();
	if (trimmed === "[]") return [];

	const inner =
		trimmed.startsWith("[") && trimmed.endsWith("]") ? trimmed.slice(1, -1).trim() : trimmed;
	if (inner === "") return [];
	const entries = inner
		.split(",")
		.map((entry) => entry.trim())
		.filter((entry) => entry.length > 0);

	for (const entry of entries) {
		if (!WORK_ITEM_ID_PATTERN.test(entry)) {
			throw new PmError(
				`Error: invalid blockedBy item "${entry}". Expected STORY-001/TASK-001/EPIC-001.`,
				1,
			);
		}
	}

	return entries;
}

async function loadAllItems(pmDir: string): Promise<ItemWithPath[]> {
	const results: ItemWithPath[] = [];

	async function scanDir(dir: string): Promise<void> {
		let entries: import("node:fs").Dirent[];
		try {
			entries = await readdir(dir, { withFileTypes: true, encoding: "utf8" });
		} catch {
			return;
		}

		const subdirs = entries
			.filter((entry) => entry.isDirectory())
			.map((entry) => join(dir, entry.name));
		const files = entries
			.filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
			.map((entry) => join(dir, entry.name));

		await Promise.all(subdirs.map(scanDir));

		const contents = await Promise.all(files.map((file) => readFile(file, "utf8")));
		for (let index = 0; index < files.length; index++) {
			const filePath = files[index];
			const frontmatter = parseFrontmatter(contents[index]);
			const id = typeof frontmatter.id === "string" ? frontmatter.id : undefined;
			if (!id) continue;
			results.push({
				filePath,
				item: {
					id,
					title: typeof frontmatter.title === "string" ? frontmatter.title : "",
					type: frontmatter.type === "task" ? "task" : "story",
					status: typeof frontmatter.status === "string" ? frontmatter.status : "backlog",
					assignee:
						typeof frontmatter.assignee === "string" && frontmatter.assignee !== ""
							? frontmatter.assignee
							: undefined,
					points: undefined,
					blockedBy: Array.isArray(frontmatter.blockedBy)
						? (frontmatter.blockedBy as string[])
						: [],
				},
			});
		}
	}

	await Promise.all(SCAN_DIRS.map((dir) => scanDir(join(pmDir, dir))));
	assertNoDuplicateIds(results);
	return results;
}

function assertNoDuplicateIds(items: ItemWithPath[]): void {
	const counts = new Map<string, number>();
	for (const entry of items) {
		counts.set(entry.item.id, (counts.get(entry.item.id) ?? 0) + 1);
	}

	const duplicates = [...counts.entries()]
		.filter(([, count]) => count > 1)
		.map(([id]) => id)
		.sort((a, b) => a.localeCompare(b));
	if (duplicates.length === 0) return;

	throw new PmError(
		`Error: duplicate work item IDs found across board files: ${duplicates.join(", ")}. Please fix the board before editing.`,
		1,
	);
}

async function pickFromList(items: BoardItem[], prompt: string): Promise<BoardItem> {
	console.log(`\n${prompt}`);
	for (let index = 0; index < items.length; index++) {
		const item = items[index];
		const status = item.status.padEnd(12);
		console.log(
			`  ${String(index + 1).padStart(2)}  ${item.id.padEnd(10)}  ${status}  ${item.title.slice(0, 50)}`,
		);
	}
	console.log();

	const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
	try {
		const answer = await rl.question(`Pick 1-${items.length}: `);
		const selection = Number.parseInt(answer.trim(), 10);
		if (Number.isNaN(selection) || selection < 1 || selection > items.length) {
			throw new PmError("Error: invalid selection.", 1);
		}
		return items[selection - 1];
	} finally {
		rl.close();
	}
}
