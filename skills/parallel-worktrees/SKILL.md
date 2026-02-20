---
name: parallel-worktrees
description: Set up parallel coding sessions using git worktrees for zero dead time. Use when blocked on tests, builds, or wanting to explore multiple approaches simultaneously.
---

# Parallel Worktrees

Zero dead time. While one session runs tests, work on something else.

## Trigger

Use when waiting on tests, long builds, exploring approaches, or needing to review and develop simultaneously.

## Quick Start

**Claude Code:**
```bash
claude --worktree    # or claude -w (auto-creates isolated worktree)
```

**Cursor / Any editor:**
```bash
git worktree add ../project-feat feature-branch
# Open the new worktree folder in a second editor window
```

Both approaches create an isolated working copy where changes don't interfere with your main session.

## Claude Code Extras

These features are Claude Code-specific (skip if using Cursor):

- `claude -w` auto-creates and cleans up worktrees
- Subagents support `isolation: worktree` in agent frontmatter
- `Ctrl+F` kills all background agents (two-press confirmation)
- `Ctrl+B` sends a task to background

## Workflow

1. Show current worktrees: `git worktree list`
2. Create a worktree for the parallel task.
3. Open a new editor/terminal session in the worktree.
4. When done, clean up the worktree.

## Commands

```bash
git worktree list

git worktree add ../project-feat feature-branch
git worktree add ../project-fix bugfix-branch
git worktree add ../project-exp -b experiment

git worktree remove ../project-feat
git worktree prune
```

## Usage Pattern

```
Terminal 1: ~/project          → Main work
Terminal 2: ~/project-feat     → Feature development
Terminal 3: ~/project-fix      → Bug fixes
```

Each worktree runs its own AI session independently.

## When to Parallelize

| Scenario | Action |
|----------|--------|
| Tests running (2+ min) | Start new feature in worktree |
| Long build | Debug issue in parallel |
| Exploring approaches | Compare 2-3 simultaneously |
| Review + new work | Reviewer in one, dev in other |
| Waiting on CI | Start next task in worktree |

## Guardrails

- Each worktree is a full working copy — changes are isolated.
- Don't forget to clean up worktrees when done (`git worktree prune`).
- Avoid editing the same files in multiple worktrees simultaneously.

## Output

- Current worktree list
- Created worktree path and branch
- Instructions for opening a new session
