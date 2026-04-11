import { join } from "node:path";
import chalk from "chalk";
import { z } from "zod";
import { GlobalOptsSchema } from "../../schemas/options.ts";
import {
	type BoardItem,
	STATUS_ICONS,
	findActiveSprint,
	matchesAssignee,
	readItemsFromDir,
	readSprintItems,
	resolveCurrentUser,
} from "../../services/board.ts";
import { PmError } from "../../services/scaffold.ts";
import { type BoardConfig, loadBoardConfig, resolveColumn } from "./board-config.ts";

const LsOptsSchema = GlobalOptsSchema.extend({
	me: z.boolean().default(false),
	board: z.string().default("default"),
});

export async function run(rawOpts: Record<string, unknown>): Promise<void> {
	const opts = LsOptsSchema.parse(rawOpts);

	const sprint = await findActiveSprint(opts.cwd);
	if (!sprint) {
		console.log("No active sprint");
		return;
	}

	const config = await loadBoardConfig(opts.cwd, opts.board);
	let items = await loadSource(opts.cwd, config.source, sprint);
	items = applyFilters(items, config, opts.cwd, opts.me);

	console.log(renderBoardConfig(sprint, config, items));
}

async function loadSource(cwd: string, source: string, activeSprint: string): Promise<BoardItem[]> {
	if (source === "active-sprint") {
		return readSprintItems(cwd, activeSprint);
	}
	if (/^sprint-\d+$/.test(source)) {
		return readSprintItems(cwd, source);
	}
	if (source === "backlog") {
		return readItemsFromDir(join(cwd, ".pm", "backlog"));
	}
	if (source === "all") {
		const [sprintItems, backlogItems] = await Promise.all([
			readSprintItems(cwd, activeSprint),
			readItemsFromDir(join(cwd, ".pm", "backlog")),
		]);
		return [...sprintItems, ...backlogItems];
	}
	throw new PmError(`unknown board source: "${source}"`, 1);
}

function applyFilters(
	items: BoardItem[],
	config: BoardConfig,
	cwd: string,
	meFlag: boolean,
): BoardItem[] {
	let result = items;

	const assigneeFilter = config.filters?.assignee;
	if (meFlag || assigneeFilter === "me") {
		const user = resolveCurrentUser(cwd);
		if (!user) {
			throw new PmError(
				"Error: could not resolve current user from GitHub remote URL or git config user.name",
				1,
			);
		}
		result = result.filter((item) => matchesAssignee(item.assignee, user));
	} else if (assigneeFilter) {
		result = result.filter((item) => matchesAssignee(item.assignee, assigneeFilter));
	}

	if (config.filters?.statuses) {
		result = result.filter((item) => config.filters!.statuses!.includes(item.status));
	}

	if (config.filters?.type) {
		result = result.filter((item) => item.type === config.filters!.type);
	}

	return result;
}

function renderBoardConfig(sprint: string, config: BoardConfig, items: BoardItem[]): string {
	const lines: string[] = [chalk.bold(`Sprint ${sprint}`), ""];

	for (const colDef of config.columns) {
		const { label, statuses } = resolveColumn(colDef);
		const colItems = items.filter((item) => statuses.includes(item.status));
		const icon = STATUS_ICONS[statuses[0]] ?? "·";
		lines.push(`${icon} ${chalk.bold(label)}`);
		for (const item of colItems) {
			lines.push(renderItemFields(item, config.fields));
		}
		lines.push("");
	}

	return lines.join("\n").trimEnd();
}

function renderItemFields(item: BoardItem, fields: string[]): string {
	const parts: string[] = [];
	for (const field of fields) {
		switch (field) {
			case "id":
				parts.push(item.id.padEnd(10));
				break;
			case "title":
				parts.push(item.title.slice(0, 45).padEnd(45));
				break;
			case "assignee":
				parts.push((item.assignee ?? "").padEnd(12));
				break;
			case "points":
				parts.push(
					item.type === "story" && item.points != null ? `${item.points}pt` : "   ",
				);
				break;
		}
	}
	return `  ${parts.join("  ")}`.trimEnd();
}
