import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";

export type ColumnDef = string | { label: string; statuses: string[] };

export type BoardConfig = {
	source: string;
	columns: ColumnDef[];
	fields: string[];
	filters?: {
		assignee?: string;
		statuses?: string[];
		type?: "story" | "task";
	};
};

const DEFAULT_FIELDS = ["id", "title", "assignee", "points"];

export function normalizeBoardConfig(raw: Record<string, unknown>): BoardConfig {
	if (!Array.isArray(raw.columns) || raw.columns.length === 0) {
		throw new Error("board config: 'columns' is required and must be non-empty");
	}
	return {
		source: typeof raw.source === "string" ? raw.source : "active-sprint",
		columns: raw.columns as ColumnDef[],
		fields: Array.isArray(raw.fields) ? (raw.fields as string[]) : DEFAULT_FIELDS,
		filters:
			typeof raw.filters === "object" && raw.filters !== null
				? (raw.filters as BoardConfig["filters"])
				: undefined,
	};
}

export async function loadBoardConfig(cwd: string, name: string): Promise<BoardConfig> {
	const filePath = join(cwd, ".pm", "boards", `${name}.yaml`);
	let content: string;
	try {
		content = await readFile(filePath, "utf8");
	} catch {
		if (name === "default") {
			throw new Error(
				"Error: no default board found. Create .pm/boards/default.yaml to get started.",
			);
		}
		throw new Error(`board "${name}" not found at .pm/boards/${name}.yaml`);
	}
	let raw: unknown;
	try {
		raw = parse(content);
	} catch (e) {
		throw new Error(`invalid YAML in .pm/boards/${name}.yaml: ${(e as Error).message}`);
	}
	if (typeof raw !== "object" || raw === null) {
		throw new Error(`invalid board config in .pm/boards/${name}.yaml`);
	}
	return normalizeBoardConfig(raw as Record<string, unknown>);
}

// "in-progress" → { label: "In Progress", statuses: ["in-progress"] }
export function resolveColumn(col: ColumnDef): { label: string; statuses: string[] } {
	if (typeof col === "string") {
		const label = col
			.split("-")
			.map((w) => w.charAt(0).toUpperCase() + w.slice(1))
			.join(" ");
		return { label, statuses: [col] };
	}
	return col;
}
