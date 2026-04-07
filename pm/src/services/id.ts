import { readdir } from 'node:fs/promises'
import { join } from 'node:path'

export type IdType = 'STORY' | 'TASK' | 'EPIC'

const ID_PATTERN = /^(STORY|TASK|EPIC)-(\d+)/i

/**
 * Scans all jira-like directories under `cwd` (excluding node_modules) and
 * returns the next available ID for the given type, e.g. "STORY-007".
 */
export async function nextId(cwd: string, type: IdType): Promise<string> {
	const max = await scanMaxId(cwd, type)
	const num = String(max + 1).padStart(3, '0')
	return `${type}-${num}`
}

async function scanMaxId(cwd: string, type: IdType): Promise<number> {
	let max = 0

	async function walk(dir: string): Promise<void> {
		let entries: Awaited<ReturnType<typeof readdir>>
		try {
			entries = await readdir(dir, { withFileTypes: true })
		} catch {
			return
		}

		for (const entry of entries) {
			if (entry.name === 'node_modules') continue

			const match = entry.name.match(ID_PATTERN)
			if (match && match[1].toUpperCase() === type) {
				const n = Number.parseInt(match[2], 10)
				if (n > max) max = n
			}

			if (entry.isDirectory()) {
				await walk(join(dir, entry.name))
			}
		}
	}

	await walk(cwd)
	return max
}
