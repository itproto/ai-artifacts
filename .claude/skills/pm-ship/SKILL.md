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
