import { execSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { z } from 'zod'
import { GlobalOptsSchema } from '../../schemas/options.ts'
import { PmError } from '../../services/scaffold.ts'
import { nextId } from '../../services/id.ts'
import { resolveCurrentUser } from '../../services/board.ts'
import { fileURLToPath } from 'node:url'

const NewOptsSchema = GlobalOptsSchema.extend({
	open: z.boolean().default(false),
})

const LAYER_VALUES = new Set(['frontend', 'backend', 'fullstack'])
const TYPE_VALUES = new Set(['story', 'task'])
const EPIC_PATTERN = /^EPIC-\d+$/i

export type ParsedArgs = {
	title: string
	assignee?: string
	layer?: string
	type: 'story' | 'task'
	epic?: string
	extra: Record<string, string>
	warnings: string[]
}

export function parseMessage(message: string): ParsedArgs {
	const tokens = tokenize(message)
	const words: string[] = []
	const result: ParsedArgs = { title: '', type: 'story', extra: {}, warnings: [] }

	for (const token of tokens) {
		if (token.startsWith('@')) {
			result.assignee = token.slice(1)
		} else if (token.startsWith('#')) {
			const tag = token.slice(1)
			if (LAYER_VALUES.has(tag.toLowerCase())) {
				result.layer = tag.toLowerCase()
			} else if (TYPE_VALUES.has(tag.toLowerCase())) {
				result.type = tag.toLowerCase() as 'story' | 'task'
			} else if (EPIC_PATTERN.test(tag)) {
				result.epic = tag.toUpperCase()
			} else {
				result.warnings.push(`unknown token: #${tag}`)
			}
		} else if (token.includes(':')) {
			const colonIdx = token.indexOf(':')
			const key = token.slice(0, colonIdx).trim()
			const value = token.slice(colonIdx + 1).trim()
			if (key) result.extra[key] = value
		} else {
			words.push(token)
		}
	}

	result.title = words.join(' ').trim()
	return result
}

function tokenize(message: string): string[] {
	// Split on spaces but keep quoted groups together
	const tokens: string[] = []
	let current = ''
	let inQuote = false
	let quoteChar = ''

	for (const ch of message) {
		if (!inQuote && (ch === '"' || ch === "'")) {
			inQuote = true
			quoteChar = ch
		} else if (inQuote && ch === quoteChar) {
			inQuote = false
			quoteChar = ''
		} else if (!inQuote && ch === ' ') {
			if (current) tokens.push(current)
			current = ''
		} else {
			current += ch
		}
	}
	if (current) tokens.push(current)
	return tokens
}

function slugify(title: string): string {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 40)
}

function buildFrontmatter(id: string, parsed: ParsedArgs): string {
	const fields: Record<string, string> = {
		id,
		title: parsed.title,
		type: parsed.type,
		status: 'backlog',
		epic: parsed.epic ?? '',
		layer: parsed.layer ?? '',
		assignee: parsed.assignee ?? '',
		points: '',
		'blockedBy': '[]',
		...parsed.extra,
	}

	const lines = Object.entries(fields).map(([k, v]) => `${k}: ${v}`)
	return `---\n${lines.join('\n')}\n---`
}

async function loadTemplate(cwd: string, type: 'story' | 'task'): Promise<string> {
	// Try .pm/templates/ first (initialized project), fallback to bundled template
	const localPath = join(cwd, '.pm', 'templates', `${type}.md`)
	try {
		return await readFile(localPath, 'utf8')
	} catch {
		// fall through to bundled
	}
	const bundledPath = fileURLToPath(new URL('../../../template/templates/' + type + '.md', import.meta.url))
	return readFile(bundledPath, 'utf8')
}

function mergeTemplate(template: string, frontmatter: string): string {
	// Replace existing frontmatter block (between first --- pair) with new one
	return template.replace(/^---[\s\S]*?---/, frontmatter)
}

export async function run(rawOpts: Record<string, unknown>, args?: string[]): Promise<void> {
	const opts = NewOptsSchema.parse(rawOpts)
	const message = args?.[0]

	if (!message) {
		throw new PmError('Error: message argument is required.\n  Usage: pm new "title @assignee #layer key:value"', 1)
	}

	const parsed = parseMessage(message)

	for (const warning of parsed.warnings) {
		console.warn(`warn: ${warning}`)
	}

	if (!parsed.title) {
		throw new PmError('Error: could not extract a title from the message.', 1)
	}

	// Resolve @me
	if (parsed.assignee === 'me') {
		const user = resolveCurrentUser(opts.cwd)
		if (!user) {
			throw new PmError('Error: could not resolve current user from GitHub remote or git config.', 1)
		}
		parsed.assignee = user
	}

	const idType = parsed.type === 'task' ? 'TASK' : 'STORY'
	const id = await nextId(opts.cwd, idType)
	const slug = slugify(parsed.title)
	const filename = `${id}-${slug}.md`
	const destPath = join(opts.cwd, '.pm', 'backlog', filename)

	const template = await loadTemplate(opts.cwd, parsed.type)
	const frontmatter = buildFrontmatter(id, parsed)
	const content = mergeTemplate(template, frontmatter)

	if (opts.dryRun) {
		console.log(`dry-run  ${destPath}`)
		console.log(`         ${summaryLine(id, parsed)}`)
		return
	}

	await writeFile(destPath, content, 'utf8')

	console.log(`created  ${destPath}`)
	console.log(`         ${summaryLine(id, parsed)}`)

	if (opts.open) {
		const editor = process.env.EDITOR ?? 'vi'
		try {
			execSync(`${editor} "${destPath}"`, { stdio: 'inherit' })
		} catch {
			// editor exited non-zero (e.g. user quit vim with :q!) — not an error
		}
	}
}

function summaryLine(id: string, parsed: ParsedArgs): string {
	const parts: string[] = [`title: ${parsed.title}`]
	if (parsed.assignee) parts.push(`assignee: ${parsed.assignee}`)
	if (parsed.layer) parts.push(`layer: ${parsed.layer}`)
	if (parsed.epic) parts.push(`epic: ${parsed.epic}`)
	for (const [k, v] of Object.entries(parsed.extra)) parts.push(`${k}: ${v}`)
	return `[${id}] ${parts.join(' · ')}`
}
