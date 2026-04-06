import { afterEach, beforeEach, describe, expect, test } from 'bun:test'
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { BoardItem } from './board.ts'
import { findActiveSprint, groupByStatus, matchesAssignee, readSprintItems, renderBoard } from './board.ts'

const STORY_CONTENT = `---
id: STORY-001
title: pm ls sprint board
type: story
status: in-progress
assignee: "@itproto"
points: 2
blockedBy: []
---

## User Story
`

const TASK_CONTENT = `---
id: TASK-002
title: Scaffold backend
type: task
status: in-progress
assignee: "@bob"
blockedBy: []
---
`

const BLOCKED_CONTENT = `---
id: STORY-002
title: Create a todo item
type: story
status: backlog
assignee: "@alice"
points: 5
blockedBy: [TASK-002]
---
`

describe('findActiveSprint', () => {
	let tmpDir: string

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), 'pm-board-test-'))
	})

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true })
	})

	test('returns null when .pm/sprints does not exist', async () => {
		expect(await findActiveSprint(tmpDir)).toBeNull()
	})

	test('returns null when sprints dir is empty', async () => {
		await mkdir(join(tmpDir, '.pm', 'sprints'), { recursive: true })
		expect(await findActiveSprint(tmpDir)).toBeNull()
	})

	test('returns highest sprint dir name', async () => {
		await mkdir(join(tmpDir, '.pm', 'sprints', 'sprint-01'), { recursive: true })
		await mkdir(join(tmpDir, '.pm', 'sprints', 'sprint-02'), { recursive: true })
		expect(await findActiveSprint(tmpDir)).toBe('sprint-02')
	})

	test('ignores non sprint-NN directories', async () => {
		await mkdir(join(tmpDir, '.pm', 'sprints', 'sprint-01'), { recursive: true })
		await mkdir(join(tmpDir, '.pm', 'sprints', 'archive'), { recursive: true })
		expect(await findActiveSprint(tmpDir)).toBe('sprint-01')
	})
})

describe('readSprintItems', () => {
	let tmpDir: string

	beforeEach(async () => {
		tmpDir = await mkdtemp(join(tmpdir(), 'pm-board-test-'))
		await mkdir(join(tmpDir, '.pm', 'sprints', 'sprint-01'), { recursive: true })
	})

	afterEach(async () => {
		await rm(tmpDir, { recursive: true, force: true })
	})

	test('returns empty array for empty sprint dir', async () => {
		const items = await readSprintItems(tmpDir, 'sprint-01')
		expect(items).toEqual([])
	})

	test('parses a story file', async () => {
		await writeFile(
			join(tmpDir, '.pm', 'sprints', 'sprint-01', 'STORY-001-pm-ls.md'),
			STORY_CONTENT,
		)
		const items = await readSprintItems(tmpDir, 'sprint-01')
		expect(items).toHaveLength(1)
		expect(items[0]).toMatchObject({
			id: 'STORY-001',
			title: 'pm ls sprint board',
			type: 'story',
			status: 'in-progress',
			assignee: '@itproto',
			points: 2,
			blockedBy: [],
		})
	})

	test('parses a task file', async () => {
		await writeFile(
			join(tmpDir, '.pm', 'sprints', 'sprint-01', 'TASK-002-scaffold.md'),
			TASK_CONTENT,
		)
		const items = await readSprintItems(tmpDir, 'sprint-01')
		expect(items[0]).toMatchObject({
			id: 'TASK-002',
			type: 'task',
			points: undefined,
		})
	})

	test('parses blockedBy array', async () => {
		await writeFile(
			join(tmpDir, '.pm', 'sprints', 'sprint-01', 'STORY-002-create.md'),
			BLOCKED_CONTENT,
		)
		const items = await readSprintItems(tmpDir, 'sprint-01')
		expect(items[0].blockedBy).toEqual(['TASK-002'])
	})

	test('skips files with missing id', async () => {
		await writeFile(
			join(tmpDir, '.pm', 'sprints', 'sprint-01', 'bad.md'),
			'---\ntitle: no id\n---',
		)
		const items = await readSprintItems(tmpDir, 'sprint-01')
		expect(items).toHaveLength(0)
	})
})

describe('groupByStatus', () => {
	test('groups items by display status', () => {
		const items: BoardItem[] = [
			{ id: 'STORY-001', title: 'A', type: 'story', status: 'in-progress', assignee: '@itproto', points: 2, blockedBy: [] },
			{ id: 'TASK-002', title: 'B', type: 'task', status: 'done', assignee: undefined, points: undefined, blockedBy: [] },
		]
		const grouped = groupByStatus(items)
		expect([...grouped.keys()]).toEqual(['in-progress', 'done'])
	})

	test('items with blockedBy go into blocked section regardless of status', () => {
		const items: BoardItem[] = [
			{ id: 'STORY-002', title: 'C', type: 'story', status: 'backlog', assignee: '@alice', points: 5, blockedBy: ['TASK-002'] },
		]
		const grouped = groupByStatus(items)
		expect([...grouped.keys()]).toEqual(['blocked'])
	})

	test('sections follow STATUS_ORDER', () => {
		const items: BoardItem[] = [
			{ id: 'TASK-001', title: 'D', type: 'task', status: 'done', assignee: undefined, points: undefined, blockedBy: [] },
			{ id: 'STORY-001', title: 'A', type: 'story', status: 'in-progress', assignee: '@itproto', points: 2, blockedBy: [] },
		]
		const grouped = groupByStatus(items)
		expect([...grouped.keys()]).toEqual(['in-progress', 'done'])
	})
})

describe('renderBoard', () => {
	const items: BoardItem[] = [
		{ id: 'STORY-001', title: 'pm ls sprint board', type: 'story', status: 'in-progress', assignee: '@itproto', points: 2, blockedBy: [] },
		{ id: 'STORY-002', title: 'Create a todo item', type: 'story', status: 'backlog', assignee: '@alice', points: 5, blockedBy: ['TASK-002'] },
		{ id: 'TASK-001', title: 'Scaffold frontend', type: 'task', status: 'done', assignee: '@alice', points: undefined, blockedBy: [] },
	]

	test('renders sprint name header', () => {
		const grouped = groupByStatus(items)
		const output = renderBoard('sprint-01', grouped)
		expect(output).toContain('Sprint sprint-01')
	})

	test('renders in-progress section', () => {
		const grouped = groupByStatus(items)
		const output = renderBoard('sprint-01', grouped)
		expect(output).toContain('In Progress')
		expect(output).toContain('STORY-001')
	})

	test('renders blocked section with arrow', () => {
		const grouped = groupByStatus(items)
		const output = renderBoard('sprint-01', grouped)
		expect(output).toContain('Blocked')
		expect(output).toContain('← TASK-002')
	})

	test('renders done section', () => {
		const grouped = groupByStatus(items)
		const output = renderBoard('sprint-01', grouped)
		expect(output).toContain('Done')
		expect(output).toContain('TASK-001')
	})

	test('truncates title at 45 chars', () => {
		const longItems: BoardItem[] = [
			{ id: 'STORY-003', title: 'A'.repeat(60), type: 'story', status: 'backlog', assignee: undefined, points: undefined, blockedBy: [] },
		]
		const grouped = groupByStatus(longItems)
		const output = renderBoard('sprint-01', grouped)
		expect(output).not.toContain('A'.repeat(46))
	})
})

describe('matchesAssignee', () => {
	test('matches exact username', () => {
		expect(matchesAssignee('@itproto', 'itproto')).toBe(true)
	})

	test('matches without @ prefix on assignee', () => {
		expect(matchesAssignee('itproto', 'itproto')).toBe(true)
	})

	test('is case-insensitive', () => {
		expect(matchesAssignee('@Itproto', 'itproto')).toBe(true)
	})

	test('returns false for undefined assignee', () => {
		expect(matchesAssignee(undefined, 'itproto')).toBe(false)
	})

	test('returns false for different user', () => {
		expect(matchesAssignee('@alice', 'itproto')).toBe(false)
	})
})
