---
id: STORY-003
title: User registration
type: story
status: backlog
epic: EPIC-002
layer: fullstack
assignee: bob
points: 5
---

## User Story
As a new visitor, I can create an account with email and password so that I can have my own private todo list.

## Spec
Registration form: email + password + confirm password. POST /api/auth/register. On success, redirect to todos page logged in. Passwords hashed server-side (bcrypt). No email verification for now.

## Acceptance Criteria

```gherkin
Feature: User registration

  Scenario: Successful registration
    Given I am on the registration page
    When I enter a valid email and matching passwords
    And I click "Register"
    Then I should be redirected to the todos page
    And I should be logged in

  Scenario: Passwords do not match
    Given I am on the registration page
    When I enter passwords that do not match
    And I click "Register"
    Then I should see "Passwords do not match"
    And I should remain on the registration page

  Scenario: Email already in use
    Given a user already exists with email "alice@example.com"
    When I try to register with "alice@example.com"
    Then I should see "Email already in use"
```

## Tasks
- [ ] [FE] Create registration page with form
- [ ] [FE] Validate passwords match client-side
- [ ] [FE] POST /api/auth/register and handle response
- [ ] [BE] POST /api/auth/register endpoint
- [ ] [BE] Hash password with bcrypt
- [ ] [BE] Return 409 if email already registered

## Notes
Sprint 02 — not in current sprint.
