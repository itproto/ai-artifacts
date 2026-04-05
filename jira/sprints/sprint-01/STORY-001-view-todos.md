---
id: STORY-001
title: View todos list (static data)
type: story
status: in-progress
epic: EPIC-001
layer: frontend
assignee: alice
points: 2
---

## User Story
As a user, I can see a list of todos on the main page
so that I know what I need to do.

## Spec
Renders from static mock data in `src/mocks/todos.ts`.
No API calls in this story — backend integration is STORY-002.

## Acceptance Criteria

```gherkin
Feature: View todos list

  Scenario: User sees todos on the main page
    Given I open the app
    Then I should see a list of todo items
    And each item shows its title and a completion checkbox

  Scenario: Empty state
    Given there are no todos in the mock data
    Then I should see the message "No todos yet"
```

## Tasks
- [ ] [FE] Create `src/mocks/todos.ts` with 3 example todos
- [ ] [FE] Create `TodoList` component
- [ ] [FE] Create `TodoItem` component
- [ ] [FE] Render list on main page
- [ ] [FE] Style with Tailwind

## Notes
Static data shape: `{ id: string; title: string; completed: boolean }[]`
