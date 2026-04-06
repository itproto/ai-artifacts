import { cp, readdir, rm, stat } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { InitResult } from '../cli/output.ts'
import type { GlobalOpts } from '../schemas/options.ts'

// fileURLToPath handles percent-encoding and Windows paths correctly
const TEMPLATE_DIR = fileURLToPath(new URL('../../template', import.meta.url))

export class PmError extends Error {
	constructor(
		message: string,
		public readonly exitCode: number,
	) {
		super(message)
		this.name = 'PmError'
	}
}

export const ScaffoldService = {
	async init(opts: GlobalOpts): Promise<InitResult> {
		const targetDir = resolve(opts.cwd)
		const pmDir = join(targetDir, '.pm')

		// Verify cwd exists and is a directory
		const cwdStat = await stat(targetDir).catch(() => null)
		if (!cwdStat?.isDirectory()) {
			throw new PmError(`Error: directory not found: ${targetDir}`, 1)
		}

		// Check if .pm/ already exists
		const exists = await stat(pmDir)
			.then(() => true)
			.catch(() => false)
		if (exists) {
			throw new PmError(
				`Error: .pm/ already exists in ${targetDir}. Run with --force to overwrite (not yet implemented).`,
				1,
			)
		}

		const allFiles = await listFiles(TEMPLATE_DIR)
		const contentFiles = allFiles.filter((f) => !f.endsWith('.gitkeep'))

		if (opts.dryRun) {
			return {
				success: true,
				path: pmDir,
				filesCreated: 0,
				dryRun: true,
				dryRunFiles: contentFiles.map((f) => relative(TEMPLATE_DIR, f)),
			}
		}

		try {
			await cp(TEMPLATE_DIR, pmDir, { recursive: true })
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown filesystem error'
			throw new PmError(`Error: failed to scaffold .pm/ in ${targetDir}: ${message}`, 1)
		}

		// Remove .gitkeep markers — directories already created by cp
		const gitkeepFiles = allFiles.filter((f) => f.endsWith('.gitkeep'))
		for (const f of gitkeepFiles) {
			const rel = relative(TEMPLATE_DIR, f)
			try {
				await rm(join(pmDir, rel), { force: true })
			} catch (error) {
				const message = error instanceof Error ? error.message : 'Unknown filesystem error'
				throw new PmError(`Error: failed to remove template marker ${rel}: ${message}`, 1)
			}
		}

		return {
			success: true,
			path: pmDir,
			filesCreated: contentFiles.length,
			dryRun: false,
		}
	},
}

async function listFiles(dir: string): Promise<string[]> {
	const entries = await readdir(dir, { recursive: true, withFileTypes: true })
	return entries
		.filter((e) => e.isFile())
		.map((e) => join(e.parentPath, e.name))
}
