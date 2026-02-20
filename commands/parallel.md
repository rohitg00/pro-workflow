# /parallel - Worktree Setup Guide

Set up parallel Claude Code sessions using git worktrees.

## Native Worktree Mode (Claude Code 2.1.49+)

Claude Code now has built-in worktree support:

```bash
claude --worktree
claude -w
```

This creates an isolated git worktree automatically and runs Claude inside it. No manual setup needed.

### Subagent Worktree Isolation

Subagents can also run in isolated worktrees:

```yaml
# In .claude/agents/my-agent.md frontmatter
isolation: worktree
```

This gives each subagent its own working copy, preventing file conflicts.

## Current State

```bash
git worktree list
```

## Manual Worktree Setup

For cases where you want more control:

```bash
git worktree add ../[project]-feat [branch-name]
git worktree add ../[project]-fix [branch-name]
git worktree add ../[project]-exp -b experiment
```

## Usage Pattern

```
Terminal 1: ~/project          → Main work (or `claude`)
Terminal 2: ~/project-feat     → claude --worktree (auto-isolated)
Terminal 3: ~/project-fix      → claude -w (shorthand)
```

Each worktree runs its own Claude session independently.

## When to Use

| Scenario | Recommended Approach |
|----------|---------------------|
| Quick parallel task | `claude -w` (auto worktree) |
| Tests running | Start feature in worktree |
| Long build | Debug in parallel |
| Exploring approaches | Compare 2-3 simultaneously |
| Review + new work | Reviewer in one, dev in other |
| Background exploration | Subagent with `isolation: worktree` |

## Managing Background Agents

- `Ctrl+F` — Kill all background agents (two-press confirmation)
- `Ctrl+B` — Send current task to background
- Background agents continue running when you press ESC

## Cleanup

```bash
git worktree remove ../[project]-feat
git worktree prune
```

---

**Tip:** `claude -w` is the fastest way to parallelize. Like having a dev team you can clone.
