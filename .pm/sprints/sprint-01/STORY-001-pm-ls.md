---
id: STORY-001
title: pm ls — show sprint board in terminal
type: story
status: in-progress
epic: EPIC-002
layer: cli
assignee: "@itproto"
points: 2
blockedBy: []
reason: 
---

## User Story
As a developer, I can run `pm ls`
so that I can see the current sprint board without leaving the terminal.

## Spec
Reads the active sprint directory and its story/task markdown files. Groups stories/tasks by status and renders a compact board to stdout. No API calls — pure file reads.

## Acceptance Criteria

```gherkin
Feature: pm ls — sprint board view

  Scenario: Sprint has items in multiple statuses
    Given a sprint with stories in backlog, in-progress, and done
    When I run "pm ls"
    Then I see items grouped by status column
    And each item shows its ID, title, assignee, and points

  Scenario: Empty sprint
    Given no sprint directory exists
    When I run "pm ls"
    Then I see the message "No active sprint"

  Scenario: Column with no items
    Given a sprint with no done items
    When I run "pm ls"
    Then the done column is omitted or shows "(empty)"
```

## Tasks
- [ ] [CLI] Read active sprint from .pm/sprints/ (latest sprint-NN dir)
- [ ] [CLI] Parse story/task files into board items
- [ ] [CLI] Group and render items by status
- [ ] [CLI] Handle empty sprint / no items in a column
- [ ] [CLI] Register `ls` command in registry

## Notes
Output format: plain text, compact. No fancy tables — keep it readable in small terminals.
