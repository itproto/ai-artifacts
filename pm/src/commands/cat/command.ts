import type { CommandDef } from "../../types/command.ts";

export const catCommand: CommandDef = {
	name: "cat",
	description: "View a story or task",
	setup(cmd) {
		cmd.argument("[query]", "story ID (STORY-004) or fuzzy search string");
		cmd.option("-o, --open", "open in $EDITOR instead of printing", false);
	},
	load: () => import("./index.ts"),
};
