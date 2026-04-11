import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { parse } from "yaml";
import { PmError } from "../../services/scaffold.ts";

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
		throw new PmError("board config: 'columns' is required and must be non-empty", 1);
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
			throw new PmError(
				"Error: no default board found. Create .pm/boards/default.yaml to get started.",
				1,
			);
		}
		throw new PmError(`board "${name}" not found at .pm/boards/${name}.yaml`, 1);
	}
	let raw: unknown;
	try {
		raw = parse(content);
	} catch (e) {
		throw new PmError(`invalid YAML in .pm/boards/${name}.yaml: ${(e as Error).message}`, 1);
	}
	if (typeof raw !== "object" || raw === null) {
		throw new PmError(`invalid board config in .pm/boards/${name}.yaml`, 1);
	}
	return normalizeBoardConfig(raw as Record<string, unknown>);
}

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
