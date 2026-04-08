import { describe, expect, it } from 'bun:test'
import { parseMessage } from './index.ts'

describe('parseMessage', () => {
	it('extracts plain title', () => {
		const r = parseMessage('Add auth flow')
		expect(r.title).toBe('Add auth flow')
		expect(r.type).toBe('story')
	})

	it('extracts @assignee', () => {
		const r = parseMessage('Fix bug @alice')
		expect(r.title).toBe('Fix bug')
		expect(r.assignee).toBe('alice')
	})

	it('keeps @me literal (caller resolves)', () => {
		const r = parseMessage('Fix bug @me')
		expect(r.assignee).toBe('me')
	})

	it('extracts #layer', () => {
		const r = parseMessage('Add auth flow #backend')
		expect(r.layer).toBe('backend')
		expect(r.title).toBe('Add auth flow')
	})

	it('extracts #type', () => {
		const r = parseMessage('Scaffold DB #task')
		expect(r.type).toBe('task')
		expect(r.title).toBe('Scaffold DB')
	})

	it('extracts #EPIC-NNN', () => {
		const r = parseMessage('Add auth flow #EPIC-002')
		expect(r.epic).toBe('EPIC-002')
		expect(r.title).toBe('Add auth flow')
	})

	it('is case-insensitive for #epic', () => {
		const r = parseMessage('Fix thing #epic-003')
		expect(r.epic).toBe('EPIC-003')
	})

	it('extracts key:value into extra', () => {
		const r = parseMessage('Deploy pipeline points:5 status:ready')
		expect(r.extra).toEqual({ points: '5', status: 'ready' })
		expect(r.title).toBe('Deploy pipeline')
	})

	it('handles all tokens together', () => {
		const r = parseMessage('Add auth flow @alice #backend #EPIC-002 points:5')
		expect(r.title).toBe('Add auth flow')
		expect(r.assignee).toBe('alice')
		expect(r.layer).toBe('backend')
		expect(r.epic).toBe('EPIC-002')
		expect(r.extra).toEqual({ points: '5' })
		expect(r.warnings).toHaveLength(0)
	})

	it('warns on unknown #tag and skips it', () => {
		const r = parseMessage('Fix thing #unknown')
		expect(r.warnings).toEqual(['unknown token: #unknown'])
		expect(r.title).toBe('Fix thing')
		expect(r.layer).toBeUndefined()
	})

	it('defaults type to story', () => {
		expect(parseMessage('Something').type).toBe('story')
	})
})
