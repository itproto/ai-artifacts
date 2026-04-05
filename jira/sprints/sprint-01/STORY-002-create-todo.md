---
id: STORY-002
title: Create a todo item
type: story
status: backlog
epic: EPIC-001
layer: fullstack
assignee: alice
points: 5
blockedBy: [TASK-002]
---

## User Story
As a user, I can add a new todo so that I can track new things I need to do.

## Spec
Input field + submit button. Calls POST /api/todos. Optimistic UI update — item appears in list before API confirms. On API error, item is removed and error message shown.

## Acceptance Criteria

```gherkin
Feature: Create a todo item

  Scenario: User creates a new todo
    Given I am on the todos page
    When I type "Buy milk" in the input field
    And I click "Add"
    Then "Buy milk" should appear in the todos list

  Scenario: Empty input is blocked
    Given I am on the todos page
    When I click "Add" with an empty input
    Then no todo should be created
    And I should see the error "Please enter a todo"
```

## Tasks
- [ ] [FE] Add text input + "Add" button to the page
- [ ] [FE] On submit, optimistically append to list
- [ ] [FE] Call POST /api/todos; on error remove item and show message
- [ ] [BE] Implement POST /api/todos — validate body, push to in-memory array, return 201
- [ ] [BE] Return 400 if title is missing or empty

## Notes
blockedBy TASK-002 — backend scaffold must exist first.
