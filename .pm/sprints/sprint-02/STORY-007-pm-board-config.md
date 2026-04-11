---
id: STORY-007
title: pm board config — YAML-configurable board views for pm ls
type: story
status: done
epic: EPIC-002
layer: cli
assignee: itproto
points: 3
blockedBy: []
reason:
---

## User Story
As a developer, I can configure board views for `pm ls`
so that I can see the right columns, fields, and filters for my workflow.

## Spec

```text
pm ls --board <name>
  → read .pm/boards/<name>.yaml
  → parse config
  → load items from configured source
  → apply filters
  → group by configured columns
  → render only configured fields
```

- `pm ls` with no `--board` flag loads `.pm/boards/default.yaml`
- No silent fallback to the current hardcoded layout
- Board config supports `source`, `columns`, `fields`, and optional `filters`

## Acceptance Criteria

```gherkin
Feature: configurable pm ls board views

  Scenario: Load default board with pm ls
    Given .pm/boards/default.yaml exists
    When I run `pm ls`
    Then the board is rendered using the config in default.yaml

  Scenario: Load a named board
    Given .pm/boards/focus.yaml exists
    When I run `pm ls --board focus`
    Then the board is rendered using the config in focus.yaml

  Scenario: Filter items through board config
    Given a board config with assignee, status, or type filters
    When I run `pm ls --board focus`
    Then only matching items are shown

  Scenario: Show only configured fields
    Given a board config with a custom fields list
    When I run `pm ls --board focus`
    Then each row shows only those configured fields

  Scenario: Missing default board returns an error
    Given .pm/boards/default.yaml does not exist
    When I run `pm ls`
    Then I see an error telling me to create .pm/boards/default.yaml
```

## Tasks
- [ ] `pm/src/commands/ls/board-config.ts` — parse and validate board YAML
- [ ] `pm/src/commands/ls/command.ts` — add `--board <name>` option
- [ ] `pm/src/commands/ls/index.ts` — load board config, filter items, and render configured columns
- [ ] Tests

## Notes
- Backfilled into Sprint 2 from the approved design spec commit `ccfe1b0`
- Kept active per current planning decision
