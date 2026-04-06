import { z } from 'zod'

export const GlobalOptsSchema = z.object({
	json: z.boolean().default(false),
	dryRun: z.boolean().default(false),
	cwd: z.string().default(process.cwd()),
})

export type GlobalOpts = z.infer<typeof GlobalOptsSchema>
