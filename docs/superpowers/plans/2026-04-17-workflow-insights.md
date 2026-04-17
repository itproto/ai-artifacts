# Workflow Insights Adoption — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt 3 workflow improvements from the Claude Code insights report — a scope note in AGENTS.md, a `/pm-status` skill, and a `/pm-ship` skill.

**Architecture:** Two new project-local skills in `.claude/skills/` (markdown files read by Claude Code on invocation), plus a one-line scope guard added to `AGENTS.md`.

**Tech Stack:** Markdown, Bash (`bun`, `git`, `gh`)

---

### Task 1: Add Project Scope note to AGENTS.md

**Files:**
- Modify: `AGENTS.md` (insert after `# AGENTS.md` heading, before `## Project and toolchain`)

- [ ] **Step 1: Insert the scope section**

Open `AGENTS.md`. After the `# AGENTS.md` heading and before the `## Project and toolchain` section, insert:

```markdown
## Project Scope

This is a **CLI-only project**. All work targets the `pm/` package and `.pm/` board directory.
Do not assume or add frontend, backend web, or API server work unless explicitly asked.
```

- [ ] **Step 2: Verify the file looks right**

Run:
```bash
head -15 AGENTS.md
```

Expected output starts with:
```
# AGENTS.md

## Project Scope

This is a **CLI-only project**. All work targets the `pm/` package and `.pm/` board directory.
Do not assume or add frontend, backend web, or API server work unless explicitly asked.

## Project and toolchain
```

- [ ] **Step 3: Commit**

```bash
git add AGENTS.md
git commit -m "docs: add project scope note to AGENTS.md"
```

---

### Task 2: Create `/pm-status` skill

**Files:**
- Create: `.claude/skills/pm-status/SKILL.md`

- [ ] **Step 1: Create the skill directory and file**

Create `.claude/skills/pm-status/SKILL.md` with this exact content:

```markdown
# /pm-status — Sprint Status

You have been invoked via the /pm-status skill. Run the following steps in order and present a concise summary.

## Steps

1. Run `bun run pm/src/entrypoints/pm.ts ls` and capture the output — this shows the current sprint board.
2. Run `git log --oneline -5` — recent commits.
3. Run `git status --short` — uncommitted changes.

## Output Format

Present a short summary with these sections:

**Sprint:** [sprint name from pm ls output]

**Board:**
[paste pm ls output as-is]

**Recent commits:**
[git log output]

**Uncommitted changes:** [either "none" or list from git status]

**Next up:** [pick the top backlog or ready story and name it]

Keep the whole output under 30 lines.
```

- [ ] **Step 2: Verify the file exists**

Run:
```bash
cat .claude/skills/pm-status/SKILL.md
```

Expected: the full skill content above is printed.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/pm-status/SKILL.md
git commit -m "feat: add /pm-status skill for sprint status checks"
```

---

### Task 3: Create `/pm-ship` skill

**Files:**
- Create: `.claude/skills/pm-ship/SKILL.md`

- [ ] **Step 1: Create the skill directory and file**

Create `.claude/skills/pm-ship/SKILL.md` with this exact content:

```markdown
# /pm-ship — Ship a Story

You have been invoked via the /pm-ship skill. Follow these steps in order to test, commit, push, and open a PR for the current story.

## Pre-flight

1. Identify the current story: check which `.pm/sprints/sprint-*/STORY-*.md` file has `status: in-progress`. If none, ask the user which story they're shipping.
2. Read the story file to get the title and acceptance criteria.

## Steps

### 1. Run tests

```bash
cd pm && bun test 2>&1
```

If any tests fail: stop, report the failures clearly, and do NOT proceed. Ask the user to fix the failures first.

### 2. Stage and commit

Stage all modified tracked files:
```bash
git add -u
```

Write a conventional commit message using this format:
- `feat(<scope>): <what it does>` for new features
- `fix(<scope>): <what it fixes>` for bug fixes
- `<scope>` = the story ID in lowercase, e.g. `story-009`

Example:
```bash
git commit -m "feat(story-009): add git-based sync for .pm artifacts"
```

### 3. Push

```bash
git push -u origin HEAD
```

### 4. Open a PR

```bash
gh pr create \
  --title "<story title from frontmatter>" \
  --body "$(cat <<'EOF'
## Summary

- <bullet per acceptance criterion — map each criterion to what was implemented>

## Story

<story ID and title>

## Test plan

- [ ] `cd pm && bun test` passes
- [ ] Manual smoke test: <one command that exercises the feature>

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

### 5. Output

Print the PR URL and the story ID. Done.
```

- [ ] **Step 2: Verify the file exists**

Run:
```bash
cat .claude/skills/pm-ship/SKILL.md
```

Expected: the full skill content above is printed.

- [ ] **Step 3: Commit**

```bash
git add .claude/skills/pm-ship/SKILL.md
git commit -m "feat: add /pm-ship skill for test-commit-push-PR workflow"
```

---

## Self-Review

**Spec coverage:**
- [x] AGENTS.md scope note → Task 1
- [x] `/pm-status` skill → Task 2
- [x] `/pm-ship` skill → Task 3
- [x] Post-edit hook — explicitly out of scope per spec
- [x] End-to-end story handoff — explicitly deferred per spec

**Placeholder scan:** No TBDs, all steps have exact commands and expected output.

**Type consistency:** No shared types across tasks — each task is self-contained markdown.
