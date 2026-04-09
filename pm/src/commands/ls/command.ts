import type { CommandDef } from "../../types/command.ts";

export const lsCommand: CommandDef = {
	name: "ls",
	description: "Show the current sprint board",
	setup(cmd) {
		cmd.option("--me", "show only your items (resolved from git config user.name)", false);
	},
	load: () => import("./index.ts"),
};
