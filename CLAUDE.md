# Claude Code — Project Instructions

## Project Management System

This project uses a file-based backlog in the `jira/` folder.

### Before starting any work session
1. Read `jira/SPRINT.md` — this is the current sprint state
2. Find the relevant story file in `jira/sprints/<sprint>/` or `jira/backlog/`
3. Read the story's `## Acceptance Criteria` — Gherkin is the source of truth for behaviour

### Story lifecycle rules
- Do not start implementing a story that has no Gherkin scenarios
- Move a story file to `jira/done/` when implementation is complete
- Move to `jira/closed/` if cancelled/deferred; set `status: closed` and populate `reason:` field
- Update `jira/SPRINT.md` when a story changes status
- Do not edit files in `jira/features/` — they are generated

### Commit format (Conventional Commits)
```
feat(STORY-001): add TodoList component
fix(STORY-003): correct empty state message
chore(TASK-001): scaffold Vite + Tailwind
docs(STORY-002): add missing Gherkin scenario
```

### Running jira scripts (from `jira/`)
- `npm run board` — regenerate BOARD.md
- `npm run validate` — check all in-progress stories have Gherkin
- `npm run features` — extract Gherkin to jira/features/*.feature

### Adding a new story
1. Copy `jira/templates/story.md`
2. Save to `jira/backlog/STORY-NNN-slug.md`
3. Fill in frontmatter and write Gherkin before moving to `ready`
