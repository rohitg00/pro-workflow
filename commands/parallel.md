# /parallel - Worktree Setup Guide

Set up parallel Claude Code sessions using git worktrees.

## Current State

```bash
git worktree list
```

## Create Worktree

```bash
# For a new feature
git worktree add ../[project]-feat [branch-name]

# For a bugfix
git worktree add ../[project]-fix [branch-name]

# For exploration
git worktree add ../[project]-exp -b experiment
```

## Usage Pattern

```
Terminal 1: ~/project          → Main work
Terminal 2: ~/project-feat     → Feature development
Terminal 3: ~/project-fix      → Bug fixes
```

Each worktree runs its own Claude session independently.

## When to Use

| Scenario | Action |
|----------|--------|
| Tests running | Start feature in worktree |
| Long build | Debug in parallel |
| Exploring approaches | Compare 2-3 simultaneously |
| Review + new work | Reviewer in one, dev in other |

## Cleanup

```bash
# Remove worktree when done
git worktree remove ../[project]-feat

# Clean stale references
git worktree prune
```

---

**Tip:** "Like having a dev team you can clone" - zero dead time.
