---
id: STORY-001
title: Example — view item list
type: story
status: backlog
epic: EPIC-001
layer: frontend
assignee: 
points: 3
blockedBy: []
reason: 
---

## User Story
As a user, I can view a list of items
so that I can see what needs to be done.

## Spec

Display all items from the API in a scrollable list. Show empty state when there are no items.

## Acceptance Criteria

```gherkin
Feature: Item list

  Scenario: View items when list is non-empty
    Given there are items in the system
    When I open the app
    Then I see a list of items

  Scenario: Empty state
    Given there are no items
    When I open the app
    Then I see an empty state message
```

## Tasks
- [ ] Create ItemList component
- [ ] Connect to /api/items endpoint
- [ ] Add empty state UI

## Notes
Delete this file or replace it with your first real story.
