import { spawnSync } from 'node:child_process'
import { readFile, readdir } from 'node:fs/promises'
import * as readline from 'node:readline/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { GlobalOptsSchema } from '../../schemas/options.ts'
import { PmError } from '../../services/scaffold.ts'
import { parseFrontmatter } from '../../services/frontmatter.ts'
import { fuzzySearch, isExactId } from '../../services/search.ts'
import type { BoardItem } from '../../services/board.ts'

const CatOptsSchema = GlobalOptsSchema.extend({
	open: z.boolean().default(false),
})

const SCAN_DIRS = ['backlog', 'sprints', 'done', 'closed']

export async function run(rawOpts: Record<string, unknown>, args?: string[]): Promise<void> {
	const opts = CatOptsSchema.parse(rawOpts)
	const pmDir = join(opts.cwd, '.pm')
	const query = args?.[0]

	const { items, paths } = await loadAllItems(pmDir)

	if (items.length === 0) {
		console.log('No stories or tasks found.')
		return
	}

	let selected: BoardItem

	if (!query) {
		selected = await pickFromList(items, 'Select story:')
	} else if (isExactId(query)) {
		const match = items.find((i) => i.id.toUpperCase() === query.toUpperCase())
		if (!match) throw new PmError(`Error: ${query.toUpperCase()} not found.`, 1)
		selected = match
	} else {
		const results = fuzzySearch(items, query)
		if (results.length === 0) throw new PmError(`Error: no stories matching "${query}"`, 1)
		if (results.length === 1) {
			selected = results[0].item
		} else {
			selected = await pickFromList(results.map((r) => r.item), `Found ${results.length} matches:`)
		}
	}

	const filePath = paths.get(selected.id)
	if (!filePath) throw new PmError(`Error: file for ${selected.id} not found on disk.`, 1)

	if (opts.open) {
		const [editor, ...editorArgs] = (process.env.EDITOR ?? 'vi').split(' ')
		spawnSync(editor, [...editorArgs, filePath], { stdio: 'inherit' })
	} else {
		const content = await readFile(filePath, 'utf8')
		process.stdout.write(content)
	}
}

async function loadAllItems(pmDir: string): Promise<{ items: BoardItem[]; paths: Map<string, string> }> {
	const items: BoardItem[] = []
	const paths = new Map<string, string>()

	async function scanDir(dir: string): Promise<void> {
		let entries: Awaited<ReturnType<typeof readdir>>
		try {
			entries = await readdir(dir, { withFileTypes: true })
		} catch {
			return
		}
		for (const entry of entries) {
			if (entry.isDirectory()) {
				await scanDir(join(dir, entry.name))
			} else if (entry.isFile() && entry.name.endsWith('.md')) {
				const filePath = join(dir, entry.name)
				const content = await readFile(filePath, 'utf8')
				const fm = parseFrontmatter(content)
				const id = typeof fm.id === 'string' ? fm.id : undefined
				if (!id) continue
				if (paths.has(id)) continue // skip duplicates
				paths.set(id, filePath)
				items.push({
					id,
					title: typeof fm.title === 'string' ? fm.title : '',
					type: fm.type === 'task' ? 'task' : 'story',
					status: typeof fm.status === 'string' ? fm.status : 'backlog',
					assignee: typeof fm.assignee === 'string' && fm.assignee !== '' ? fm.assignee : undefined,
					points: undefined,
					blockedBy: [],
				})
			}
		}
	}

	for (const sub of SCAN_DIRS) {
		await scanDir(join(pmDir, sub))
	}

	return { items, paths }
}

async function pickFromList(items: BoardItem[], prompt: string): Promise<BoardItem> {
	console.log(`\n${prompt}`)
	for (let i = 0; i < items.length; i++) {
		const item = items[i]
		const status = item.status.padEnd(12)
		console.log(`  ${String(i + 1).padStart(2)}  ${item.id.padEnd(10)}  ${status}  ${item.title.slice(0, 50)}`)
	}
	console.log()

	const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
	try {
		const answer = await rl.question(`Pick 1-${items.length}: `)
		const n = Number.parseInt(answer.trim(), 10)
		if (Number.isNaN(n) || n < 1 || n > items.length) {
			throw new PmError('Error: invalid selection.', 1)
		}
		return items[n - 1]
	} finally {
		rl.close()
	}
}
