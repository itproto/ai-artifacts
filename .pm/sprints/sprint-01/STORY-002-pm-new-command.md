---
id: STORY-002
title: pm new — quick-capture story creation
type: story
status: done
epic: EPIC-002
layer: cli
assignee: "@itproto"
points: 5
blockedBy: []
reason: 
---

## User Story
As a developer, I can run `pm new "title @assignee #layer key:value"`
so that I can create a story or task in seconds without editing a template manually.

## Spec
Parses a quoted string using a mini DSL into frontmatter fields. Auto-increments
the next STORY/TASK/EPIC ID by scanning all files under cwd. Writes a pre-filled
story/task file to `.pm/backlog/`. Supports `-o` to open in `$EDITOR` immediately.

DSL tokens: plain words → title, `@name` → assignee, `#backend|frontend|fullstack` → layer,
`#story|task` → type, `#EPIC-NNN` → epic, `key:value` → any frontmatter field verbatim.

## Acceptance Criteria

```gherkin
Feature: pm new command

  Scenario: Create story with all token types
    Given I run `pm new "Add auth flow @alice #backend #EPIC-002 points:5"`
    Then a file ".pm/backlog/STORY-NNN-add-auth-flow.md" is created
    And the frontmatter contains the parsed fields

  Scenario: @me resolves to GitHub username
    Given my git remote is "https://github.com/itproto/repo.git"
    When I run `pm new "Fix bug @me"`
    Then the frontmatter contains assignee "itproto"

  Scenario: #task token sets type and TASK-NNN prefix
    Given I run `pm new "Scaffold DB #task"`
    Then a file ".pm/backlog/TASK-NNN-scaffold-db.md" is created

  Scenario: Unknown hashtag warns and is skipped
    Given I run `pm new "Fix thing #unknown"`
    Then stderr contains "unknown token: #unknown"
    And the file is still created
```

## Tasks
- [x] `pm/src/services/id.ts` — `nextId(cwd, type)` scanner
- [x] `pm/src/commands/new/command.ts` — CommandDef
- [x] `pm/src/commands/new/index.ts` — DSL parser + file writer
- [x] Unit tests for DSL parser and id scanner
- [ ] PR review + merge (itproto/ai-artifacts#4)

## Notes
PR: itproto/ai-artifacts#4
