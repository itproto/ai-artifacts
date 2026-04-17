# Workflow Insights Adoption — Design

**Date:** 2026-04-16  
**Source:** Claude Code /insights report (2026-03-22 to 2026-04-15)

## Overview

Three targeted improvements to reduce recurring session friction identified in the insights report.

---

## 1. AGENTS.md Scope Note

**What:** Add a `## Project Scope` section near the top of `AGENTS.md` (before "Developer commands").

**Content:**
```md
## Project Scope

This is a **CLI-only project**. All work targets the `pm/` package and `.pm/` board directory.
Do not assume or add frontend, backend web, or API server work unless explicitly asked.
```

**Why:** Claude assumed frontend/backend scope in multiple sessions, causing wasted turns and misdirected work. A permanent note in AGENTS.md eliminates this at the source.

---

## 2. `/status` Skill

**Location:** `.claude/skills/pm-status/SKILL.md`  
**Invoked with:** `/pm-status`

**Behavior:**
1. Run `pm ls` — shows current sprint board with story statuses
2. Run `git log --oneline -5` — shows recent commits
3. Run `git status --short` — shows uncommitted changes
4. Output a one-paragraph summary: sprint name, in-progress stories, done stories, what's next

**Why:** Status checks appeared in 7 of 20 sessions. A single command replaces repeated context re-establishment at session start.

---

## 3. `/ship` Skill

**Location:** `.claude/skills/pm-ship/SKILL.md`  
**Invoked with:** `/pm-ship`

**Behavior (in order):**
1. Run `bun test` — abort with clear message if any failures
2. Generate a conventional commit message from staged/modified files and story context
3. Commit and `git push` (sets upstream if new branch)
4. Run `gh pr create` with title and body summarizing changes mapped to acceptance criteria
5. Output the PR URL

**Why:** Multi-turn git/PR workflows appeared across 7 sessions. One command replaces the back-and-forth of "commit... now push... now PR."

---

## Out of Scope

- Post-edit test hook — skipped per user preference
- End-to-end story handoff skill — deferred, not yet needed
