import type { CommandDef } from "../../types/command.ts";

export const editCommand: CommandDef = {
	name: "edit",
	description: "Edit story or task frontmatter fields",
	setup(cmd) {
		cmd
			.argument("<query>", "story/task ID (STORY-004, TASK-001) or fuzzy search string")
			.argument("<updates...>", "frontmatter field updates in key:value form");
	},
	load: () => import("./index.ts"),
};
