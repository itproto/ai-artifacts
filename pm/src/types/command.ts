import type { CommandUnknownOpts } from "@commander-js/extra-typings";

export type CommandDef = {
	name: string;
	description: string;
	setup?: (cmd: CommandUnknownOpts) => void;
	load: () => Promise<{
		run: (rawOpts: Record<string, unknown>, args?: string[]) => Promise<void>;
	}>;
};
