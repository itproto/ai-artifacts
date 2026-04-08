---
id: STORY-007
title: pm rm — close story with fuzzy search
type: story
status: done
epic: EPIC-003
layer: backend
assignee: "@itproto"
points: 3
blockedBy: []
reason:
---

## User Story
As a developer, I can run `pm rm <id|search> [reason]`
so that I can close a story without leaving the terminal or knowing the exact ID.

## Spec

### Syntax
```
pm rm STORY-006              # exact ID → skip search, confirm + close
pm rm "auth flow"            # fuzzy match → auto-pick if 1, else numbered list
pm rm STORY-006 cancelled    # exact ID + reason → zero interaction
pm rm auth cancelled         # fuzzy + reason → pick from list, then close
pm rm                        # no arg → list all open stories, pick by number
```

### Selection logic
1. If arg matches `STORY-NNN` / `TASK-NNN` exactly → use directly
2. If arg is a string → fuse.js scores all open stories against title+id, threshold 0.4
   - 1 match → auto-select (print which one was matched)
   - Multiple → print numbered list, readline prompt "pick 1-N:"
   - 0 matches → error "no stories matching …"
3. No arg → show all open stories as numbered list

### Reason
- If passed as second arg → use it
- If not passed → readline prompt "reason (blank to skip):"

### Close action
- Set `status: closed` and `reason: <value>` in frontmatter
- Move file to `.pm/closed/`
- Print: `closed  .pm/closed/STORY-006-title.md`

### Scope
Scans: `.pm/backlog/`, `.pm/sprints/*/` — excludes `.pm/done/` and `.pm/closed/`

## Acceptance Criteria

```gherkin
Feature: pm rm command

  Scenario: Close by exact ID
    Given STORY-006 exists in .pm/backlog/
    When I run `pm rm STORY-006 cancelled`
    Then the file is moved to .pm/closed/
    And frontmatter has status "closed" and reason "cancelled"

  Scenario: Fuzzy match single result
    Given only STORY-006 matches "auth flow"
    When I run `pm rm "auth flow"`
    Then STORY-006 is auto-selected
    And I am prompted for a reason

  Scenario: Fuzzy match multiple results
    Given STORY-006 and STORY-003 both match "auth"
    When I run `pm rm auth`
    Then a numbered list of matches is printed
    And I can pick by number

  Scenario: No matches
    Given no stories match "xyz123"
    When I run `pm rm xyz123`
    Then I see "no stories matching xyz123"

  Scenario: No arg shows all open stories
    When I run `pm rm` with no arguments
    Then all open stories are listed with numbers to pick from
```

## Tasks
- [ ] Install fuse.js dependency
- [ ] `pm/src/services/search.ts` — fuzzy search over BoardItems using fuse.js
- [ ] `pm/src/services/close.ts` — find file, update frontmatter, move to closed/
- [ ] `pm/src/commands/rm/command.ts` — CommandDef
- [ ] `pm/src/commands/rm/index.ts` — orchestrate search → pick → close
- [ ] Unit tests for search service
- [ ] Unit tests for close service

## Notes
