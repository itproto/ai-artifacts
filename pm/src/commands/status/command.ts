import type { CommandDef } from "../../types/command.ts";

function makeStatusCommand(
	name: string,
	description: string,
	statusArg: string,
): CommandDef {
	return {
		name,
		description,
		setup(cmd) {
			cmd.argument("[query]", "story ID (STORY-001) or fuzzy search string");
		},
		load: async () => {
			const mod = await import("./index.ts");
			return {
				run: (rawOpts: Record<string, unknown>, args?: string[]) =>
					mod.run(statusArg, rawOpts, args),
			};
		},
	};
}

export const startCommand = makeStatusCommand(
	"start",
	"Set a story status to in-progress",
	"in-progress",
);

export const doneCommand = makeStatusCommand("done", "Set a story status to done", "done");

export const blockCommand = makeStatusCommand(
	"block",
	"Set a story status to blocked",
	"blocked",
);

export const reviewCommand = makeStatusCommand(
	"review",
	"Set a story status to review",
	"review",
);

export const nextCommand = makeStatusCommand(
	"next",
	"Advance a story to its next lifecycle status (backlog→in-progress→review→done)",
	"next",
);
