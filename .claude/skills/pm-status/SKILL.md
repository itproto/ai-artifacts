# /pm-status — Sprint Status

You have been invoked via the /pm-status skill. Run the following steps in order and present a concise summary.

## Steps

1. Run `bun run pm/src/entrypoints/pm.ts ls` and capture the output — this shows the current sprint board.
2. Run `git log --oneline -5` — recent commits.
3. Run `git status --short` — uncommitted changes.

## Output Format

Present a short summary with these sections:

**Sprint:** [sprint name from pm ls output]

**Board:**
[paste pm ls output as-is]

**Recent commits:**
[git log output]

**Uncommitted changes:** [either "none" or list from git status]

**Next up:** [pick the top backlog or ready story and name it]

Keep the whole output under 30 lines.
