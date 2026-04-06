import { describe, expect, test } from 'bun:test'
import type { GlobalOpts } from '../schemas/options.ts'
import { type InitResult, output } from './output.ts'

const baseOpts: GlobalOpts = { json: false, dryRun: false, cwd: '/tmp/project' }

const successResult: InitResult = {
	success: true,
	path: '/tmp/project/.pm',
	filesCreated: 12,
	dryRun: false,
}

const dryRunResult: InitResult = {
	success: true,
	path: '/tmp/project/.pm',
	filesCreated: 0,
	dryRun: true,
	dryRunFiles: ['README.md', 'EPICS.md'],
}

function captureLog(fn: () => void): string[] {
	const logs: string[] = []
	const orig = console.log
	console.log = (msg: string) => logs.push(msg)
	fn()
	console.log = orig
	return logs
}

describe('output', () => {
	test('json mode prints valid JSON to stdout', () => {
		const logs = captureLog(() => output(successResult, { ...baseOpts, json: true }))
		const parsed = JSON.parse(logs[0])
		expect(parsed.success).toBe(true)
		expect(parsed.filesCreated).toBe(12)
		expect(parsed.dryRun).toBe(false)
	})

	test('human mode prints initialized message', () => {
		const logs = captureLog(() => output(successResult, baseOpts))
		const combined = logs.join('\n')
		expect(combined).toContain('Initialized .pm/')
		expect(combined).toContain('backlog/')
	})

	test('human dry-run mode prints dry-run prefix', () => {
		const logs = captureLog(() => output(dryRunResult, { ...baseOpts, dryRun: true }))
		const combined = logs.join('\n')
		expect(combined).toContain('[dry-run]')
		expect(combined).toContain('No files written')
	})
})
