---
id: STORY-003
title: pm rm — close story with fuzzy search
type: story
status: in-progress
epic: EPIC-002
layer: cli
assignee: "@itproto"
points: 3
blockedBy: []
reason:
---

## User Story
As a developer, I can run `pm rm <id|query> [reason]`
so that I can close a story using fuzzy search without knowing the exact ID.

## Spec
Fuzzy-searches open stories with fuse.js. Auto-picks if single match, numbered list if multiple. Prompts for reason if not passed. Moves file to `.pm/closed/` with `status: closed`.

## Acceptance Criteria

```gherkin
Feature: pm rm command

  Scenario: Close by exact ID
    When I run `pm rm STORY-001 cancelled`
    Then the file moves to .pm/closed/ with status closed and reason cancelled

  Scenario: Fuzzy single match
    When I run `pm rm "auth"`
    Then the matching story is auto-selected

  Scenario: Fuzzy multiple matches
    When I run `pm rm "story"`
    Then a numbered list is shown and I pick by number
```

## Tasks
- [x] `pm/src/services/search.ts` — fuse.js fuzzy search
- [x] `pm/src/services/close.ts` — frontmatter update + file move
- [x] `pm/src/commands/rm/command.ts` + `index.ts`
- [x] Unit tests for search service
- [ ] PR review + merge

## Notes
