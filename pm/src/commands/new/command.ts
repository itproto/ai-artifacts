import type { CommandDef } from "../../types/command.ts";

export const newCommand: CommandDef = {
	name: "new",
	description: "Quick-capture a new story or task",
	setup(cmd) {
		cmd.argument("<message>", 'story definition: "title @assignee #layer #EPIC-NNN key:value"');
		cmd.option("-o, --open", "open in $EDITOR after creation", false);
	},
	load: () => import("./index.ts"),
};
