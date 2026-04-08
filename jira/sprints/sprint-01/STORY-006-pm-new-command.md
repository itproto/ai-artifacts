---
id: STORY-006
title: pm new command — quick-capture story creation
type: story
status: in-progress
epic: EPIC-003
layer: backend
assignee:
points: 5
blockedBy: []
---

## User Story
As a developer, I can run `pm new "title @assignee #layer key:value"` so that I can create a story or task in seconds without editing a template manually.

## Spec

### DSL token rules (parsed left-to-right from the quoted string)

| Token | Field | Notes |
|---|---|---|
| plain words | `title` | everything not matched by rules below |
| `@me` / `@<name>` | `assignee` | `@me` resolves to GitHub remote username (same logic as `pm ls --me`) |
| `#backend` / `#frontend` / `#fullstack` | `layer` | enum values only |
| `#story` / `#task` | `type` | defaults to `story` if omitted |
| `#EPIC-NNN` | `epic` | matched by `/^EPIC-\d+$/i` |
| `key:value` | any frontmatter field | verbatim — `points:5`, `status:ready`, `blockedBy:STORY-002`, etc. |

Unknown `#tag` values → print a warning, skip (do not write to frontmatter).

### ID auto-increment
Scan `jira/` recursively (excluding `node_modules`) for the highest `STORY-NNN` or `TASK-NNN` matching the output type, increment by 1.

### File output
- Stories → `jira/backlog/STORY-NNN-title-slug.md`
- Tasks → `jira/backlog/TASK-NNN-title-slug.md`
- Title slug: lowercase, spaces → hyphens, strip special chars, max 40 chars

### `-o` / `--open` flag
Open the created file in `$EDITOR` (fallback: `vi`) immediately after writing. The file is pre-filled with all parsed fields so the editor opens ready to write the `## User Story` / `## Acceptance Criteria` sections.

### Output (no `-o`)
Print created file path and a one-liner summary of parsed fields:
```
created  jira/backlog/STORY-006-add-auth-flow.md
         title: Add auth flow · assignee: alice · layer: backend · points: 5
```

## Acceptance Criteria

```gherkin
Feature: pm new command

  Scenario: Create story with all token types
    Given I run `pm new "Add auth flow @alice #backend #EPIC-002 points:5"`
    Then a file "jira/backlog/STORY-NNN-add-auth-flow.md" is created
    And the frontmatter contains title "Add auth flow"
    And the frontmatter contains assignee "alice"
    And the frontmatter contains layer "backend"
    And the frontmatter contains epic "EPIC-002"
    And the frontmatter contains points 5
    And the file contains template stubs for User Story, Acceptance Criteria, Tasks

  Scenario: @me resolves to GitHub username
    Given my git remote is "https://github.com/itproto/repo.git"
    When I run `pm new "Fix bug @me"`
    Then the frontmatter contains assignee "itproto"

  Scenario: type:task token sets type and uses TASK-NNN prefix
    Given I run `pm new "Scaffold DB #task"`
    Then a file "jira/backlog/TASK-NNN-scaffold-db.md" is created
    And the frontmatter contains type "task"

  Scenario: key:value sets arbitrary frontmatter field
    Given I run `pm new "Deploy pipeline status:ready points:8"`
    Then the frontmatter contains status "ready"
    And the frontmatter contains points 8

  Scenario: Unknown hashtag prints warning and is skipped
    Given I run `pm new "Fix thing #unknown"`
    Then stderr contains "unknown token: #unknown"
    And the file is still created without the unknown field

  Scenario: -o flag opens the file in $EDITOR
    Given $EDITOR is set to "nano"
    When I run `pm new "Add auth flow" -o`
    Then "nano" is invoked with the path of the created file
```

## Tasks
- [ ] Add `new` command to commander registry (`pm/src/commands/new.ts`)
- [ ] Implement DSL parser (`parseNewArgs`) — tokenize string, classify each token
- [ ] Resolve `@me` via GitHub remote (reuse existing utility from `pm ls`)
- [ ] ID auto-increment scanner (scan jira/ for highest existing ID)
- [ ] Template writer — merge parsed fields into story template
- [ ] `-o` / `--open` flag — spawn `$EDITOR` with the file path
- [ ] Unit tests for DSL parser (all token types + unknown `#tag` warning)
- [ ] Integration test: full `pm new` invocation writes correct file

## Notes
