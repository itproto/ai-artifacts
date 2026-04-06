import chalk from 'chalk'
import type { GlobalOpts } from '../schemas/options.ts'

export type InitResult = {
	success: boolean
	path: string
	filesCreated: number
	dryRun: boolean
	dryRunFiles?: string[]
}

export function output(result: InitResult, opts: GlobalOpts): void {
	if (opts.json) {
		console.log(JSON.stringify(result))
		return
	}
	if (result.dryRun) {
		printDryRun(result)
		return
	}
	printSuccess(result)
}

function printDryRun(result: InitResult): void {
	console.log(`[dry-run] Would create .pm/ in ${result.path}`)
	if (result.dryRunFiles) {
		console.log(`[dry-run] Would copy ${result.dryRunFiles.length} files from template`)
	}
	console.log('[dry-run] No files written.')
}

function printSuccess(_result: InitResult): void {
	console.log(chalk.green('✓') + ' Initialized .pm/ project board')
	console.log('')
	console.log('  backlog/        ready for stories')
	console.log('  done/           completed work lands here')
	console.log('  closed/         cancelled or deferred')
	console.log('  templates/      story.md, task.md')
	console.log('  examples/       1 story, 1 task to get you started')
	console.log('')
	console.log('Next steps:')
	console.log('  1. Edit .pm/EPICS.md — add your epics')
	console.log('  2. Copy .pm/templates/story.md → .pm/backlog/STORY-001-slug.md')
	console.log('  3. Fill in the story and write Gherkin before moving to ready')
}
