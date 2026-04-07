import { Command } from '@commander-js/extra-typings'
import { PmError } from '../services/scaffold.ts'
import type { CommandDef } from '../types/command.ts'
import { VERSION } from '../version.ts'
import { initCommand } from './init/command.ts'
import { lsCommand } from './ls/command.ts'
import { newCommand } from './new/command.ts'

const COMMANDS: CommandDef[] = [initCommand, lsCommand, newCommand]

export function buildProgram(): Command {
	const program = new Command('pm')
		.version(VERSION)
		.option('--json', 'output as JSON', false)
		.option('--dry-run', 'preview without writing', false)
		.option('--cwd <path>', 'working directory', process.cwd())

	for (const def of COMMANDS) {
		const sub = program.command(def.name).description(def.description)
		if (def.setup) def.setup(sub)
		sub.action(async (...actionArgs) => {
			const positional = actionArgs.slice(0, -1) as string[]
			const rawOpts = { ...program.opts(), ...sub.opts() }
			const mod = await def.load()
			try {
				await mod.run(rawOpts as Record<string, unknown>, positional)
			} catch (err) {
				if (err instanceof PmError) {
					console.error(err.message)
					process.exit(err.exitCode)
				}
				throw err
			}
		})
	}

	return program
}
