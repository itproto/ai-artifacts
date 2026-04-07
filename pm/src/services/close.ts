import { readFile, rename, writeFile } from 'node:fs/promises'
import { basename, join } from 'node:path'
import { readdir } from 'node:fs/promises'

const SCAN_DIRS = ['backlog', 'sprints']

export type CloseResult = {
	from: string
	to: string
}

export async function findStoryFile(pmDir: string, id: string): Promise<string | null> {
	const upper = id.toUpperCase()

	async function scanDir(dir: string): Promise<string | null> {
		let entries: Awaited<ReturnType<typeof readdir>>
		try {
			entries = await readdir(dir, { withFileTypes: true })
		} catch {
			return null
		}
		for (const entry of entries) {
			if (entry.isDirectory()) {
				const found = await scanDir(join(dir, entry.name))
				if (found) return found
			} else if (entry.isFile() && entry.name.endsWith('.md')) {
				if (entry.name.toUpperCase().startsWith(`${upper}-`)) return join(dir, entry.name)
			}
		}
		return null
	}

	for (const sub of SCAN_DIRS) {
		const found = await scanDir(join(pmDir, sub))
		if (found) return found
	}
	return null
}

export async function closeStory(pmDir: string, filePath: string, reason: string): Promise<CloseResult> {
	const content = await readFile(filePath, 'utf8')
	const updated = updateFrontmatter(content, reason)

	const destDir = join(pmDir, 'closed')
	const destPath = join(destDir, basename(filePath))

	await writeFile(filePath, updated, 'utf8')
	await rename(filePath, destPath)

	return { from: filePath, to: destPath }
}

function updateFrontmatter(content: string, reason: string): string {
	let result = content.replace(/^(status:\s*).*$/m, `$1closed`)

	if (/^reason:/m.test(result)) {
		result = result.replace(/^(reason:\s*).*$/m, `$1${reason}`)
	} else {
		result = result.replace(/^(---\s*\n[\s\S]*?)(---)/m, `$1reason: ${reason}\n$2`)
	}

	return result
}
