---
id: STORY-005
title: pm init scaffolding command
type: story
status: done
epic: EPIC-003
layer: backend
assignee: 
points: 3
blockedBy: [TASK-003]
reason: 
---

## User Story
As a developer, I can run `pm init` in any project directory
so that a `.pm/` project board is scaffolded instantly.

## Spec

`pm init` copies the bundled `template/` directory to `.pm/` in the
current working directory (or `--cwd`). Removes `.gitkeep` markers.
Supports `--dry-run` (preview only) and `--json` (machine-readable output).
Exits with code 1 if `.pm/` already exists.

## Acceptance Criteria

```gherkin
Feature: pm init

  Scenario: Initialize .pm/ in an empty project
    Given I am in a directory without a .pm/ folder
    When I run pm init
    Then a .pm/ directory is created
    And it contains backlog/, done/, closed/, templates/, examples/
    And no .gitkeep files are present

  Scenario: Reject init if .pm/ already exists
    Given I am in a directory with a .pm/ folder
    When I run pm init
    Then the command exits with code 1
    And .pm/ is unchanged

  Scenario: Dry-run previews without writing
    Given I am in a directory without a .pm/ folder
    When I run pm init --dry-run
    Then no .pm/ directory is created
    And the output shows what would be created
```

## Tasks
- [ ] Types, schemas, version
- [ ] output() utility
- [ ] ScaffoldService.init()
- [ ] init command + registry + entrypoint

## Notes
Spec: docs/superpowers/specs/2026-04-06-itproto-pm-cli-design.md
