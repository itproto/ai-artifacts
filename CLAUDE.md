# Claude Code — Project Instructions

## Project Management System

This project uses the `pm` CLI (`@itproto/pm`) with a file-based board in `.pm/`.

### Before starting any work session
1. Run `pm ls` — see the current sprint state
2. Find the relevant story file in `.pm/sprints/<sprint>/` or `.pm/backlog/`
3. Read the story's `## Acceptance Criteria` — Gherkin is the source of truth for behaviour

### Story lifecycle rules
- Do not start implementing a story that has no Gherkin scenarios
- Move a story file to `.pm/done/` when implementation is complete
- Use `pm rm <id> <reason>` to close/cancel a story (moves to `.pm/closed/`)
- Do not edit files in `.pm/examples/` — they are reference only

### Adding a new story
```
pm new "title @assignee #layer #EPIC-NNN points:N"
pm new "title @assignee #layer" -o   # open in $EDITOR immediately
```

### Common pm commands
```
pm ls                        # show sprint board
pm ls --me                   # show only your items
pm new "Fix auth @me #backend points:3"
pm rm STORY-006              # close by ID (prompts for reason)
pm rm "auth flow" cancelled  # fuzzy search + reason
pm rm                        # interactive picker
```

### Commit format (Conventional Commits)
```
feat(STORY-001): add TodoList component
fix(STORY-003): correct empty state message
chore(TASK-001): scaffold Vite + Tailwind
docs(STORY-002): add missing Gherkin scenario
```

### Running pm (from repo root)
```
bun run pm/src/entrypoints/pm.ts <command>
```
Or if installed globally: `pm <command>`
