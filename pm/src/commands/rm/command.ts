import type { CommandDef } from "../../types/command.ts";

export const rmCommand: CommandDef = {
	name: "rm",
	description: "Close a story or task",
	setup(cmd) {
		cmd.argument("[query]", "story ID (STORY-006) or fuzzy search string");
		cmd.argument("[reason]", "close reason: cancelled, duplicate, deferred, wontfix, …");
	},
	load: () => import("./index.ts"),
};
