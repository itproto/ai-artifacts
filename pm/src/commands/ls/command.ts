import type { CommandDef } from "../../types/command.ts";

export const lsCommand: CommandDef = {
	name: "ls",
	description: "Show the current sprint board",
	setup(cmd) {
		cmd.option("--me", "show only your items (resolved from git config user.name)", false);
		cmd.option("--board <name>", "board config to use from .pm/boards/<name>.yaml", "default");
	},
	load: () => import("./index.ts"),
};
