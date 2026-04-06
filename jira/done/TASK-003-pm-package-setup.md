---
id: TASK-003
title: Scaffold @itproto/pm package
type: task
status: done
layer: backend
assignee: 
blockedBy: []
reason: 
---

## Description

Set up the `pm/` package directory with all config files:
`package.json`, `tsconfig.json`, `biome.json`, `bunfig.toml`.
Install dependencies and verify `bun link` works.

## Tasks
- [ ] Create pm/ directory structure
- [ ] Write package.json with @itproto/pm identity
- [ ] Write tsconfig.json (ESNext + bundler + strict)
- [ ] Write biome.json (tabs, lineWidth 100)
- [ ] Write bunfig.toml
- [ ] Run bun install
- [ ] Run bun link

## Notes
Runtime: Bun ≥ 1.1.0
