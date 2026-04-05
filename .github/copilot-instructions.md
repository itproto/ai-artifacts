# GitHub Copilot — Project Instructions

## Project Management

This project tracks work in `jira/`. Always orient yourself before suggesting code.

### Start here
- Read `jira/SPRINT.md` for current sprint context and team assignments
- Active story files are in `jira/sprints/<sprint>/`
- Backlog stories are in `jira/backlog/`

### Behaviour rules
- The `## Acceptance Criteria` section in a story contains Gherkin scenarios — these define what to build
- Do not suggest implementing a story that has no Gherkin scenarios
- `jira/features/` is auto-generated — never suggest edits to those files
- When a story is complete: move the file to `jira/done/`, update `jira/SPRINT.md`

### Commit messages
Follow Conventional Commits with story ID as scope:
- `feat(STORY-001): add TodoList component`
- `fix(STORY-003): correct empty state message`
- `chore(TASK-001): scaffold project`

### jira/ scripts (run from `jira/`)
- `npm run board` — regenerate BOARD.md from frontmatter
- `npm run validate` — check stories have Gherkin before merging
- `npm run features` — generate .feature files from Gherkin in stories
