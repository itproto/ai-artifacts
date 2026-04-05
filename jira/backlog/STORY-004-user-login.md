---
id: STORY-004
title: User login / logout
type: story
status: backlog
epic: EPIC-002
layer: fullstack
assignee: bob
points: 3
blockedBy: [STORY-003]
---

## User Story
As a registered user, I can log in and out so that my todos are private to me.

## Spec
Login form: email + password. POST /api/auth/login. Session stored as JWT in httpOnly cookie. Logout clears the cookie. Todos page redirects to login if not authenticated.

## Acceptance Criteria

```gherkin
Feature: User login and logout

  Scenario: Successful login
    Given I am a registered user with email "alice@example.com"
    When I log in with correct credentials
    Then I should be redirected to the todos page
    And I should see my todos

  Scenario: Wrong password
    Given I am a registered user
    When I log in with the wrong password
    Then I should see "Invalid email or password"

  Scenario: Logout
    Given I am logged in
    When I click "Logout"
    Then I should be redirected to the login page
    And I should not be able to access the todos page without logging in again
```

## Tasks
- [ ] [FE] Create login page with form
- [ ] [FE] POST /api/auth/login and handle JWT cookie
- [ ] [FE] Add "Logout" button call DELETE /api/auth/session
- [ ] [FE] Redirect to /login if 401 on todos page
- [ ] [BE] POST /api/auth/login — verify password issue JWT cookie
- [ ] [BE] DELETE /api/auth/session — clear cookie
- [ ] [BE] Auth middleware to protect /api/todos

## Notes
blockedBy STORY-003 — user must exist before login is meaningful. Sprint 02 — not in current sprint.
