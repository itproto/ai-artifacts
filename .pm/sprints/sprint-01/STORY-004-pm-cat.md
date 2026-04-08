---
id: STORY-004
title: pm cat — view a story in terminal or editor
type: story
status: in-progress
epic: 
layer: cli
assignee: itproto
points: 2
blockedBy: []
reason: 
---

## User Story
As a developer, I can run `pm cat <id|query>` so that I can read a story's
full content without knowing which folder it lives in.

## Spec

```
pm cat STORY-004           # print to stdout
pm cat "pm cat"            # fuzzy search, auto-pick if 1 match
pm cat                     # interactive picker (all stories)
pm cat STORY-004 -o        # open in $EDITOR
```

Scans all folders: `.pm/backlog/`, `.pm/sprints/*/`, `.pm/done/`, `.pm/closed/`.
Reuses fuzzy search from `pm rm`.

## Acceptance Criteria

```gherkin
Feature: pm cat command

  Scenario: Print story by exact ID
    Given STORY-001 exists in .pm/sprints/sprint-01/
    When I run `pm cat STORY-001`
    Then the full markdown content of STORY-001 is printed to stdout

  Scenario: Fuzzy match single result
    Given only STORY-001 matches "pm ls"
    When I run `pm cat "pm ls"`
    Then STORY-001 is auto-selected and printed

  Scenario: Fuzzy match multiple results
    Given STORY-001 and STORY-002 both match "pm"
    When I run `pm cat pm`
    Then a numbered list is shown and I can pick by number

  Scenario: No matches
    When I run `pm cat "xyznonexistent"`
    Then I see "no stories matching xyznonexistent"

  Scenario: Open in editor with -o flag
    Given $EDITOR is set to "nano"
    When I run `pm cat STORY-001 -o`
    Then nano is invoked with the path of STORY-001

  Scenario: No arg shows interactive picker
    When I run `pm cat` with no arguments
    Then all stories are listed and I can pick by number
```

## Tasks
- [ ] `pm/src/commands/cat/command.ts` — CommandDef
- [ ] `pm/src/commands/cat/index.ts` — scan all folders, fuzzy pick, print or open
- [ ] Register in registry
- [ ] Tests

## Notes
Scans done/ and closed/ too — useful for reviewing finished work.
