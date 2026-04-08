import { describe, expect, it } from 'vitest'
import { fuzzySearch, isExactId } from './search.ts'
import type { BoardItem } from './board.ts'

const items: BoardItem[] = [
	{ id: 'STORY-001', title: 'Add auth flow', type: 'story', status: 'backlog', assignee: 'alice', points: 5, blockedBy: [] },
	{ id: 'STORY-002', title: 'User registration', type: 'story', status: 'in-progress', assignee: 'bob', points: 3, blockedBy: [] },
	{ id: 'TASK-001', title: 'Scaffold backend', type: 'task', status: 'backlog', assignee: undefined, points: undefined, blockedBy: [] },
]

describe('fuzzySearch', () => {
	it('finds by title substring', () => {
		const r = fuzzySearch(items, 'auth')
		expect(r).toHaveLength(1)
		expect(r[0].item.id).toBe('STORY-001')
	})

	it('finds by id', () => {
		const r = fuzzySearch(items, 'STORY-002')
		expect(r[0].item.id).toBe('STORY-002')
	})

	it('returns multiple matches for broad query', () => {
		const r = fuzzySearch(items, 'scaffold')
		expect(r.length).toBeGreaterThan(0)
		expect(r[0].item.id).toBe('TASK-001')
	})

	it('returns empty for no match', () => {
		expect(fuzzySearch(items, 'xyznonexistent')).toHaveLength(0)
	})
})

describe('isExactId', () => {
	it('matches STORY-NNN', () => expect(isExactId('STORY-006')).toBe(true))
	it('matches TASK-NNN', () => expect(isExactId('TASK-001')).toBe(true))
	it('matches EPIC-NNN', () => expect(isExactId('EPIC-002')).toBe(true))
	it('is case insensitive', () => expect(isExactId('story-006')).toBe(true))
	it('rejects plain strings', () => expect(isExactId('auth flow')).toBe(false))
	it('rejects partial', () => expect(isExactId('STORY')).toBe(false))
})
