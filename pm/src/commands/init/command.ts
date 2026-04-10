import type { CommandDef } from "../../types/command.ts";

export const initCommand: CommandDef = {
	name: "init",
	description: "Initialize a .pm/ board in the current project",
	load: () => import("./index.ts"),
};
