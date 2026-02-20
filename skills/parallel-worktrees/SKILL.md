---
name: parallel-worktrees
description: Set up parallel coding sessions using git worktrees for zero dead time. Use when blocked on tests, builds, or wanting to explore multiple approaches simultaneously.
---

# Parallel Worktrees

Zero dead time. While one session runs tests, work on something else.

## Trigger

Use when waiting on tests, long builds, exploring approaches, or needing to review and develop simultaneously.

## Native Worktree Mode (Claude Code 2.1.49+)

Claude Code has built-in worktree support:

```bash
claude --worktree    # or claude -w
```

This creates an isolated git worktree automatically and runs Claude inside it.

### Subagent Worktree Isolation

Subagents can run in isolated worktrees to prevent file conflicts:

```yaml
# In agent frontmatter
isolation: worktree
```

## Workflow

1. Show current worktrees.
2. For quick parallel work, use `claude -w` (native worktree).
3. For manual control, create a worktree with `git worktree add`.
4. Guide the user to open a new session in the worktree.
5. When done, clean up the worktree.

## Commands

```bash
git worktree list

claude -w                                      # Auto-create isolated worktree
git worktree add ../project-feat feature-branch # Manual worktree
git worktree add ../project-fix bugfix-branch
git worktree add ../project-exp -b experiment

git worktree remove ../project-feat
git worktree prune
```

## Usage Pattern

```
Terminal 1: ~/project          → Main work
Terminal 2: ~/project-feat     → claude -w (auto-isolated)
Terminal 3: ~/project-fix      → Feature development
```

Each worktree runs its own AI session independently.

## Background Agent Management

- `Ctrl+F` — Kill all background agents (two-press confirmation)
- `Ctrl+B` — Send task to background
- ESC cancels the main thread only; background agents keep running

## When to Parallelize

| Scenario | Recommended Approach |
|----------|---------------------|
| Quick parallel task | `claude -w` (native worktree) |
| Tests running (2+ min) | Start new feature in worktree |
| Long build | Debug issue in parallel |
| Exploring approaches | Compare 2-3 simultaneously |
| Review + new work | Reviewer in one, dev in other |
| Waiting on CI | Start next task in worktree |
| Safe exploration | Subagent with `isolation: worktree` |

## Guardrails

- Each worktree is a full working copy — changes are isolated.
- Don't forget to clean up worktrees when done (`git worktree prune`).
- Avoid editing the same files in multiple worktrees simultaneously.
- Native `claude -w` handles cleanup automatically.

## Output

- Current worktree list
- Created worktree path and branch
- Instructions for opening a new session
