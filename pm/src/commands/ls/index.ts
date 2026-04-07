import { z } from 'zod'
import { GlobalOptsSchema } from '../../schemas/options.ts'
import {
	findActiveSprint,
	groupByStatus,
	matchesAssignee,
	readSprintItems,
	renderBoard,
	resolveCurrentUser,
} from '../../services/board.ts'
import { PmError } from '../../services/scaffold.ts'

const LsOptsSchema = GlobalOptsSchema.extend({
	me: z.boolean().default(false),
})

export async function run(rawOpts: Record<string, unknown>): Promise<void> {
	const opts = LsOptsSchema.parse(rawOpts)
	const sprint = await findActiveSprint(opts.cwd)

	if (!sprint) {
		console.log('No active sprint')
		return
	}

	let items = await readSprintItems(opts.cwd, sprint)

	if (opts.me) {
		const user = resolveCurrentUser(opts.cwd)
		if (!user) {
			throw new PmError(
				'Error: could not resolve current user from GitHub remote URL or git config user.name',
				1,
			)
		}
		items = items.filter((item) => matchesAssignee(item.assignee, user))
	}

	const grouped = groupByStatus(items)
	console.log(renderBoard(sprint, grouped))
}
