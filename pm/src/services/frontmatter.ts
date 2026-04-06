export function parseFrontmatter(content: string): Record<string, unknown> {
	const match = content.match(/^---\n([\s\S]*?)\n---/)
	if (!match) return {}

	const result: Record<string, unknown> = {}
	for (const line of match[1].split('\n')) {
		const colonIdx = line.indexOf(':')
		if (colonIdx === -1) continue
		const key = line.slice(0, colonIdx).trim()
		const raw = line.slice(colonIdx + 1).trim()

		if (raw.startsWith('[') && raw.endsWith(']')) {
			const inner = raw.slice(1, -1).trim()
			result[key] =
				inner === ''
					? []
					: inner.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''))
		} else {
			result[key] = raw.replace(/^["']|["']$/g, '')
		}
	}
	return result
}
