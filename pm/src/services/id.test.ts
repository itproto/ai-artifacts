import { mkdtemp, mkdir, writeFile, rm } from 'node:fs/promises'
import { join } from 'node:path'
import { tmpdir } from 'node:os'
import { describe, expect, it, afterEach } from 'bun:test'
import { nextId } from './id.ts'

let tmpDir: string

async function setup(files: string[]): Promise<string> {
	tmpDir = await mkdtemp(join(tmpdir(), 'pm-id-test-'))
	for (const f of files) {
		const full = join(tmpDir, f)
		await mkdir(join(full, '..'), { recursive: true })
		await writeFile(full, '')
	}
	return tmpDir
}

afterEach(async () => {
	if (tmpDir) await rm(tmpDir, { recursive: true, force: true })
})

describe('nextId', () => {
	it('returns STORY-001 when no stories exist', async () => {
		const dir = await setup([])
		expect(await nextId(dir, 'STORY')).toBe('STORY-001')
	})

	it('increments past highest existing story', async () => {
		const dir = await setup([
			'backlog/STORY-001-foo.md',
			'backlog/STORY-003-bar.md',
			'done/STORY-002-baz.md',
		])
		expect(await nextId(dir, 'STORY')).toBe('STORY-004')
	})

	it('does not count TASK ids when resolving STORY', async () => {
		const dir = await setup(['backlog/TASK-005-foo.md', 'backlog/STORY-002-bar.md'])
		expect(await nextId(dir, 'STORY')).toBe('STORY-003')
		expect(await nextId(dir, 'TASK')).toBe('TASK-006')
	})

	it('skips node_modules', async () => {
		const dir = await setup([
			'backlog/STORY-001-foo.md',
			'node_modules/some-pkg/STORY-999-fake.md',
		])
		expect(await nextId(dir, 'STORY')).toBe('STORY-002')
	})

	it('pads id to 3 digits', async () => {
		const dir = await setup([])
		expect(await nextId(dir, 'EPIC')).toBe('EPIC-001')
	})
})
