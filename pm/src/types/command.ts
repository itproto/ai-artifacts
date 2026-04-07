import type { Command } from '@commander-js/extra-typings'

export type CommandDef = {
	name: string
	description: string
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	setup?: (cmd: Command<any, any>) => void
	load: () => Promise<{ run: (rawOpts: Record<string, unknown>, args?: string[]) => Promise<void> }>
}
