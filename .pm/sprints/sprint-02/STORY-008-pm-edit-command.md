---
id: STORY-008
title: pm edit command for updating work-item frontmatter
type: story
status: done
epic: EPIC-002
layer: backend
assignee: itproto
points: 3
blockedBy: []
reason:
---

## User Story
As a developer, I can edit story and task frontmatter from the CLI
so that I do not need to open files just to update metadata.

## Spec

```text
pm edit <id|query> key:value [key:value ...]
  → resolve the target item using exact ID or fuzzy match
  → validate supported editable fields
  → normalize values like blockedBy and @me
  → update frontmatter only
  → preserve markdown body content unchanged
```

- Supported fields in v1: `title`, `status`, `epic`, `layer`, `assignee`, `points`, `blockedBy`, `reason`
- `blockedBy` input may be comma-separated but is stored in bracketed array form
- `status:closed` requires a non-empty `reason` in the same command

## Acceptance Criteria

```gherkin
Feature: edit work-item frontmatter from the CLI

  Scenario: Update multiple supported fields on an item
    Given a story exists in the board
    When I run `pm edit STORY-001 status:review points:5`
    Then only the frontmatter is updated
    And the markdown body stays unchanged

  Scenario: Normalize blockedBy input
    Given a story exists in the board
    When I run `pm edit STORY-001 blockedBy:TASK-001,TASK-002`
    Then the file stores `blockedBy: [TASK-001, TASK-002]`

  Scenario: Resolve assignee from @me
    Given my current user can be resolved from git
    When I run `pm edit STORY-001 assignee:@me`
    Then the assignee field is updated with my resolved username

  Scenario: Reject unsupported edits
    Given a story exists in the board
    When I run `pm edit STORY-001 owner:alice`
    Then I see an error telling me the field is unknown

  Scenario: Require a reason when closing an item
    Given a story exists in the board
    When I run `pm edit STORY-001 status:closed`
    Then I see an error telling me to provide a reason
```

## Tasks
- [x] Add reusable frontmatter replacement helpers
- [x] Add `pm edit` command wiring and validation
- [x] Cover critical command flows with tests

## Notes
- Backfilled from the approved `pm edit` implementation plan in the session workspace.
