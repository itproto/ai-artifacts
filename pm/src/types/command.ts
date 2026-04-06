export type CommandDef = {
	name: string
	description: string
	load: () => Promise<{ run: (rawOpts: Record<string, unknown>) => Promise<void> }>
}
