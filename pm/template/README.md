# .pm — Project Board

A git-native, AI-agent-friendly project backlog. Stories are markdown files.

## Workflow

1. Add epics to `EPICS.md`
2. Copy `templates/story.md` → `backlog/STORY-NNN-slug.md`
3. Write Gherkin in `## Acceptance Criteria` before moving to `ready`
4. Start sprint — move story to `sprints/sprint-NN/`
5. Done — move to `done/`

## Status Lifecycle

```
backlog → ready → in-progress → review → done
```

**`ready` gate:** story must have at least one Gherkin scenario before moving to `ready`.

## Directory Conventions

| Location | Meaning |
|----------|---------|
| `backlog/` | Not yet in a sprint |
| `sprints/sprint-NN/` | In sprint NN |
| `done/` | Completed |
| `closed/` | Cancelled or deferred — set `status: closed` and `reason:` field |

## Commit Convention

```
feat(STORY-001): add feature description
fix(STORY-002): correct bug description
chore(TASK-001): scaffold project
```
