import { execSync } from "node:child_process";
import { readFile, readdir } from "node:fs/promises";
import { join } from "node:path";
import chalk from "chalk";
import { parseFrontmatter } from "./frontmatter.ts";

export type BoardItem = {
	id: string;
	title: string;
	type: "story" | "task";
	status: string;
	assignee: string | undefined;
	points: number | undefined;
	blockedBy: string[];
};

export async function findActiveSprint(cwd: string): Promise<string | null> {
	const sprintsDir = join(cwd, ".pm", "sprints");
	try {
		const dirents = await readdir(sprintsDir, { withFileTypes: true, encoding: "utf8" });
		const names = dirents
			.filter((d) => d.isDirectory() && /^sprint-\d+$/.test(d.name))
			.map((d) => d.name)
			.sort(
				(a, b) =>
					Number.parseInt(a.slice("sprint-".length), 10) -
					Number.parseInt(b.slice("sprint-".length), 10),
			);
		return names.at(-1) ?? null;
	} catch {
		return null;
	}
}

export async function readSprintItems(cwd: string, sprint: string): Promise<BoardItem[]> {
	const sprintDir = join(cwd, ".pm", "sprints", sprint);
	let files: string[];
	try {
		const dirents = await readdir(sprintDir, { withFileTypes: true, encoding: "utf8" });
		files = dirents
			.filter((d) => d.isFile() && d.name.endsWith(".md"))
			.map((d) => d.name)
			.sort((a, b) => a.localeCompare(b));
	} catch {
		return [];
	}

	const contents = await Promise.all(files.map((f) => readFile(join(sprintDir, f), "utf8")));
	const items: BoardItem[] = [];
	for (const content of contents) {
		const fm = parseFrontmatter(content);

		const id = typeof fm.id === "string" ? fm.id : undefined;
		if (!id) continue;

		const rawPoints = typeof fm.points === "string" ? Number.parseInt(fm.points, 10) : undefined;
		const points = rawPoints !== undefined && !Number.isNaN(rawPoints) ? rawPoints : undefined;

		const blockedBy = Array.isArray(fm.blockedBy) ? (fm.blockedBy as string[]) : [];

		items.push({
			id,
			title: typeof fm.title === "string" ? fm.title : "",
			type: fm.type === "task" ? "task" : "story",
			status: typeof fm.status === "string" ? fm.status : "backlog",
			assignee: typeof fm.assignee === "string" && fm.assignee !== "" ? fm.assignee : undefined,
			points,
			blockedBy,
		});
	}
	return items;
}

const STATUS_ORDER = ["in-progress", "blocked", "review", "done", "backlog"];

export const STATUS_ICONS: Record<string, string> = {
	"in-progress": "●",
	blocked: "○",
	review: "◐",
	done: "✓",
	backlog: "·",
};

const STATUS_LABELS: Record<string, string> = {
	"in-progress": "In Progress",
	blocked: "Blocked",
	review: "Review",
	done: "Done",
	backlog: "Backlog",
};

function displayStatus(item: BoardItem): string {
	return item.blockedBy.length > 0 ? "blocked" : item.status;
}

export function groupByStatus(items: BoardItem[]): Map<string, BoardItem[]> {
	const raw = new Map<string, BoardItem[]>();
	for (const item of items) {
		const key = displayStatus(item);
		if (!raw.has(key)) raw.set(key, []);
		raw.get(key)?.push(item);
	}

	const sorted = new Map<string, BoardItem[]>();
	for (const status of STATUS_ORDER) {
		const val = raw.get(status);
		if (val !== undefined) sorted.set(status, val);
	}
	for (const [k, v] of raw) {
		if (!sorted.has(k)) sorted.set(k, v);
	}
	return sorted;
}

export function renderBoard(sprint: string, grouped: Map<string, BoardItem[]>): string {
	const lines: string[] = [chalk.bold(`Sprint ${sprint}`), ""];

	for (const [status, items] of grouped) {
		const icon = STATUS_ICONS[status] ?? "?";
		const label = STATUS_LABELS[status] ?? status;
		lines.push(`${icon} ${chalk.bold(label)}`);
		for (const item of items) {
			lines.push(renderItem(item));
		}
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}

function renderItem(item: BoardItem): string {
	const id = item.id.padEnd(10);
	const title = item.title.slice(0, 45).padEnd(45);
	const assignee = (item.assignee ?? "").padEnd(12);
	const points = item.type === "story" && item.points != null ? `${item.points}pt` : "   ";
	const blocked = item.blockedBy.length > 0 ? chalk.dim(`  ← ${item.blockedBy.join(", ")}`) : "";
	return `  ${id}  ${title}  ${assignee}  ${points}${blocked}`.trimEnd();
}

export function matchesAssignee(assignee: string | undefined, user: string): boolean {
	if (!assignee) return false;
	const normalize = (s: string) => s.replace(/^@/, "").toLowerCase();
	return normalize(assignee) === normalize(user);
}

export function resolveCurrentUser(cwd: string): string | null {
	// Prefer GitHub username extracted from remote URL (e.g. github.com/itproto/repo → itproto)
	try {
		const remote = execSync("git remote get-url origin", { cwd, encoding: "utf8" }).trim();
		const match = remote.match(/github\.com[:/]([^/]+)\//);
		if (match) return match[1];
	} catch {
		// fall through
	}
	// Fallback to git config user.name
	try {
		return execSync("git config user.name", { cwd, encoding: "utf8" }).trim();
	} catch {
		return null;
	}
}
